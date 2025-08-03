// SDK
import { useState } from "react";
import * as Sdk from "@1inch/cross-chain-sdk";
import { Address } from "@1inch/fusion-sdk";
import { JsonRpcProvider, parseEther, parseUnits, randomBytes } from "ethers";
import { uint8ArrayToHex, UINT_40_MAX } from "@1inch/byte-utils";
import {
  useAccount,
  useWalletClient,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { createLocalOrder } from "@/lib/utils/orderHelper";
import {
  useSignPersonalMessage,
  useSuiClient,
  useCurrentAccount,
} from "@mysten/dapp-kit";

// Configs
import { config } from "@/lib/config/chainConfig";
//import type { ChainConfig } from '@/lib/config/chainConfig'

// SUI
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  serializeCrossChainOrder,
  deserializeCrossChainOrder,
  orderToJson,
  orderFromJson,
  createOrderWithSerialization,
} from "@/lib/utils/orderSerializer";

// Import Sui user hook
import useSUIUser from "./SUIUser";

// Hook for user's swap Order
/**
 * @notice Hook to manage active swap order
 * @dev A user can interact only with one active order at the time
 * @dev If order is activr pendingSwap == true, user can't create new order
 */
export function useSwapOrder() {
  //const [swapSuiToEth, setSwapSuiToEth] = useState(false);
  const [pendingSwap, setPendingSwap] = useState(false);
  const { mutateAsync: signSuiMessage } = useSignPersonalMessage();

  // Get Sui user context
  // const { signMessage: signSuiMessage, user: suiUser } = useSUIUser()

  // Configuration
  interface EvmChain {
    provider: JsonRpcProvider;
    escrowFactory: string;
    resolver: string;
  }

  interface SuiChain {
    client: SuiClient;
    escrowFactory: string;
    keypair: Ed25519Keypair;
  }

  interface SwapOrder {
    fromTokenKey: string;
    fromNetwork: string;
    toTokenKey: string;
    toNetwork: string;
    signature: string[];
    orderHash: string[];
    secrets: string[];
  }

  interface PreOrder {
    escrowFactory: string;
    maker: string;
    makingAmount: bigint;
    takingAmount: bigint;
    makerAsset: string;
    takerAsset: string;
    secret: string;
    srcChainId: number;
    dstChainId: number;
    srcTimestamp: bigint;
    resolver: string;
    allowMultipleFills: boolean;
    secrets?: string[];
  }

  const { address: userAddress, chainId, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const suiAccount = useCurrentAccount();

  /*//////////////////////////////////////////////////////////////
                           MAIN STEPS
    //////////////////////////////////////////////////////////////*/

  const startSwapOrder = async (
    swapSuiToEth: boolean,
    tokenAddress: string,
    usiTokenAddress: string,
    fromAmount: bigint,
    toAmount: bigint,
  ) => {
    console.log("[swapOrder] // swapSuiToEth", swapSuiToEth);
    setPendingSwap(true);
    if (!swapSuiToEth) {
      console.log(
        "[swapOrder] // STEP 0: Initializing swapOrder by user on Ethereum",
      );

      // Create an ethers BrowserProvider from the wallet client
      if (!walletClient) throw new Error("Wallet client not available");
      const jsonRpcProvider = new JsonRpcProvider(config.chain.evm.rpcUrl);

      //const src: EvmChain = await initChain(config.chain.evm, jsonRpcProvider)
      const escrowFactory = process.env.NEXT_PUBLIC_EVM_ESCROW_FACTORY_ADDRESS;
      const resolver = process.env.NEXT_PUBLIC_EVM_RESOLVER_ADDRESS;

      console.log(
        "[swapOrder] Escrow factory address (Factory Object Id)",
        escrowFactory,
      );
      console.log("[swapOrder] Resolver address(Factory Package Id)", resolver);

      // STEP 0: Initializing swapOrder by user on Ethereum

      // Get initial balance of user's token
      // const initialBalance = await getBalanceEVMForToken(tokenAddress as `0x${string}`)//await chainUser.tokenBalance(tokenAddress as `0x${string}`)

      //console.log('[swapOrder] User initialBalance for EVM token ', tokenAddress, initialBalance)
      console.log(
        "[swapOrder] // STEP 1: User creates cross-chain order with multiple fill capability ON EVM",
      );

      // STEP 1: User creates cross-chain order with multiple fill capability

      // Generate 11 secrets for multiple fills (in production, use crypto-secure random)
      const secrets = Array.from({ length: 11 }).map(() =>
        uint8ArrayToHex(randomBytes(32)),
      );
      const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s));
      const leaves = Sdk.HashLock.getMerkleLeaves(secrets);

      const preOrder: PreOrder = {
        escrowFactory: escrowFactory as `0x${string}`,
        maker: userAddress as `0x${string}`,
        makingAmount: fromAmount,
        takingAmount: toAmount,
        makerAsset: tokenAddress,
        takerAsset:
          usiTokenAddress || "0x0000000000000000000000000000000000000001", // Placeholder for Sui USDC
        secret: secrets[0]!, // Use the first secret for multiple fills
        srcChainId: 1,
        dstChainId: 10,
        srcTimestamp: BigInt(Math.floor(Date.now() / 1000)), //BigInt((await jsonRpcProvider.getBlock('latest'))!.timestamp),
        resolver: resolver as `0x${string}`,
        allowMultipleFills: true,
        secrets: secrets,
      };
      // Create order with multiple fills enabled
      const order = createLocalOrder(
        preOrder.escrowFactory,
        preOrder.maker,
        preOrder.makingAmount,
        preOrder.takingAmount,
        preOrder.makerAsset,
        preOrder.takerAsset,
        preOrder.secret,
        preOrder.srcChainId,
        preOrder.dstChainId,
        preOrder.srcTimestamp,
        preOrder.resolver,
        preOrder.allowMultipleFills,
        preOrder.secrets,
      );
      // STEP 2: User signs the order
      const signature = await signOrder(chainId as number, order);

      const orderHash = order.getOrderHash(chainId as number);

      console.log("[swapOrder] Order", order);

      // Create order with serialization data
      const { order: serializedOrder, serializationData } =
        createOrderWithSerialization(
          preOrder.escrowFactory,
          preOrder.maker,
          preOrder.makingAmount,
          preOrder.takingAmount,
          preOrder.makerAsset,
          preOrder.takerAsset,
          preOrder.secret,
          preOrder.srcChainId,
          preOrder.dstChainId,
          preOrder.srcTimestamp,
          preOrder.resolver,
          preOrder.allowMultipleFills,
          preOrder.secrets,
        );
      // Serialize to JSON
      const jsonOrder = orderToJson(
        serializedOrder,
        serializationData.originalSecret,
        serializationData.originalSecrets,
        preOrder.escrowFactory,
        preOrder.srcChainId,
        preOrder.dstChainId,
      );

      console.log("[swapOrder] Serialized order", jsonOrder);
      console.log(`[swapOrder]`, `${chainId} Order signed by user`, orderHash);

      return {
        data: {
          fromTokenKey: tokenAddress,
          fromNetwork: "sui",
          toTokenKey:
            usiTokenAddress || "0x000000000000000000000000000000000000000",
          toNetwork: "ethereum",
          signature: [signature],
          orderHash: [orderHash],
          secrets: secrets,
          jsonOrder: jsonOrder,
        },
      };
    } else {
      // Initializing swapOrder by user on SUI
      console.log(
        "[swapOrder] // STEP 0: Initializing swapOrder by user on SUI",
      );

      // Create an ethers BrowserProvider from the wallet client

      //const src: EvmChain = await initChain(config.chain.evm, jsonRpcProvider)

      const escrowFactory = process.env.NEXT_PUBLIC_SUI_ESCROW_FACTORY_ADDRESS;
      const resolver = process.env.NEXT_PUBLIC_SUI_RESOLVER_ADDRESS;

      console.log("[swapOrder] Escrow factory address", escrowFactory);
      console.log("[swapOrder] Resolver address", resolver);

      // STEP 0: Initializing swapOrder by user on Ethereum

      // Get initial balance of user's token
      // const initialBalance = await getBalanceEVMForToken(tokenAddress as `0x${string}`)//await chainUser.tokenBalance(tokenAddress as `0x${string}`)

      //console.log('[swapOrder] User initialBalance for EVM token ', tokenAddress, initialBalance)
      console.log(
        "[swapOrder] // STEP 1: User creates cross-chain order with multiple fill capability",
      );

      // STEP 1: User creates cross-chain order with multiple fill capability

      // Generate 11 secrets for multiple fills (in production, use crypto-secure random)
      const secrets = Array.from({ length: 11 }).map(() =>
        uint8ArrayToHex(randomBytes(32)),
      );
      const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s));
      const leaves = Sdk.HashLock.getMerkleLeaves(secrets);

      const preOrder: PreOrder = {
        escrowFactory: escrowFactory?.slice(0, 42) as `0x${string}`, //"0x0000000000000000000000000000000000000000", //escrowFactory as `0x${string}`,
        maker: suiAccount?.address?.slice(0, 42) as `0x${string}`, //"0x0000000000000000000000000000000000000000", //suiAccount?.address as `0x${ string }`,
        makingAmount: fromAmount,
        takingAmount: toAmount,
        makerAsset: tokenAddress.slice(0, 42) as `0x${string}`, //'0x0000000000000000000000000000000000000000',/// tokenAddress,
        takerAsset: usiTokenAddress.slice(0, 42) as `0x${string}`, //'0x0000000000000000000000000000000000000000', // Placeholder for Sui USDC
        secret: secrets[0]!, // Use the first secret for multiple fills
        srcChainId: 1,
        dstChainId: 10,
        srcTimestamp: BigInt(Math.floor(Date.now() / 1000)),
        resolver: resolver?.slice(0, 42) as `0x${string}`, //"0x0000000000000000000000000000000000000000", //resolver as `0x${ string } `,
        allowMultipleFills: true,
        secrets: secrets,
      };

      console.log("[swapOrder] PreOrder", preOrder);
      // Create order with multiple fills enabled
      const order = createLocalOrder(
        preOrder.escrowFactory,
        preOrder.maker,
        preOrder.makingAmount,
        preOrder.takingAmount,
        preOrder.makerAsset,
        preOrder.takerAsset,
        preOrder.secret,
        preOrder.srcChainId,
        preOrder.dstChainId,
        preOrder.srcTimestamp,
        preOrder.resolver,
        preOrder.allowMultipleFills,
        preOrder.secrets,
      );
      // STEP 2: User signs the order
      const signature = await signOrderSui(order);
      const orderHash = order.getOrderHash(10);

      console.log("[swapOrder] Order", order);

      // Create order with serialization data
      const { order: serializedOrder, serializationData } =
        createOrderWithSerialization(
          preOrder.escrowFactory,
          preOrder.maker,
          preOrder.makingAmount,
          preOrder.takingAmount,
          preOrder.makerAsset,
          preOrder.takerAsset,
          preOrder.secret,
          preOrder.srcChainId,
          preOrder.dstChainId,
          preOrder.srcTimestamp,
          preOrder.resolver,
          preOrder.allowMultipleFills,
          preOrder.secrets,
        );
      // Serialize to JSON
      const jsonOrder = orderToJson(
        serializedOrder,
        serializationData.originalSecret,
        serializationData.originalSecrets,
        preOrder.escrowFactory,
        preOrder.srcChainId,
        preOrder.dstChainId,
      );

      console.log("[swapOrder] Serialized order", jsonOrder);
      console.log(`[swapOrder]`, `${chainId} Order signed by user`, orderHash);

      return {
        data: {
          fromTokenKey: tokenAddress,
          fromNetwork: "sui",
          toTokenKey:
            usiTokenAddress || "0x0000000000000000000000000000000000000001",
          toNetwork: "ethereum",
          signature: [signature],
          orderHash: [orderHash],
          secrets: secrets,
          jsonOrder: jsonOrder,
        },
      };
    }
  };

  /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  // TODO: Implement helper functions getting balance for EVM
  async function getBalanceEVMForToken(tokenAddress: string): Promise<bigint> {
    if (!publicClient) throw new Error("Public client not available");

    // Handle ETH (native token) - use getBalance instead of contract call
    if (
      tokenAddress === "ETH" ||
      tokenAddress === "0x0000000000000000000000000000000000000000"
    ) {
      return await publicClient.getBalance({
        address: userAddress as `0x${string} `,
      });
    }

    // For ERC20 tokens, use balanceOf contract call
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string} `,
      abi: [
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "balance", type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [userAddress as `0x${string} `],
    });
    return balance ?? 0n;
  }

  async function signOrder(
    srcChainId: number,
    order: Sdk.CrossChainOrder,
  ): Promise<string> {
    if (!walletClient) throw new Error("Wallet client not available");

    const typedData = order.getTypedData(srcChainId);

    return walletClient.signTypedData({
      domain: typedData.domain,
      types: { Order: typedData.types[typedData.primaryType]! },
      primaryType: "Order",
      message: typedData.message,
    });
  }

  async function signOrderSui(order: Sdk.CrossChainOrder): Promise<string> {
    // Get the order data and hash
    const orderData = order.build();
    const orderHash = order.getOrderHash(10); // Assuming chainId 10 for Sui

    // Create a deterministic message for signing
    // We'll use the order hash as the primary identifier and add essential order data
    const messageToSign = {
      orderHash: orderHash,
      maker: orderData.maker,
      makingAmount: orderData.makingAmount.toString(),
      takingAmount: orderData.takingAmount.toString(),
      makerAsset: orderData.makerAsset,
      takerAsset: orderData.takerAsset,
      salt: orderData.salt,
      receiver: orderData.receiver,
      multipleFillsAllowed: order.multipleFillsAllowed.toString(),
      srcChainId: 10, // Sui chain ID
      dstChainId: 1, // Ethereum chain ID
    };

    // Create a deterministic string representation for signing
    const messageString = JSON.stringify(
      messageToSign,
      Object.keys(messageToSign).sort(),
    );
    const messageBytes = new TextEncoder().encode(messageString);

    // Sign the message using Sui wallet
    const signatureResult = await signSuiMessage({ message: messageBytes });

    return signatureResult.signature;
  }

  // TODO: Implement helper functions getting balance for SUI

  return { startSwapOrder };
}

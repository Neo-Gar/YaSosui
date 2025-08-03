import {
  JsonRpcProvider,
  randomBytes,
  Wallet,
  Interface,
  keccak256,
  Contract,
  getBytes,
  hexlify,
} from "ethers";
import { Resolver } from "../other/resolver";
import * as Sdk from "@1inch/cross-chain-sdk";
import { Address } from "@1inch/fusion-sdk";
import { uint8ArrayToHex } from "@1inch/byte-utils";
import useETHUser from "./ETHUser";

// Import the contract ABIs for parsing events
import ResolverContract from "../../../../../packages/solidity/dist/contracts/Resolver.sol/Resolver.json";
import BaseEscrowFactoryContract from "../../../../../packages/solidity/dist/contracts/BaseEscrowFactory.sol/BaseEscrowFactory.json";
import CustomEscrowFactoryContract from "../../../../../packages/solidity/dist/contracts/CustomEscrowFactory.sol/CustomEscrowFactory.json";
import CustomEscrowSrcContract from "../../../../../packages/solidity/dist/contracts/CustomEscrowSrc.sol/CustomEscrowSrc.json";

const escrowFactoryAddress = "0xDE6318b24e0581F78f40Fcfe7caE1A1983d6aacC";

export const useETHEscrow = () => {
  const { sendTransaction, connect, user } = useETHUser();

  const deploySrcEscrow = async (
    order: Sdk.CrossChainOrder,
    signature: string,
    secret: string,
  ) => {
    // Create contract interface
    const contractInterface = new Interface(CustomEscrowFactoryContract.abi);

    // Hash the order to get orderHash - need to provide chainId for getOrderHash
    const chainId = 1; // Ethereum mainnet
    const orderHash = order.getOrderHash(chainId);

    // Extract maker from the order
    const maker = order.maker.toString();

    console.log("Maker", maker);

    // Extract maker asset and making amount
    const makerAsset = order.makerAsset.toString();
    const makingAmount = order.makingAmount.toString();

    // Extract safety deposit - you may need to adjust based on your order structure
    const safetyDeposit = order.escrowExtension.srcSafetyDeposit; // You'll need to determine the correct safety deposit amount

    // Contract stores this hash and compares it with _keccakBytes32(secret) during withdrawal
    // _keccakBytes32 hashes bytes32, so we need to hash the secret as bytes32, not as string
    const secretBytes = getBytes(secret); // Convert hex string to bytes
    const secretHashlock = keccak256(secretBytes); // Hash the bytes, not the string
    console.log("🔑 [DEPLOY] Secret:", secret);
    console.log("🔑 [DEPLOY] Secret as bytes:", secretBytes);
    console.log(
      "🔑 [DEPLOY] Secret hashlock (keccak256 of bytes):",
      secretHashlock,
    );
    console.log("🔑 [DEPLOY] Secret type:", typeof secret);
    console.log("🔑 [DEPLOY] Secret length:", secret.length);

    console.log({
      orderHash,
      maker,
      makerAsset,
      makingAmount,
      safetyDeposit,
      chainId: chainId.toString(),
      secretHashlock,
    });

    // Encode the function call
    const data = contractInterface.encodeFunctionData("deploySrcEscrow", [
      orderHash,
      maker,
      makerAsset,
      makingAmount,
      safetyDeposit,
      chainId.toString(),
      secretHashlock,
    ]);

    console.log("Sending transaction");
    // Send the transaction
    const tx = await sendTransaction({
      to: escrowFactoryAddress,
      data: data,
      value: safetyDeposit, // Send the safety deposit as value
    });

    console.log("Transaction sent. Retrieving escrow address");
    // Use a public JSON-RPC provider for the read-only contract call
    const provider = new JsonRpcProvider(
      process.env.NEXT_PUBLIC_EVM_CHAIN_RPC_URL!,
    );

    const contract = new Contract(
      escrowFactoryAddress,
      CustomEscrowFactoryContract.abi,
      provider,
    );

    // Call addressOfEscrowSrc to get the deployed escrow contract address
    if (!contract.addressOfEscrowSrc) {
      throw new Error("addressOfEscrowSrc method not found on contract");
    }

    console.log("Calling addressOfEscrowSrc");
    const escrowAddress = await contract.addressOfEscrowSrc(orderHash);

    return {
      transactionHash: tx,
      escrowAddress: escrowAddress,
      orderHash: orderHash,
    };
  };

  const withdrawSrc = async (
    order: Sdk.CrossChainOrder,
    srcEscrowAddress: string,
    secret: string,
  ) => {
    // Create contract interface for CustomEscrowSrc
    const contractInterface = new Interface(CustomEscrowSrcContract.abi);

    // Extract target address (taker) - this should be the address that will receive the tokens
    // For now, using the current user's address as target, but you may need to pass this as parameter
    if (!user?.address) {
      throw new Error("User not connected");
    }
    const target = user.address;

    // Extract token and amount from the order
    const token = order.makerAsset.toString();
    const amount = order.makingAmount.toString();

    // Convert string secret to bytes32
    const secretBytes32 = getBytes(secret);

    console.log("🏦 Escrow address:", srcEscrowAddress);
    console.log("🔑 [WITHDRAW] Secret:", secret);
    console.log("🔑 [WITHDRAW] Secret bytes32:", secretBytes32);
    console.log("🔑 [WITHDRAW] Secret type:", typeof secret);
    console.log("🔑 [WITHDRAW] Secret length:", secret.length);
    console.log(
      "🔑 [WITHDRAW] Hashlock (SDK):",
      Sdk.HashLock.hashSecret(secret),
    );
    console.log(
      "🔑 [WITHDRAW] Hashlock (keccak256 string):",
      keccak256(secret),
    );
    console.log(
      "🔑 [WITHDRAW] Hashlock (keccak256 bytes):",
      keccak256(getBytes(secret)),
    );

    console.log("Secret bytes32", secretBytes32);
    console.log("Target", target);
    console.log("Token", token);
    console.log("Amount", amount);
    console.log("srcEscrowAddress", srcEscrowAddress);

    // Encode the function call for withdraw
    const data = contractInterface.encodeFunctionData("withdraw", [
      secretBytes32,
      target,
      token,
      amount, // Use the actual amount from the order
    ]);

    // Send the transaction to the specific escrow contract
    const tx = await sendTransaction({
      to: srcEscrowAddress,
      data: data,
      value: "0", // No value needed for withdraw
    });

    return tx;
  };

  return { deploySrcEscrow, withdrawSrc };
};

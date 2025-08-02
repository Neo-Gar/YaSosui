import { JsonRpcProvider, randomBytes, Wallet, Interface } from "ethers";
import { Resolver } from "../other/resolver";
import * as Sdk from "@1inch/cross-chain-sdk";
import { Address } from "@1inch/fusion-sdk";
import { uint8ArrayToHex } from "@1inch/byte-utils";
import useETHUser from "./ETHUser";

// Import the contract ABIs for parsing events
import ResolverContract from "../../../../../packages/solidity/dist/contracts/Resolver.sol/Resolver.json";
import BaseEscrowFactoryContract from "../../../../../packages/solidity/dist/contracts/BaseEscrowFactory.sol/BaseEscrowFactory.json";

// Function to get and parse events from a transaction
export const getTransactionEvents = async (txHash: string) => {
  try {
    // Create provider (assuming you're on Ethereum mainnet)
    const provider = new JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || "https://eth.llamarpc.com",
    );

    // Create interfaces for parsing events
    const resolverInterface = new Interface(ResolverContract.abi);
    const escrowFactoryInterface = new Interface(BaseEscrowFactoryContract.abi);

    // Wait for transaction to be mined
    console.log("Waiting for transaction to be mined...");
    const receipt = await provider.waitForTransaction(txHash);

    if (!receipt) {
      throw new Error("Transaction receipt not found");
    }

    console.log("Transaction receipt:", receipt);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Status:", receipt.status === 1 ? "Success" : "Failed");

    // Parse events from the transaction receipt
    const events = receipt.logs.map((log, index) => {
      try {
        // Try to parse with the resolver contract interface first
        const parsedEvent = resolverInterface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        return {
          logIndex: index,
          address: log.address,
          eventName: parsedEvent?.name,
          args: parsedEvent?.args,
          parsedBy: "Resolver",
        };
      } catch {
        try {
          // Try to parse with the escrow factory interface
          const parsedEvent = escrowFactoryInterface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          return {
            logIndex: index,
            address: log.address,
            eventName: parsedEvent?.name,
            args: parsedEvent?.args,
            parsedBy: "EscrowFactory",
          };
        } catch {
          // Return raw log if parsing fails
          return {
            logIndex: index,
            address: log.address,
            topics: log.topics,
            data: log.data,
            parsedBy: "Raw",
          };
        }
      }
    });

    console.log("Events from transaction:", events);

    // Look for specific events
    const srcEscrowCreatedEvents = events.filter(
      (event) => event.eventName === "SrcEscrowCreated",
    );

    const dstEscrowCreatedEvents = events.filter(
      (event) => event.eventName === "DstEscrowCreated",
    );

    if (srcEscrowCreatedEvents.length > 0) {
      console.log("SrcEscrowCreated events found:", srcEscrowCreatedEvents);

      // Extract escrow address and other important data
      srcEscrowCreatedEvents.forEach((event, index) => {
        console.log(`SrcEscrowCreated event ${index + 1}:`, {
          srcImmutables: event.args?.srcImmutables,
          dstImmutablesComplement: event.args?.dstImmutablesComplement,
        });

        // Log important fields from the srcImmutables
        if (event.args?.srcImmutables) {
          const immutables = event.args.srcImmutables;
          console.log("Source escrow details:", {
            orderHash: immutables.orderHash,
            hashlock: immutables.hashlock,
            maker: immutables.maker,
            taker: immutables.taker,
            token: immutables.token,
            amount: immutables.amount?.toString(),
            safetyDeposit: immutables.safetyDeposit?.toString(),
          });
        }

        // Log destination chain details
        if (event.args?.dstImmutablesComplement) {
          const dstComplement = event.args.dstImmutablesComplement;
          console.log("Destination chain details:", {
            maker: dstComplement.maker,
            amount: dstComplement.amount?.toString(),
            token: dstComplement.token,
            safetyDeposit: dstComplement.safetyDeposit?.toString(),
            chainId: dstComplement.chainId?.toString(),
          });
        }
      });
    }

    if (dstEscrowCreatedEvents.length > 0) {
      console.log("DstEscrowCreated events found:", dstEscrowCreatedEvents);

      dstEscrowCreatedEvents.forEach((event, index) => {
        console.log(`DstEscrowCreated event ${index + 1}:`, {
          escrowAddress: event.args?.escrow,
          hashlock: event.args?.hashlock,
          taker: event.args?.taker,
        });
      });
    }

    // Look for other common events
    const transferEvents = events.filter(
      (event) => event.eventName === "Transfer",
    );

    const ownershipTransferredEvents = events.filter(
      (event) => event.eventName === "OwnershipTransferred",
    );

    return {
      txHash,
      receipt,
      events,
      srcEscrowCreatedEvents,
      dstEscrowCreatedEvents,
      transferEvents,
      ownershipTransferredEvents,
    };
  } catch (error) {
    console.error("Error getting transaction events:", error);
    return {
      txHash,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const deploySrcEscrow = async (
  order: Sdk.CrossChainOrder,
  signature: string,
  secrets: string[],
) => {
  const { sendTransaction } = useETHUser();
  const resolverContract = new Resolver("", "");
  const srcChainId = 1;
  const escrowFactory = "0x7cA1DaC2BBc62896A70658019435Cd178c9651B2";

  const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s));
  const leaves = Sdk.HashLock.getMerkleLeaves(secrets);
  const idx = leaves.length - 1;
  const fillAmount = order.takingAmount;

  const txHash = await sendTransaction(
    resolverContract.deploySrc(
      srcChainId,
      order,
      signature,
      Sdk.TakerTraits.default()
        .setExtension(order.extension)
        .setInteraction(
          // Set up multiple fill interaction with Merkle proof
          new Sdk.EscrowFactory(
            new Address(escrowFactory),
          ).getMultipleFillInteraction(
            Sdk.HashLock.getProof(leaves, idx),
            idx,
            secretHashes[idx]!,
          ),
        )
        .setAmountMode(Sdk.AmountMode.maker)
        .setAmountThreshold(order.takingAmount),
      fillAmount,
      Sdk.HashLock.fromString(secretHashes[idx]!),
    ),
  );

  console.log("Transaction hash:", txHash);

  // Get events from the transaction using the separate function
  const result = await getTransactionEvents(txHash);

  const dstEscrowAddress = result.dstEscrowCreatedEvents?.[0]?.address; // ?

  return dstEscrowAddress;
};

export const withdrawSrc = async (
  order: Sdk.CrossChainOrder,
  srcEscrowAddress: string,
  secret: string,
) => {
  const { sendTransaction } = useETHUser();
  const resolverContract = new Resolver("", "");

  const resolverWithdrawHash = await sendTransaction(
    resolverContract.withdraw(
      "src",
      new Sdk.Address(srcEscrowAddress),
      secret,
      order.toSrcImmutables(
        1,
        new Sdk.Address(srcEscrowAddress),
        order.takingAmount,
        Sdk.HashLock.fromString(secret),
      ),
    ),
  );
};

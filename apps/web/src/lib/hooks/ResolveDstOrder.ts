import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import * as Sdk from "@1inch/cross-chain-sdk";

const client = new SuiClient({
  url: "https://fullnode.testnet.sui.io:443",
});

const suiFactoryTarget: string = ""; // Hardcoded!
const suiFactoryObject: string = ""; // Hardcoded!
const paymentCoin = ""; // Hardcoded!
const depositToken = ""; // Hardcoded!
const SUI_PRIVATE_KEY = "";
const dstChainResolverKeypair = Ed25519Keypair.fromSecretKey(SUI_PRIVATE_KEY);
const secret = "Secret";

const hexToBytes = (hex: string): number[] => {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16));
  }
  return bytes;
};

export const deployDistEscrow = async (
  order: Sdk.CrossChainOrder,
): Promise<string> => {
  const orderHash = order.getOrderHash(1);
  const hashLock = order.escrowExtension.hashLockInfo;
  const maker = order.maker;
  const taker = order.maker; // ?
  const token = order.takerAsset;
  const amount = order.takingAmount;
  const safetyDeposit = order.escrowExtension.srcSafetyDeposit;
  const timeLocks = order.escrowExtension.timeLocks;
  // Deploy escrow
  const txbEscrow = new Transaction();
  txbEscrow.moveCall({
    target: `${suiFactoryTarget}::escrow_factory::deploy_escrow`,
    arguments: [
      txbEscrow.object(suiFactoryObject), // factory object
      txbEscrow.pure("vector<u8>", hexToBytes(orderHash)), // order_hash
      txbEscrow.pure("vector<u8>", hexToBytes(hashLock.toString())), // hash_lock
      txbEscrow.pure("address", maker.toString()), // maker
      txbEscrow.pure("address", taker.toString()), // taker
      txbEscrow.pure("address", token.toString()), // token
      txbEscrow.pure("u64", amount), // amount
      txbEscrow.pure("u64", safetyDeposit), // safety_deposit
      txbEscrow.pure("vector<u8>", hexToBytes(timeLocks.toString())), // time_locks
      txbEscrow.object(paymentCoin), // payment coin
      txbEscrow.object(depositToken), // deposit token
    ],
  });

  const dstDeployedAt = await client.signAndExecuteTransaction({
    transaction: txbEscrow,
    signer: dstChainResolverKeypair,
    options: { showEvents: true, showObjectChanges: true }, // or showEffects: true on older SDKs
  });

  // Get escrow id
  const transaction = await client.getTransactionBlock({
    digest: dstDeployedAt.digest,
    options: { showEvents: true },
  });

  const parsed = transaction.events?.[0]!.parsedJson as any;
  const escrow_id = parsed.escrow_id;

  return escrow_id;
};

export const withdrawDst = async (escrowId: string, secret: string) => {
  const txbWithdraw = new Transaction();
  txbWithdraw.moveCall({
    target: `${suiFactoryTarget}::escrow_factory::withdraw_escrow`,
    arguments: [
      txbWithdraw.object(escrowId),
      txbWithdraw.pure("vector<u8>", hexToBytes(secret)),
    ],
  });

  await client.signAndExecuteTransaction({
    transaction: txbWithdraw,
    signer: dstChainResolverKeypair,
    options: { showEvents: true, showObjectChanges: true }, // or showEffects: true on older SDKs
  });
};

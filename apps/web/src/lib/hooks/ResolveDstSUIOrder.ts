import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import * as Sdk from "@1inch/cross-chain-sdk";
import { useWallets } from "./useWallets";

const client = new SuiClient({
  url: "https://fullnode.testnet.sui.io:443",
});

const suiFactoryTarget: string =
  // "0xbe9ff52b3a26bf82b0e03334341cda0e47c402d59ae37dd3f20a1476c9afeea8"; // Hardcoded!
  "0x972d134b8fd02679e3e9b9f1ddba7c3f39d1dcb23a61e324b6b254107139f1cd";
const suiFactoryObject: string =
  // "0x0119f4ba6ddc450bb1bec3a0a209763e7f449b0b337ad3d52b8e431fe146d6b1"; // Hardcoded!
  "0xab453ab81b4015357a36ff57241d36c87a776960bc7fa745a2b7fff6fa4ac467";
const suiCoinType =
  "0x972d134b8fd02679e3e9b9f1ddba7c3f39d1dcb23a61e324b6b254107139f1cd::my_coin::MY_COIN";

const hexToBytes = (hex: string): number[] => {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16));
  }
  return bytes;
};

async function pickCoin(owner: string, coinType: string, min: bigint) {
  console.log("pickCoin", owner, coinType, min);
  const res = await client.getCoins({ owner, coinType, limit: 200 });
  console.log("res", res);
  // choose one coin with enough balance
  const single = res.data.find((c) => BigInt(c.balance) >= min);
  if (single) return single.coinObjectId;

  throw new Error("Not enough balance");
}

export const useDeployDistSUIEscrow = () => {
  const { suiAccount, signAndExecuteTransaction, connectSuiWallet } =
    useWallets();

  const deployDistEscrow = async (
    order: Sdk.CrossChainOrder,
    orderHash: string,
  ): Promise<string> => {
    const hashLock = order.escrowExtension.hashLockInfo;
    const maker = order.maker;
    const taker = order.maker; // ?
    const token = order.takerAsset;
    // const amount = order.takingAmount / 10n ** 12n; // 18 decimals -> 6 decimals
    const amount = 10n;
    // const safetyDeposit = order.escrowExtension.srcSafetyDeposit;
    const safetyDeposit = 10n;
    const timeLocks = order.escrowExtension.timeLocks;
    // Deploy escrow
    const txbEscrow = new Transaction();

    const [safetyDepositCoin] = txbEscrow.splitCoins(txbEscrow.gas, [
      txbEscrow.pure.u64(safetyDeposit),
    ]);

    // Ensure SUI account is connected, trigger wallet popup if not
    if (!suiAccount) {
      try {
        await connectSuiWallet();
        // Note: After connection, suiAccount should be available in the next render
        // We'll check again after the hook updates
      } catch (error) {
        throw new Error(
          "Failed to connect SUI wallet. Please try again or install a SUI wallet extension.",
        );
      }
    }

    // Double-check we have an account after potential connection
    if (!suiAccount) {
      throw new Error(
        "SUI wallet connection required. Please connect your wallet and try again.",
      );
    }

    const depositTokenCoin = await pickCoin(
      suiAccount.address,
      suiCoinType,
      amount,
    );

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
        safetyDepositCoin, // payment coin
        txbEscrow.object(depositTokenCoin), // deposit token
      ],
    });

    const dstDeployedAt = await signAndExecuteTransaction({
      transaction: txbEscrow,
    });

    // Wait for 2 seconds to ensure the escrow is deployed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get escrow id
    const transaction = await client.getTransactionBlock({
      digest: dstDeployedAt.digest,
      options: { showEvents: true },
    });

    const parsed = transaction.events?.[0]!.parsedJson as any;
    const escrow_id = parsed.escrow_id;

    return escrow_id;
  };

  const withdrawDst = async (escrowId: string, secret: string) => {
    // Ensure SUI account is connected, trigger wallet popup if not
    if (!suiAccount) {
      try {
        await connectSuiWallet();
      } catch (error) {
        throw new Error(
          "Failed to connect SUI wallet. Please try again or install a SUI wallet extension.",
        );
      }
    }

    // Double-check we have an account after potential connection
    if (!suiAccount) {
      throw new Error(
        "SUI wallet connection required. Please connect your wallet and try again.",
      );
    }

    const txbWithdraw = new Transaction();
    txbWithdraw.moveCall({
      target: `${suiFactoryTarget}::escrow_factory::withdraw`,
      arguments: [
        txbWithdraw.object(escrowId),
        txbWithdraw.pure("vector<u8>", hexToBytes(secret)),
      ],
    });

    await signAndExecuteTransaction({ transaction: txbWithdraw });
  };

  return { deployDistEscrow, withdrawDst };
};

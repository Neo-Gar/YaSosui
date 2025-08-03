import {
  useCurrentAccount,
  useDisconnectWallet,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { useCallback } from "react";

export const useWallets = () => {
  const suiAccount = useCurrentAccount();
  const reownAccount = useAppKitAccount();
  const { mutate: disconnectSui } = useDisconnectWallet();
  const { disconnect: disconnectReown } = useDisconnect();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  const disconnectAll = useCallback(async () => {
    try {
      if (suiAccount) {
        disconnectSui();
      }

      if (reownAccount) {
        disconnectReown();
      }
    } catch (error) {
      console.error("Error disconnecting wallets:", error);
    }
  }, [suiAccount, reownAccount, disconnectSui, disconnectReown]);

  const disconnectOtherWallet = useCallback(
    async (walletType: "sui" | "reown") => {
      try {
        if (walletType === "sui" && reownAccount) {
          disconnectReown();
        } else if (walletType === "reown" && suiAccount) {
          disconnectSui();
        }
      } catch (error) {
        console.error("Error disconnecting other wallet:", error);
      }
    },
    [suiAccount, reownAccount, disconnectSui, disconnectReown],
  );

  const activeWallet = suiAccount?.address
    ? { address: suiAccount.address, type: "sui" }
    : reownAccount?.address
      ? { address: reownAccount.address, type: "reown" }
      : null;

  return {
    suiAccount,
    reownAccount,
    disconnectAll,
    disconnectOtherWallet,
    signAndExecuteTransaction,
    activeWallet,
    isConnected: Boolean(suiAccount || reownAccount),
  };
};

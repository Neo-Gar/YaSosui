import {
  useCurrentAccount,
  useConnectWallet,
  useDisconnectWallet,
  useSignAndExecuteTransaction,
  useWallets as useSuiWallets,
} from "@mysten/dapp-kit";
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { useCallback } from "react";

export const useWallets = () => {
  const suiAccount = useCurrentAccount();
  const reownAccount = useAppKitAccount();
  const availableWallets = useSuiWallets();
  const { mutateAsync: connectSui } = useConnectWallet();
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

  const connectSuiWallet = useCallback(async () => {
    try {
      // If already connected, do nothing
      if (suiAccount) {
        return suiAccount;
      }

      // Get the first available wallet or use Sui Wallet as default
      const firstWallet =
        availableWallets.find((wallet) => wallet.name === "Sui Wallet") ||
        availableWallets[0];

      if (!firstWallet) {
        throw new Error(
          "No SUI wallets available. Please install a SUI wallet extension.",
        );
      }

      // Connect to the wallet
      await connectSui({ wallet: firstWallet });
      return suiAccount;
    } catch (error) {
      console.error("Error connecting SUI wallet:", error);
      throw error;
    }
  }, [suiAccount, availableWallets, connectSui]);

  const activeWallet = suiAccount?.address
    ? { address: suiAccount.address, type: "sui" }
    : reownAccount?.address
      ? { address: reownAccount.address, type: "reown" }
      : null;

  return {
    suiAccount,
    reownAccount,
    connectSui,
    connectSuiWallet,
    disconnectAll,
    disconnectOtherWallet,
    signAndExecuteTransaction,
    activeWallet,
    isConnected: Boolean(suiAccount || reownAccount),
  };
};

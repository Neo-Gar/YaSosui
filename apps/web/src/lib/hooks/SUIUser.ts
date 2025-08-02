import { useState, useEffect, useCallback } from "react";

// Phantom wallet SUI provider interface
interface PhantomSuiProvider {
  connect: () => Promise<{ publicKey: string }>;
  disconnect: () => Promise<void>;
  signAndExecuteTransaction: (transaction: any) => Promise<any>;
  signTransaction: (transaction: any) => Promise<any>;
  signMessage: (message: {
    message: Uint8Array;
  }) => Promise<{ signature: string }>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  isConnected: boolean;
  publicKey?: string;
}

interface PhantomWindow {
  phantom?: {
    sui?: PhantomSuiProvider;
  };
}

declare const window: PhantomWindow & typeof globalThis;

export interface SUIUser {
  publicKey: string;
  address: string;
}

export interface SUIUserHookReturn {
  user: SUIUser | null;
  isConnected: boolean;
  isConnecting: boolean;
  isPhantomInstalled: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndExecuteTransaction: (transaction: any) => Promise<any>;
  signTransaction: (transaction: any) => Promise<any>;
  signMessage: (message: Uint8Array) => Promise<{ signature: string }>;
}

const useSUIUser = (): SUIUserHookReturn => {
  const [user, setUser] = useState<SUIUser | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Phantom is installed
  const isPhantomInstalled =
    typeof window !== "undefined" && Boolean(window.phantom?.sui);

  // Get the Phantom SUI provider
  const getPhantomProvider = useCallback((): PhantomSuiProvider | null => {
    if (typeof window !== "undefined" && window.phantom?.sui) {
      return window.phantom.sui;
    }
    return null;
  }, []);

  // Connect to Phantom wallet
  const connect = useCallback(async (): Promise<void> => {
    const provider = getPhantomProvider();

    if (!provider) {
      setError("Phantom wallet is not installed");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const response = await provider.connect();

      if (response.publicKey) {
        const suiUser: SUIUser = {
          publicKey: response.publicKey,
          address: response.publicKey, // In SUI, address is derived from publicKey
        };

        setUser(suiUser);
      }
    } catch (err) {
      console.error("Failed to connect to Phantom wallet:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect to wallet",
      );
    } finally {
      setIsConnecting(false);
    }
  }, [getPhantomProvider]);

  // Disconnect from Phantom wallet
  const disconnect = useCallback(async (): Promise<void> => {
    const provider = getPhantomProvider();

    if (!provider) {
      setError("Phantom wallet is not installed");
      return;
    }

    try {
      setError(null);
      await provider.disconnect();
      setUser(null);
    } catch (err) {
      console.error("Failed to disconnect from Phantom wallet:", err);
      setError(
        err instanceof Error ? err.message : "Failed to disconnect from wallet",
      );
    }
  }, [getPhantomProvider]);

  // Sign and execute transaction
  const signAndExecuteTransaction = useCallback(
    async (transaction: any): Promise<any> => {
      const provider = getPhantomProvider();

      if (!provider) {
        throw new Error("Phantom wallet is not installed");
      }

      if (!user) {
        throw new Error("Wallet is not connected");
      }

      try {
        setError(null);
        const result = await provider.signAndExecuteTransaction(transaction);
        return result;
      } catch (err) {
        console.error("Failed to sign and execute transaction:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to sign and execute transaction";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [getPhantomProvider, user],
  );

  // Sign transaction
  const signTransaction = useCallback(
    async (transaction: any): Promise<any> => {
      const provider = getPhantomProvider();

      if (!provider) {
        throw new Error("Phantom wallet is not installed");
      }

      if (!user) {
        throw new Error("Wallet is not connected");
      }

      try {
        setError(null);
        const result = await provider.signTransaction(transaction);
        return result;
      } catch (err) {
        console.error("Failed to sign transaction:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to sign transaction";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [getPhantomProvider, user],
  );

  // Sign message
  const signMessage = useCallback(
    async (message: Uint8Array): Promise<{ signature: string }> => {
      const provider = getPhantomProvider();

      if (!provider) {
        throw new Error("Phantom wallet is not installed");
      }

      if (!user) {
        throw new Error("Wallet is not connected");
      }

      try {
        setError(null);
        const result = await provider.signMessage({ message });
        return result;
      } catch (err) {
        console.error("Failed to sign message:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to sign message";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [getPhantomProvider, user],
  );

  // Handle account changes and disconnection
  useEffect(() => {
    const provider = getPhantomProvider();

    if (!provider) return;

    const handleAccountChange = (publicKey: string | null) => {
      if (publicKey) {
        const suiUser: SUIUser = {
          publicKey,
          address: publicKey,
        };
        setUser(suiUser);
      } else {
        setUser(null);
      }
    };

    const handleDisconnect = () => {
      setUser(null);
    };

    // Listen for account changes
    provider.on("accountChanged", handleAccountChange);
    provider.on("disconnect", handleDisconnect);

    // Check if already connected on mount
    if (provider.isConnected && provider.publicKey) {
      const suiUser: SUIUser = {
        publicKey: provider.publicKey,
        address: provider.publicKey,
      };
      setUser(suiUser);
    }

    // Cleanup listeners
    return () => {
      provider.off("accountChanged", handleAccountChange);
      provider.off("disconnect", handleDisconnect);
    };
  }, [getPhantomProvider]);

  return {
    user,
    isConnected: Boolean(user),
    isConnecting,
    isPhantomInstalled,
    error,
    connect,
    disconnect,
    signAndExecuteTransaction,
    signTransaction,
    signMessage,
  };
};

export default useSUIUser;

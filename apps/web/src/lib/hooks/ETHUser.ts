import { useState, useEffect, useCallback } from "react";

// MetaMask Ethereum provider interface
interface MetaMaskProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  isMetaMask: boolean;
  isConnected: () => boolean;
  selectedAddress: string | null;
  chainId: string | null;
}

interface MetaMaskWindow {
  ethereum?: MetaMaskProvider;
}

declare const window: MetaMaskWindow & typeof globalThis;

export interface ETHUser {
  address: string;
  chainId: string;
  balance?: string;
}

// Contract method call interface (for zkApp and other contract interactions)
interface ContractMethodCall {
  to?: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  // Support for contract method objects that might have these methods
  encodeABI?: () => string;
  estimateGas?: (options?: any) => Promise<string>;
  // Or direct transaction properties
  [key: string]: any;
}

// Standard transaction interface
interface StandardTransaction {
  to: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
}

export interface ETHUserHookReturn {
  user: ETHUser | null;
  isConnected: boolean;
  isConnecting: boolean;
  isMetaMaskInstalled: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: string) => Promise<void>;
  sendTransaction: (
    transaction: StandardTransaction | ContractMethodCall | any,
  ) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  signTypedData: (typedData: any) => Promise<string>;
  getBalance: () => Promise<string>;
}

const useETHUser = (): ETHUserHookReturn => {
  const [user, setUser] = useState<ETHUser | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if MetaMask is installed
  const isMetaMaskInstalled =
    typeof window !== "undefined" && Boolean(window.ethereum?.isMetaMask);

  // Get the MetaMask provider
  const getMetaMaskProvider = useCallback((): MetaMaskProvider | null => {
    if (typeof window !== "undefined" && window.ethereum?.isMetaMask) {
      return window.ethereum;
    }
    return null;
  }, []);

  // Get user balance
  const getBalance = useCallback(async (): Promise<string> => {
    const provider = getMetaMaskProvider();

    if (!provider) {
      throw new Error("MetaMask is not installed");
    }

    // Get current account directly from provider instead of relying on state
    let currentAddress: string;
    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("Wallet is not connected");
      }
      currentAddress = accounts[0];
    } catch (err) {
      throw new Error("Wallet is not connected");
    }

    try {
      const balance = await provider.request({
        method: "eth_getBalance",
        params: [currentAddress, "latest"],
      });
      return balance;
    } catch (err) {
      console.error("Failed to get balance:", err);
      throw new Error(
        err instanceof Error ? err.message : "Failed to get balance",
      );
    }
  }, [getMetaMaskProvider]);

  // Connect to MetaMask wallet
  const connect = useCallback(async (): Promise<void> => {
    const provider = getMetaMaskProvider();

    if (!provider) {
      setError("MetaMask is not installed");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Request account access
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        const chainIdResponse = await provider.request({
          method: "eth_chainId",
        });

        // Get balance
        const balance = await provider.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        });

        if (chainIdResponse && typeof chainIdResponse === "string") {
          const ethUser: ETHUser = {
            address,
            chainId: chainIdResponse,
            balance: balance || undefined,
          };

          console.log("ethUser: ", ethUser);

          setUser(ethUser);
        }
      }
    } catch (err) {
      console.error("Failed to connect to MetaMask:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect to wallet",
      );
    } finally {
      setIsConnecting(false);
    }
  }, [getMetaMaskProvider]);

  // Disconnect from MetaMask wallet (note: MetaMask doesn't have a direct disconnect method)
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setUser(null);
      // Note: MetaMask doesn't provide a programmatic disconnect method
      // Users need to disconnect manually from the MetaMask extension
    } catch (err) {
      console.error("Failed to disconnect from MetaMask:", err);
      setError(
        err instanceof Error ? err.message : "Failed to disconnect from wallet",
      );
    }
  }, []);

  // Switch chain
  const switchChain = useCallback(
    async (chainId: string): Promise<void> => {
      const provider = getMetaMaskProvider();

      if (!provider) {
        throw new Error("MetaMask is not installed");
      }

      try {
        setError(null);
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
      } catch (err: any) {
        console.error("Failed to switch chain:", err);

        // Chain doesn't exist, try to add it
        if (err.code === 4902) {
          throw new Error(
            "Chain not found. Please add the chain to MetaMask first.",
          );
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to switch chain";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [getMetaMaskProvider],
  );

  // Helper function to normalize transaction object
  const normalizeTransaction = async (
    transaction: StandardTransaction | ContractMethodCall | any,
  ): Promise<StandardTransaction> => {
    let normalizedTx: StandardTransaction;

    // If it's already a standard transaction format
    if (transaction.to && typeof transaction.to === "string") {
      normalizedTx = {
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        gas: transaction.gas,
        gasPrice: transaction.gasPrice,
      };
    }
    // If it's a contract method call with encodeABI
    else if (
      transaction.encodeABI &&
      typeof transaction.encodeABI === "function"
    ) {
      normalizedTx = {
        to: transaction._parent?._address || transaction.to || "",
        value: transaction.value || "0x0",
        data: transaction.encodeABI(),
        gas: transaction.gas,
        gasPrice: transaction.gasPrice,
      };
    }
    // If it's a zkApp or other contract call with transaction properties
    else if (typeof transaction === "object" && transaction !== null) {
      // Try to extract transaction properties from the object
      normalizedTx = {
        to: transaction.to || transaction.address || transaction.target || "",
        value: transaction.value || transaction.amount || "0x0",
        data: transaction.data || transaction.calldata || "",
        gas: transaction.gas || transaction.gasLimit,
        gasPrice: transaction.gasPrice || transaction.maxFeePerGas,
      };

      // If no 'to' address found, try common contract interaction patterns
      if (!normalizedTx.to) {
        if (transaction._method?.to) {
          normalizedTx.to = transaction._method.to;
        } else if (transaction.contract?.address) {
          normalizedTx.to = transaction.contract.address;
        }
      }

      // If no data found, try to encode if possible
      if (!normalizedTx.data) {
        if (transaction.encode && typeof transaction.encode === "function") {
          normalizedTx.data = transaction.encode();
        } else if (
          transaction.buildTransaction &&
          typeof transaction.buildTransaction === "function"
        ) {
          const builtTx = await transaction.buildTransaction();
          normalizedTx = { ...normalizedTx, ...builtTx };
        }
      }
    } else {
      throw new Error("Invalid transaction format");
    }

    // Validate that we have at least a 'to' address
    if (!normalizedTx.to) {
      throw new Error("Transaction must have a 'to' address");
    }

    // Ensure value is properly formatted as hex string
    if (normalizedTx.value !== undefined && normalizedTx.value !== null) {
      if (typeof normalizedTx.value === "bigint") {
        normalizedTx.value = `0x${(normalizedTx.value as bigint).toString(16)}`;
      } else if (typeof normalizedTx.value === "number") {
        normalizedTx.value = `0x${(normalizedTx.value as number).toString(16)}`;
      } else if (
        typeof normalizedTx.value === "string" &&
        !(normalizedTx.value as string).startsWith("0x")
      ) {
        // If it's a decimal string, convert to hex
        const numValue = parseInt(normalizedTx.value as string, 10);
        if (!isNaN(numValue)) {
          normalizedTx.value = `0x${numValue.toString(16)}`;
        }
      }
    }

    // Ensure gas fields are properly formatted
    if (
      normalizedTx.gas !== undefined &&
      typeof normalizedTx.gas === "bigint"
    ) {
      normalizedTx.gas = `0x${(normalizedTx.gas as bigint).toString(16)}`;
    }
    if (
      normalizedTx.gasPrice !== undefined &&
      typeof normalizedTx.gasPrice === "bigint"
    ) {
      normalizedTx.gasPrice = `0x${(normalizedTx.gasPrice as bigint).toString(16)}`;
    }

    return normalizedTx;
  };

  // Send transaction
  const sendTransaction = useCallback(
    async (
      transaction: StandardTransaction | ContractMethodCall | any,
    ): Promise<string> => {
      const provider = getMetaMaskProvider();

      if (!provider) {
        throw new Error("MetaMask is not installed");
      }

      // Get current account directly from provider instead of relying on state
      let currentAddress: string;
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (!accounts || accounts.length === 0) {
          throw new Error("Wallet is not connected");
        }
        currentAddress = accounts[0];
      } catch (err) {
        throw new Error("Wallet is not connected");
      }

      try {
        setError(null);

        // Normalize the transaction object
        const normalizedTx = await normalizeTransaction(transaction);

        console.log("=== DEBUG: Original transaction ===", transaction);
        console.log("=== DEBUG: Normalized transaction ===", normalizedTx);
        console.log("=== DEBUG: Transaction fields types ===", {
          to: typeof normalizedTx.to,
          value: typeof normalizedTx.value,
          data: typeof normalizedTx.data,
          gas: typeof normalizedTx.gas,
          gasPrice: typeof normalizedTx.gasPrice,
        });

        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: currentAddress,
              ...normalizedTx,
            },
          ],
        });
        return txHash;
      } catch (err) {
        console.error("Failed to send transaction:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send transaction";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [getMetaMaskProvider],
  );

  // Sign message
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      const provider = getMetaMaskProvider();

      if (!provider) {
        throw new Error("MetaMask is not installed");
      }

      // Get current account directly from provider instead of relying on state
      let currentAddress: string;
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (!accounts || accounts.length === 0) {
          throw new Error("Wallet is not connected");
        }
        currentAddress = accounts[0];
      } catch (err) {
        throw new Error("Wallet is not connected");
      }

      try {
        setError(null);
        const signature = await provider.request({
          method: "personal_sign",
          params: [message, currentAddress],
        });
        return signature;
      } catch (err) {
        console.error("Failed to sign message:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to sign message";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [getMetaMaskProvider],
  );

  // Sign typed data
  const signTypedData = useCallback(
    async (typedData: any): Promise<string> => {
      const provider = getMetaMaskProvider();

      if (!provider) {
        throw new Error("MetaMask is not installed");
      }

      // Get current account directly from provider instead of relying on state
      let currentAddress: string;
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (!accounts || accounts.length === 0) {
          throw new Error("Wallet is not connected");
        }
        currentAddress = accounts[0];
      } catch (err) {
        throw new Error("Wallet is not connected");
      }

      try {
        setError(null);
        const signature = await provider.request({
          method: "eth_signTypedData_v4",
          params: [currentAddress, JSON.stringify(typedData)],
        });
        return signature;
      } catch (err) {
        console.error("Failed to sign typed data:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to sign typed data";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [getMetaMaskProvider],
  );

  // Handle account and chain changes
  useEffect(() => {
    const provider = getMetaMaskProvider();

    if (!provider) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        const chainIdResponse = await provider.request({
          method: "eth_chainId",
        });
        const balance = await provider.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        });

        if (chainIdResponse && typeof chainIdResponse === "string") {
          const ethUser: ETHUser = {
            address: address!,
            chainId: chainIdResponse,
            balance: balance || undefined,
          };
          setUser(ethUser);
        }
      } else {
        setUser(null);
      }
    };

    const handleChainChanged = async (chainId: string) => {
      // Get current account directly from provider instead of relying on state
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          const address = accounts[0];
          const balance = await provider.request({
            method: "eth_getBalance",
            params: [address, "latest"],
          });

          setUser((prev) => (prev ? { ...prev, chainId, balance } : null));
        }
      } catch (err) {
        console.error("Failed to handle chain change:", err);
      }
    };

    const handleDisconnect = () => {
      setUser(null);
    };

    // Listen for account and chain changes
    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", handleDisconnect);

    // Check if already connected on mount
    const checkConnection = async () => {
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          const address = accounts[0];
          const chainIdResponse = await provider.request({
            method: "eth_chainId",
          });
          const balance = await provider.request({
            method: "eth_getBalance",
            params: [address, "latest"],
          });

          if (chainIdResponse && typeof chainIdResponse === "string") {
            const ethUser: ETHUser = {
              address,
              chainId: chainIdResponse,
              balance: balance || undefined,
            };
            setUser(ethUser);
          }
        }
      } catch (err) {
        console.error("Failed to check connection:", err);
      }
    };

    checkConnection();

    // Cleanup listeners
    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
      provider.removeListener("disconnect", handleDisconnect);
    };
  }, [getMetaMaskProvider]);

  return {
    user,
    isConnected: Boolean(user),
    isConnecting,
    isMetaMaskInstalled,
    error,
    connect,
    disconnect,
    switchChain,
    sendTransaction,
    signMessage,
    signTypedData,
    getBalance,
  };
};

export default useETHUser;

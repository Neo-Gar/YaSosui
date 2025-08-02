"use client";

import { wagmiAdapter, projectId } from "@/lib/config/wagmi";
import { createAppKit } from "@reown/appkit/react";
import { mainnet, sepolia } from "@reown/appkit/networks";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";

if (!projectId) {
  throw new Error("Project ID is not defined");
}

// Set up metadata
const metadata = {
  name: "YaSosui",
  description:
    "YaSosui is a platform for swapping tokens between Sui and Ethereum with 1inch Fusion+",
  url: "https://yasosui.com",
  icons: [""],
};

// Create the modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet, sepolia],
  defaultNetwork: sepolia,
  metadata: metadata,
  features: {
    analytics: true,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-font-family": "Helvetica, Arial, sans-serif",
    "--w3m-accent": "#6366f1",
    "--w3m-color-mix": "#6366f1",
    "--w3m-color-mix-strength": 30,
    "--w3m-font-size-master": "14px",
    "--w3m-border-radius-master": "12px",
    "--w3m-z-index": 9999,
  },
});

function ReownContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies,
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      {children}
    </WagmiProvider>
  );
}

export default ReownContextProvider;

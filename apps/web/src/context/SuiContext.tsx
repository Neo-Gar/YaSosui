"use client";

import { networkConfig } from "@/lib/config/suiNetwork";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import type { ReactNode } from "react";
import { getQueryClient } from "@/trpc/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { env } from "@/env";

export default function SuiContext({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork={env.NEXT_PUBLIC_SUI_DEFAULT_NETWORK}
      >
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

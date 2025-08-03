import "@/styles/globals.css";
import "@mysten/dapp-kit/dist/index.css";

import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";
import { FloatingTokens } from "@/components/Home/FloatingTokens";
import ReownContextProvider from "@/context/ReownContext";
import { headers } from "next/headers";
import SuiContext from "@/context/SuiContext";
import WalletButton from "@/components/WalletButton";

export const metadata: Metadata = {
  title: "YasoSui swap",
  description:
    "YasoSui is a platform for swapping tokens between Sui and Ethereum with 1inch Fusion+",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");

  return (
    <html lang="en">
      <body className="relative overflow-hidden">
        <SuiContext>
          <ReownContextProvider cookies={cookies}>
            <TRPCReactProvider>
              <FloatingTokens />
              {children}
              <div className="fixed top-5 right-5 z-50">
                <WalletButton />
              </div>
            </TRPCReactProvider>
          </ReownContextProvider>
        </SuiContext>
      </body>
    </html>
  );
}

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
  icons: [
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "shortcut icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", url: "/favicon.svg" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");

  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link
          rel="icon"
          sizes="16x16"
          type="image/svg+xml"
          href="/favicon.svg"
        />
        <link
          rel="icon"
          sizes="32x32"
          type="image/svg+xml"
          href="/favicon.svg"
        />
        <meta name="theme-color" content="#8F81F8" />
      </head>
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

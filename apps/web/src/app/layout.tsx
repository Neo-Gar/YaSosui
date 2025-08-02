import "@/styles/globals.css";

import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";
import { FloatingTokens } from "@/components/Home/FloatingTokens";
import ReownContextProvider from "@/context/ReownContext";
import { headers } from "next/headers";

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
        <TRPCReactProvider>
          <ReownContextProvider cookies={cookies}>
            <FloatingTokens />
            {children}
            <div className="fixed top-0 right-0 z-50">
              <appkit-button />
            </div>
          </ReownContextProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}

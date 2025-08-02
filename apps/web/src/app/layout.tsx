import "@/styles/globals.css";

import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";
import { FloatingTokens } from "@/components/Home/FloatingTokens";

export const metadata: Metadata = {
  title: "YaSosui swap",
  description:
    "YaSosui is a platform for swapping tokens between Sui and Ethereum with 1inch Fusion+",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="relative overflow-hidden">
        <TRPCReactProvider>
          <FloatingTokens />
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}

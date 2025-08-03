"use client";

import { useState } from "react";
import WalletsModal from "../WalletsModal";
import { useAppKit } from "@reown/appkit/react";
import { useWallets } from "@/lib/hooks/useWallets";

export default function WalletButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { open: openReown } = useAppKit();
  const { activeWallet } = useWallets();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleConnectReown = () => {
    openReown();
  };

  const walletAddress = activeWallet?.address || null;

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="appkit-button-wrapper flex items-center gap-2"
        title="Connect Wallet"
      >
        {walletAddress ? (
          <span>
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </span>
        ) : (
          <span>Connect wallet</span>
        )}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl">
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      </button>

      {isModalOpen && (
        <WalletsModal
          onClose={handleCloseModal}
          onConnectReown={handleConnectReown}
        />
      )}
    </>
  );
}

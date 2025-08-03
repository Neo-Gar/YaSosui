"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ConnectButton } from "@mysten/dapp-kit";
import { useWallets } from "@/lib/hooks/useWallets";

interface WalletsModalProps {
  onClose: () => void;
  onConnectReown: () => void;
}

export default function WalletsModal({
  onClose,
  onConnectReown,
}: WalletsModalProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { disconnectOtherWallet } = useWallets();

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleReownConnect = () => {
    disconnectOtherWallet("reown");
    onConnectReown();
    handleClose();
  };

  const handleSuiConnect = () => {
    disconnectOtherWallet("sui");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-opacity-50 fixed inset-0 z-[998] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md rounded-xl bg-white shadow-2xl"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Connect Wallet
                </h2>
                <button
                  onClick={handleClose}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-center text-sm text-gray-600">
                  Choose a wallet to connect to the platform
                </p>
                <p className="mt-2 text-center text-xs text-gray-500">
                  Only one wallet can be connected at a time
                </p>
              </div>

              {/* Wallet Options */}
              <div className="space-y-4">
                {/* Reown Wallet */}
                <button
                  onClick={handleReownConnect}
                  className="group w-full rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                      <svg
                        className="h-6 w-6 text-white"
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
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                        Ethereum Wallet
                      </p>
                      <p className="text-xs text-gray-500">Connect via Reown</p>
                    </div>
                  </div>
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">or</span>
                  </div>
                </div>

                {/* Sui Wallet */}
                <div className="group w-full rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:border-green-300 hover:bg-green-50">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-green-700">
                        Sui Wallet
                      </p>
                      <p className="text-xs text-gray-500">
                        Connect via Sui Wallet
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-center">
                    <div onClick={handleSuiConnect}>
                      <ConnectButton className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors duration-200 hover:bg-green-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6">
              <div className="text-center text-sm text-gray-500">
                Choose one of the supported wallets
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/trpc/react";
import { TokenLogo } from "../TokenLogo";
import OrderTimer from "../Orders/OrderTimer";

interface PendingOrderModalProps {
  orderId: string;
  onClose: () => void;
}

export default function PendingOrderModal({
  orderId,
  onClose,
}: PendingOrderModalProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Get order data
  const {
    data: order,
    isLoading,
    error,
  } = api.orders.getById.useQuery(
    { id: orderId },
    {
      refetchInterval: 30000, // Update every 30 seconds
      refetchIntervalInBackground: true,
    },
  );

  // Mutation for updating status
  const updateStatusMutation = api.orders.updateStatus.useMutation();

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for close animation
  };

  const handleExpire = async () => {
    if (order) {
      await updateStatusMutation.mutateAsync({
        id: order.id,
        status: "expired",
      });
    }
  };

  if (isLoading) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-opacity-50 fixed inset-0 z-[998] flex items-center justify-center backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mx-4 w-full max-w-md rounded-lg bg-white p-8 shadow-xl"
            >
              <div className="flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading order...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (error || !order) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mx-4 w-full max-w-md rounded-lg bg-white p-8 shadow-xl"
            >
              <div className="text-center">
                <div className="mb-4 text-6xl text-red-500">⚠️</div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Loading Error
                </h3>
                <p className="mb-6 text-gray-600">Failed to load order data</p>
                <div className="text-sm text-gray-500">
                  Please wait while we try to load the order...
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const progressPercentage = (order.collectedAmount / order.totalAmount) * 100;
  const isCompleted = order.status === "completed";
  const isExpired = order.status === "expired";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Order Details
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Token Swap Info */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  {/* From token */}
                  <div className="flex items-center space-x-3">
                    <TokenLogo
                      symbol={order.fromToken.symbol}
                      className="h-12 w-12"
                    />
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {order.fromToken.symbol}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {order.fromToken.network}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center space-x-2">
                    <svg
                      className="h-8 w-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>

                  {/* To token */}
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {order.toToken.symbol}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {order.toToken.network}
                      </p>
                    </div>
                    <TokenLogo
                      symbol={order.toToken.symbol}
                      className="h-12 w-12"
                    />
                  </div>
                </div>
              </div>

              {/* Total Amount */}
              <div className="mb-8 text-center">
                <p className="mb-2 text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {order.totalAmount.toFixed(6)} {order.fromToken.symbol}
                </p>
              </div>

              {/* Timer - Large */}
              <div className="mb-8">
                <div className="text-center">
                  <p className="mb-4 text-sm font-medium text-gray-700">
                    Time Remaining
                  </p>
                  <OrderTimer
                    expiresAt={order.expiresAt}
                    onExpire={handleExpire}
                    size="large"
                  />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Progress
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {progressPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-4 w-full rounded-full bg-gray-200">
                  <motion.div
                    className={`h-4 rounded-full ${
                      isCompleted
                        ? "bg-green-500"
                        : isExpired
                          ? "bg-red-500"
                          : "bg-blue-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>
                    Collected: {order.collectedAmount.toFixed(6)}{" "}
                    {order.fromToken.symbol}
                  </span>
                  <span>
                    Remaining:{" "}
                    {(order.totalAmount - order.collectedAmount).toFixed(6)}{" "}
                    {order.fromToken.symbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6">
              <div className="text-center text-sm text-gray-500">
                Order in progress...
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

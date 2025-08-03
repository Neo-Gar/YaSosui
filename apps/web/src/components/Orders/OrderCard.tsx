"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import type { IOrderWithTokens } from "@/lib/types/IOrder";
import { TokenLogo } from "@/components/TokenLogo";
import OrderTimer from "./OrderTimer";
import { api } from "@/trpc/react";
import { orderFromJson } from "@/lib/utils/orderSerializer";
import { useWallets } from "@/lib/hooks/useWallets";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useExecuteEthToSUI } from "@/lib/hooks/ResolverOrder";

interface OrderCardProps {
  order: IOrderWithTokens;
}

export default function OrderCard({ order }: OrderCardProps) {
  const [selectedPercentage, setSelectedPercentage] = useState(25);
  const [isSwapping, setIsSwapping] = useState(false);
  const [localOrder, setLocalOrder] = useState(order);
  const { activeWallet } = useWallets();

  const { executeOrder } = useExecuteEthToSUI();

  // Sync localOrder with order when order changes
  useEffect(() => {
    setLocalOrder(order);
  }, [order]);

  // Update selectedPercentage if current percentage is not available
  useEffect(() => {
    const availablePercentages = [25, 50, 75, 100];
    const availableForPayment = availablePercentages.filter((percentage) => {
      const amountForPercentage = (percentage / 100) * localOrder.totalAmount;
      const alreadyCollected = localOrder.collectedAmount;
      return amountForPercentage > alreadyCollected;
    });

    // If selected percentage is not available, select first available
    if (
      !availableForPayment.includes(selectedPercentage) &&
      availableForPayment.length > 0
    ) {
      setSelectedPercentage(availableForPayment[0]!);
    }
  }, [localOrder, selectedPercentage]);

  const utils = api.useUtils();

  const updateStatusMutation = api.orders.updateStatus.useMutation({
    onSuccess: () => {
      utils.orders.getAll.invalidate();
    },
  });

  const updateCollectedAmountMutation =
    api.orders.updateCollectedAmount.useMutation({
      onSuccess: () => {
        utils.orders.getAll.invalidate();
      },
    });

  const handleExpire = () => {
    setLocalOrder({ ...localOrder, status: "expired" as const });
    updateStatusMutation.mutate({
      id: localOrder.id,
      status: "expired",
    });
  };

  // Smart number formatting function
  const formatAmount = (amount: number) => {
    if (amount >= 1) {
      return amount.toFixed(2);
    } else if (amount >= 0.01) {
      return amount.toFixed(4);
    } else if (amount >= 0.0001) {
      return amount.toFixed(6);
    } else {
      return amount.toFixed(8);
    }
  };

  const progressPercentage =
    (localOrder.collectedAmount / localOrder.totalAmount) * 100;
  const remainingAmount = localOrder.totalAmount - localOrder.collectedAmount;

  const availablePercentages = [25, 50, 75, 100];

  // Filter available percentages based on total amount
  const availableForPayment = availablePercentages.filter((percentage) => {
    const amountForPercentage = (percentage / 100) * localOrder.totalAmount;
    const alreadyCollected = localOrder.collectedAmount;
    return amountForPercentage > alreadyCollected;
  });

  const handleSwap = async () => {
    if (!activeWallet) {
      alert("Please connect your wallet");
      return;
    }

    if (localOrder.status !== "active") return;

    // Check if selected percentage is available
    if (!availableForPayment.includes(selectedPercentage)) {
      return;
    }

    // TODO: get the order from the database
    // You can get order from the database
    // const order = await api.orders.getById.useQuery({ id: localOrder.id });

    //Or from local order
    const orderRecovered = orderFromJson(localOrder.jsonOrder ?? "");
    console.log(">>> orderRecovered: ", orderRecovered);
    const secrets = JSON.parse(localOrder.secrets!);
    const secret = secrets[secrets.length - 1]!;

    await executeOrder(
      orderRecovered,
      localOrder.orderHash!,
      localOrder.signature!,
      secret,
    );

    // // Check if selected percentage is available
    // if (!availableForPayment.includes(selectedPercentage)) {
    //   return;
    // }

    // setIsSwapping(true);
    // try {
    //   // Simulate delay
    //   await new Promise((resolve) => setTimeout(resolve, 2000));

    //   // Update collected amount in database
    //   const targetAmount = (selectedPercentage / 100) * localOrder.totalAmount;
    //   const newCollectedAmount = targetAmount;

    //   updateCollectedAmountMutation.mutate({
    //     id: localOrder.id,
    //     collectedAmount: newCollectedAmount,
    //   });

    //   // Update local state
    //   setLocalOrder({
    //     ...localOrder,
    //     collectedAmount: newCollectedAmount,
    //     status:
    //       newCollectedAmount >= localOrder.totalAmount ? "completed" : "active",
    //   });
    // } catch (error) {
    //   console.error("Swap failed:", error);
    // } finally {
    //   setIsSwapping(false);
    // }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "expired":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "expired":
        return "Expired";
      default:
        return "Unknown";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group relative z-[1] overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl"
    >
      {/* Status badge */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(localOrder.status)}`}
        >
          {getStatusText(localOrder.status)}
        </span>
        <span className="text-xs text-gray-500">#{localOrder.id}</span>

        {/* Timer */}
        {localOrder.status === "active" && (
          <OrderTimer
            expiresAt={localOrder.expiresAt}
            onExpire={handleExpire}
          />
        )}
      </div>

      {/* Token swap info */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {/* From token */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <TokenLogo
                symbol={localOrder.fromToken.symbol}
                className="h-10 w-10"
              />
              <div className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white bg-blue-500"></div>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {localOrder.fromToken.symbol}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {localOrder.fromToken.network}
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center">
            <svg
              className="h-6 w-6 text-gray-400"
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
              <p className="font-medium text-gray-900">
                {localOrder.toToken.symbol}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {localOrder.toToken.network}
              </p>
            </div>
            <div className="relative">
              <TokenLogo
                symbol={localOrder.toToken.symbol}
                className="h-10 w-10"
              />
              <div className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white bg-purple-500"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Amount info */}
      <div className="mb-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Amount:</span>
          <span className="font-medium">
            {formatAmount(localOrder.totalAmount)} {localOrder.fromToken.symbol}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Collected:</span>
          <span className="font-medium">
            {formatAmount(localOrder.collectedAmount)}{" "}
            {localOrder.fromToken.symbol}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Remaining:</span>
          <span className="font-medium">
            {formatAmount(remainingAmount)} {localOrder.fromToken.symbol}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span>{progressPercentage.toFixed(1)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full bg-gradient-to-r from-[#8F81F8] to-[#7C6EF8]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Partial payment section - only for active orders */}
      {localOrder.status === "active" && remainingAmount > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Fill to:</p>
          </div>

          {/* Percentage buttons */}
          <div className="mb-4 flex gap-2">
            {[25, 50, 75, 100].map((percentage) => {
              const isAvailable = availableForPayment.includes(percentage);
              const amountForPercentage =
                (percentage / 100) * localOrder.totalAmount;
              const amountToAdd =
                amountForPercentage - localOrder.collectedAmount;

              return (
                <button
                  key={percentage}
                  onClick={() =>
                    isAvailable && setSelectedPercentage(percentage)
                  }
                  disabled={!isAvailable}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${
                    !isAvailable
                      ? "cursor-not-allowed bg-gray-50 text-gray-400"
                      : selectedPercentage === percentage
                        ? "bg-gradient-to-r from-[#8F81F8] to-[#7C6EF8] text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={
                    !isAvailable
                      ? `Already collected: ${formatAmount(localOrder.collectedAmount)}`
                      : undefined
                  }
                >
                  {percentage === 100 ? "All" : `${percentage}%`}
                </button>
              );
            })}
          </div>

          {/* Amount to pay */}
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-xs text-gray-600">Amount to pay:</p>
            <p className="text-lg font-bold text-gray-900">
              {formatAmount(
                (selectedPercentage / 100) * localOrder.totalAmount -
                  localOrder.collectedAmount,
              )}{" "}
              {localOrder.fromToken.symbol}
            </p>
          </div>
        </div>
      )}

      {/* Swap button */}
      {localOrder.status === "active" && remainingAmount > 0 && (
        <motion.button
          onClick={handleSwap}
          disabled={
            isSwapping || !availableForPayment.includes(selectedPercentage)
          }
          className={`w-full rounded-xl px-4 py-3 font-medium text-white transition-all duration-200 ${
            isSwapping || !availableForPayment.includes(selectedPercentage)
              ? "cursor-not-allowed bg-gray-400"
              : "bg-gradient-to-r from-[#8F81F8] to-[#7C6EF8] hover:scale-[1.02] hover:shadow-lg"
          }`}
          whileHover={!isSwapping ? { scale: 1.02 } : {}}
          whileTap={!isSwapping ? { scale: 0.98 } : {}}
        >
          {isSwapping ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Processing...</span>
            </div>
          ) : (
            `Swap ${selectedPercentage === 100 ? "All" : `${selectedPercentage}%`}`
          )}
        </motion.button>
      )}

      {/* Completed message */}
      {localOrder.status === "completed" && (
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <p className="text-sm font-medium text-green-800">
            Order completed successfully!
          </p>
        </div>
      )}
    </motion.div>
  );
}

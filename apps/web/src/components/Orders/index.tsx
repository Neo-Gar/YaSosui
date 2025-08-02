"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { SortOption } from "@/lib/types/IOrder";
import OrderCard from "./OrderCard";

export default function OrdersPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<
    "all" | "active" | "completed" | "expired"
  >("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Get orders with infinity scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = api.orders.getAll.useInfiniteQuery(
    {
      status: filter,
      sortBy,
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Combine all pages into one array
  const orders = data?.pages.flatMap((page) => page.items) ?? [];

  // Infinity scroll handler
  useEffect(() => {
    const ordersContainer = document.querySelector("[data-orders-container]");

    const handleScroll = () => {
      if (!ordersContainer) return;

      const { scrollTop, scrollHeight, clientHeight } =
        ordersContainer as HTMLElement;

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }
    };

    ordersContainer?.addEventListener("scroll", handleScroll);
    return () => ordersContainer?.removeEventListener("scroll", handleScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-light tracking-tight text-black">
            Loading your orders...
          </h1>
          <p className="text-lg font-light text-gray-600">
            Please wait while we fetch your orders
          </p>
          <div className="mt-8 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8F81F8] border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-light tracking-tight text-black">
            Error
          </h1>
          <p className="text-lg font-light text-red-600">
            Failed to load orders: {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header - Fixed */}
      <div className="relative z-30 flex-shrink-0 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-7xl"
        >
          {/* Back button */}
          <motion.button
            onClick={() => router.push("/")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mr-auto mb-4 cursor-pointer px-3 py-1 text-base text-gray-600 transition-colors hover:text-gray-800"
          >
            ← Back
          </motion.button>

          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-light tracking-tight text-black">
              Current Orders
            </h1>
            <p className="text-lg font-light text-gray-600">
              Manage your active swap orders
            </p>
          </div>

          {/* Filter and Sort Controls */}
          <div className="mb-8 space-y-4">
            {/* Filter tabs */}
            <div className="flex justify-center">
              <div className="flex rounded-full bg-white p-1 shadow-lg">
                {[
                  { key: "all", label: "All Orders" },
                  { key: "active", label: "Active" },
                  { key: "completed", label: "Completed" },
                  { key: "expired", label: "Expired" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`rounded-full px-6 py-2 text-sm font-medium transition-all duration-200 ${
                      filter === tab.key
                        ? "bg-gradient-to-r from-[#8F81F8] to-[#7C6EF8] text-white shadow-md"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort dropdown */}
            <div className="flex justify-center">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="focus:ring-opacity-50 appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2 pr-8 text-sm font-medium text-gray-700 shadow-sm focus:border-[#8F81F8] focus:ring-2 focus:ring-[#8F81F8] focus:outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount-high">Amount: High to Low</option>
                  <option value="amount-low">Amount: Low to High</option>
                  <option value="progress-high">Progress: High to Low</option>
                  <option value="progress-low">Progress: Low to High</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Orders container - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-8" data-orders-container>
        <div className="mx-auto max-w-7xl">
          {/* Orders grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>

          {/* Loading indicator for infinity scroll */}
          {isFetchingNextPage && (
            <div className="mt-8 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8F81F8] border-t-transparent"></div>
            </div>
          )}

          {/* Empty state */}
          {orders.length === 0 && !isFetchingNextPage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-16 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No orders found
              </h3>
              <p className="text-gray-500">
                {filter === "all"
                  ? "You don't have any orders yet."
                  : `No ${filter} orders found.`}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

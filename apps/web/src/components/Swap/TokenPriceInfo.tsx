import { motion } from "motion/react";
import { api } from "@/trpc/react";

interface TokenPriceInfoProps {
  tokenSymbol: string;
  tokenName: string;
}

export default function TokenPriceInfo({
  tokenSymbol,
  tokenName,
}: TokenPriceInfoProps) {
  const marketDataQuery = api.coingecko.getTokenMarketData.useQuery(
    { tokenSymbol },
    {
      refetchInterval: 60000,
      staleTime: 30000,
    },
  );

  const marketData = marketDataQuery.data?.marketData;
  const isLoading = marketDataQuery.isLoading;

  if (!marketData && !isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 rounded-lg border border-gray-200 bg-white p-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900">{tokenName}</div>
          <div className="text-xs text-gray-500">{tokenSymbol}</div>
        </div>

        <div className="text-right">
          {isLoading ? (
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
          ) : (
            <>
              <div className="text-sm font-semibold text-gray-900">
                ${marketData?.current_price?.toFixed(2) || "0.00"}
              </div>
              {marketData?.price_change_percentage_24h !== null &&
                marketData?.price_change_percentage_24h !== undefined && (
                  <div
                    className={`text-xs ${
                      marketData.price_change_percentage_24h >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {marketData.price_change_percentage_24h >= 0 ? "+" : ""}
                    {marketData.price_change_percentage_24h.toFixed(2)}%
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

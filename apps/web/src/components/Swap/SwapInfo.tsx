import { motion } from "motion/react";

interface SwapInfoProps {
  fromNetwork: string;
  toNetwork: string;
  fromToken: string;
  toToken: string;
  rate: string;
  fee?: string;
  slippage?: string;
  isLoading?: boolean;
}

export default function SwapInfo({
  fromNetwork,
  toNetwork,
  fromToken,
  toToken,
  rate,
  fee = "0.1%",
  slippage = "0.5%",
  isLoading = false,
}: SwapInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg bg-gray-50 p-3"
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">From:</span>
          <span className="font-medium text-gray-900">{fromNetwork}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">To:</span>
          <span className="font-medium text-gray-900">{toNetwork}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Rate:</span>
          <span className="font-medium text-gray-900">
            {isLoading ? (
              <div className="flex items-center space-x-1">
                <div className="h-3 w-3 animate-spin rounded-full border border-blue-500 border-t-transparent"></div>
                <span>Loading...</span>
              </div>
            ) : (
              rate
            )}
          </span>
        </div>
      </div>

      <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2">
        <div className="text-sm text-blue-800">💡 Powered by Fusion+</div>
      </div>
    </motion.div>
  );
}

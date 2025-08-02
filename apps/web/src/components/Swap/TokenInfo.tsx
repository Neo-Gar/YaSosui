import { motion } from "motion/react";
import { TokenLogo } from "../TokenLogo";

interface TokenInfoProps {
  symbol: string;
  name: string;
  network: string;
  amount?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function TokenInfo({
  symbol,
  name,
  network,
  amount,
  isSelected = false,
  onClick,
}: TokenInfoProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center space-x-2 rounded p-2 transition-all ${
        isSelected
          ? "border border-blue-200 bg-blue-50"
          : "border border-gray-200 bg-white hover:bg-gray-50"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex-shrink-0">
        <TokenLogo symbol={symbol} className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-1">
          <span className="text-base font-semibold text-gray-900">
            {symbol}
          </span>
          <span className="rounded bg-gray-100 px-1 py-0.5 text-sm text-gray-500">
            {network}
          </span>
        </div>
        <div className="truncate text-sm text-gray-600">{name}</div>
        {amount && (
          <div className="mt-0.5 text-sm text-gray-500">Balance: {amount}</div>
        )}
      </div>
    </motion.div>
  );
}

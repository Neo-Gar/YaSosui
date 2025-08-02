import { memo } from "react";
import { EthLogo } from "./shared/assets/eth-logo";
import { SuiLogo } from "./shared/assets/sui-logo";
import { UsdtLogo } from "./shared/assets/usdt-logo";
import { UsdcLogo } from "./shared/assets/usdc-logo";

export const TokenLogo = memo(
  ({ symbol, className }: { symbol: string; className: string }) => {
    const logoMap: Record<
      string,
      React.ComponentType<{ className: string }>
    > = {
      ETH: EthLogo,
      SUI: SuiLogo,
      USDT: UsdtLogo,
      USDC: UsdcLogo,
    };

    const LogoComponent = logoMap[symbol.toUpperCase()];

    if (!LogoComponent) {
      // Fallback for unknown tokens
      return (
        <div
          className={`flex items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 ${className}`}
        >
          {symbol.slice(0, 2).toUpperCase()}
        </div>
      );
    }

    return <LogoComponent className={className} />;
  },
);

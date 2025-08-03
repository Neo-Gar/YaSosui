import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

// CoinGecko API base URL
const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

// Token mappings for CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  ETH: "ethereum",
  wETH: "weth",
  USDT: "tether",
  USDC: "usd-coin",
  DAI: "dai",
  SUI: "sui",
};

// Helper function for API requests
async function fetchFromCoinGecko(endpoint: string): Promise<any> {
  try {
    const response = await fetch(`${COINGECKO_API_BASE}${endpoint}`);

    if (response.status === 429) {
      throw new Error("CoinGecko rate limit exceeded");
    }

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching from CoinGecko:", error);
    throw error;
  }
}

export const coingeckoRouter = createTRPCRouter({
  // Get token price in USD
  getTokenPrice: publicProcedure
    .input(
      z.object({
        tokenSymbol: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const tokenId = SYMBOL_TO_COINGECKO_ID[input.tokenSymbol];
      if (!tokenId) {
        return { price: null, error: "Token not supported" };
      }

      try {
        const data = await fetchFromCoinGecko(
          `/simple/price?ids=${tokenId}&vs_currencies=usd`,
        );
        const price = data?.[tokenId]?.usd || null;

        return { price, error: null };
      } catch (error) {
        return { price: null, error: "Failed to fetch price" };
      }
    }),

  // Get exchange rate between two tokens
  getExchangeRate: publicProcedure
    .input(
      z.object({
        fromTokenSymbol: z.string(),
        toTokenSymbol: z.string(),
      }),
    )
    .query(async ({ input }) => {
      // Handle same token case
      if (input.fromTokenSymbol === input.toTokenSymbol) {
        return { rate: 1.0, error: null };
      }

      const fromTokenId = SYMBOL_TO_COINGECKO_ID[input.fromTokenSymbol];
      const toTokenId = SYMBOL_TO_COINGECKO_ID[input.toTokenSymbol];

      if (!fromTokenId || !toTokenId) {
        return { rate: null, error: "One or both tokens not supported" };
      }

      try {
        const data = await fetchFromCoinGecko(
          `/simple/price?ids=${fromTokenId},${toTokenId}&vs_currencies=usd`,
        );

        const fromPrice = data?.[fromTokenId]?.usd;
        const toPrice = data?.[toTokenId]?.usd;

        if (!fromPrice || !toPrice) {
          return { rate: null, error: "Price data not available" };
        }

        const rate = toPrice / fromPrice;
        return { rate, error: null };
      } catch (error) {
        return { rate: null, error: "Failed to fetch exchange rate" };
      }
    }),

  // Get multiple token prices
  getMultipleTokenPrices: publicProcedure
    .input(
      z.object({
        tokenSymbols: z.array(z.string()),
      }),
    )
    .query(async ({ input }) => {
      const tokenIds = input.tokenSymbols
        .map((symbol) => SYMBOL_TO_COINGECKO_ID[symbol])
        .filter(Boolean);

      if (tokenIds.length === 0) {
        return { prices: {}, error: "No supported tokens provided" };
      }

      try {
        const data = await fetchFromCoinGecko(
          `/simple/price?ids=${tokenIds.join(",")}&vs_currencies=usd`,
        );

        const prices: Record<string, number> = {};
        input.tokenSymbols.forEach((symbol) => {
          const tokenId = SYMBOL_TO_COINGECKO_ID[symbol];
          if (tokenId && data?.[tokenId]?.usd) {
            prices[symbol] = data[tokenId].usd;
          }
        });

        return { prices, error: null };
      } catch (error) {
        return { prices: {}, error: "Failed to fetch prices" };
      }
    }),

  // Get token market data
  getTokenMarketData: publicProcedure
    .input(
      z.object({
        tokenSymbol: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const tokenId = SYMBOL_TO_COINGECKO_ID[input.tokenSymbol];
      if (!tokenId) {
        return { marketData: null, error: "Token not supported" };
      }

      try {
        const data = await fetchFromCoinGecko(
          `/coins/${tokenId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
        );

        return {
          marketData: {
            current_price: data?.market_data?.current_price?.usd,
            price_change_percentage_24h:
              data?.market_data?.price_change_percentage_24h,
            market_cap: data?.market_data?.market_cap?.usd,
            total_volume: data?.market_data?.total_volume?.usd,
          },
          error: null,
        };
      } catch (error) {
        return { marketData: null, error: "Failed to fetch market data" };
      }
    }),

  // Get trending tokens
  getTrendingTokens: publicProcedure.query(async () => {
    try {
      const data = await fetchFromCoinGecko("/search/trending");
      const trending =
        data?.coins?.map((coin: any) => ({
          id: coin.item.id,
          symbol: coin.item.symbol,
          name: coin.item.name,
          price: coin.item.price_btc,
        })) || [];

      return { trending, error: null };
    } catch (error) {
      return { trending: [], error: "Failed to fetch trending tokens" };
    }
  }),
});

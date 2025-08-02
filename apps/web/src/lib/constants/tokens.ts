export const TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    logo: "/usdc-logo.svg",
    networks: ["ethereum", "sui"] as const,
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    logo: "/usdt-logo.svg",
    networks: ["ethereum", "sui"] as const,
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    logo: "/eth-logo.svg",
    networks: ["ethereum"] as const,
  },
  SUI: {
    symbol: "SUI",
    name: "Sui",
    logo: "/sui-logo.svg",
    networks: ["sui"] as const,
  },
} as const;

export type TokenKey = keyof typeof TOKENS;
export type Network = "ethereum" | "sui";

export const NETWORKS = [
  { id: "ethereum", name: "Ethereum", logo: "ETH", color: "bg-blue-500" },
  { id: "sui", name: "Sui", logo: "SUI", color: "bg-purple-500" },
] as const;

export const getTokenInfo = (tokenKey: TokenKey, network: Network) => {
  if (!(tokenKey in TOKENS)) {
    throw new Error(`Unknown token: ${tokenKey}`);
  }

  const token = TOKENS[tokenKey];
  if (!(token.networks as readonly string[]).includes(network)) {
    throw new Error(`Token ${tokenKey} is not available on network ${network}`);
  }
  return {
    ...token,
    network,
  };
};

export const getAvailableTokensForNetwork = (network: Network) => {
  return Object.entries(TOKENS)
    .filter(([_, token]) =>
      (token.networks as readonly string[]).includes(network),
    )
    .map(([key, token]) => ({
      key: key as TokenKey,
      ...token,
      network,
    }));
};

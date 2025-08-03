export type Network = "ethereum" | "sui" | "unknown";
interface IToken {
  symbol: string;
  name: string;
  logo: string;
  address: string;
  network: Network;
}

export const UNKNOWN_TOKEN: IToken = {
  symbol: "?",
  name: "unknown",
  logo: "/usdt-logo.svg",
  address: "0x0000000000000000000000000000000000000000",
  network: "unknown",
};

export const TOKENS: IToken[] = [
  {
    symbol: "wETH",
    name: "Wrapped Ethereum",
    logo: "/eth-logo.svg",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    // address: "0x6162C34111986F36E18DBD381CB35bd1e2169B46",
    network: "ethereum",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    logo: "/usdc-logo.svg",
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
    // address: "0x6162C34111986F36E18DBD381CB35bd1e2169B46",
    network: "ethereum",
  },
  {
    symbol: "USDT",
    name: "ERC-20 USDT",
    logo: "/usdt-logo.svg",
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    network: "ethereum",
  },
  {
    symbol: "SUI",
    name: "Sui",
    logo: "/sui-logo.svg",
    // address: "0x2::sui::SUI",
    address: "0x0000000000000000000000000000000000000001", // for debug
    network: "sui",
  },
  {
    symbol: "USDC",
    name: "SUI USDC",
    logo: "/usdc-logo.svg",
    address:
      "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::USDC",
    network: "sui",
  },
  {
    symbol: "USDT",
    name: "SUI USDT",
    logo: "/usdt-logo.svg",
    address:
      "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::USDT",
    network: "sui",
  },
];

export const NETWORKS = [
  { id: "ethereum", name: "Ethereum", logo: "ETH", color: "bg-blue-500" },
  { id: "sui", name: "Sui", logo: "SUI", color: "bg-purple-500" },
] as const;

// Функция для получения токена по адресу и сети
export const getTokenByAddress = (address: string, network: Network) => {
  const token = TOKENS.find(
    (token) =>
      token.address.toLowerCase() === address.toLowerCase() &&
      token.network === network,
  );

  if (!token) {
    console.log("Token not found for address", address, "on network", network);
    return UNKNOWN_TOKEN;
  }

  return token;
};

// Функция для получения токена по символу и сети (для обратной совместимости)
export const getTokenBySymbol = (symbol: string, network: Network) => {
  const token = TOKENS.find(
    (token) => token.symbol === symbol && token.network === network,
  );

  if (!token) {
    console.log("Token not found for symbol", symbol, "on network", network);
    return UNKNOWN_TOKEN;
  }

  return token;
};

// Функция для получения всех доступных токенов для сети
export const getAvailableTokensForNetwork = (network: Network) => {
  return TOKENS.filter((token) => token.network === network);
};

// Функция для получения токенов из другой сети
export const getTokensFromDifferentNetwork = (currentNetwork: Network) => {
  return TOKENS.filter((token) => token.network !== currentNetwork);
};

// Функция для проверки существования токена по адресу
export const isTokenAddressValid = (address: string, network: Network) => {
  return TOKENS.some(
    (token) =>
      token.address.toLowerCase() === address.toLowerCase() &&
      token.network === network,
  );
};

import { type IToken } from "./types/IToken";
import { type INetwork } from "./types/INetwork";

export const AVAILABLE_TOKENS: IToken[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    logo: "ETH",
    network: "ethereum",
    address: "0x0000000000000000000000000000000000000000",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    logo: "USDT",
    network: "ethereum",
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    logo: "USDC",
    network: "ethereum",
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
  {
    symbol: "SUI",
    name: "Sui",
    logo: "SUI",
    network: "sui",
    address: "0x2::sui::SUI",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    logo: "USDT",
    network: "sui",
    address: "0x2::usdt::USDT",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    logo: "USDC",
    network: "sui",
    address: "0x2::usdc::USDC",
  },
];

export const NETWORKS: INetwork[] = [
  { id: "ethereum", name: "Ethereum", logo: "ETH", color: "bg-blue-500" },
  { id: "sui", name: "Sui", logo: "SUI", color: "bg-purple-500" },
];

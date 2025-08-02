export interface IToken {
  symbol: string;
  name: string;
  logo: string;
  network: "ethereum" | "sui";
  address: string;
}

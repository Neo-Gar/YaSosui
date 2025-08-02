export interface IToken {
  symbol: string;
  name: string;
  logo: string;
  address: string;
  network: "ethereum" | "sui";
}

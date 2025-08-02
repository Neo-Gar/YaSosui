import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { JsonRpcProvider, randomBytes, Wallet } from "ethers";
import resolverContract from "../../../../../packages/solidity/dist/contracts/Resolver.sol/Resolver.json";
import { Resolver } from "../../lib/other/resolver";
import * as Sdk from "@1inch/cross-chain-sdk";
import { NetworkEnum, Address } from "@1inch/fusion-sdk";
import { uint8ArrayToHex } from "@1inch/byte-utils";
import { deploySrcEscrow, withdrawSrc } from "./ResolveDstOrder";
import { deployDistEscrow, withdrawDst } from "./ResolveSrcOrder";

const client = new SuiClient({
  url: "https://fullnode.testnet.sui.io:443",
});

interface OrderParams {
  orderHash: string;
  hashLock: string;
  maker: string;
  taker: string;
  token: string;
  amount: string;
  safetyDeposit: string;
  timeLocks: string;
}

// TODO: Get value
const ethRPCLink = "";
const ethChainId = 1;
const ethProvider = new JsonRpcProvider(ethRPCLink, ethChainId, {
  cacheTimeout: -1,
  staticNetwork: true,
});
const resolverPk = "";
const srcChainResolver = new Wallet(resolverPk, ethProvider);

const suiFactoryTarget: string = ""; // Hardcoded!
const suiFactoryObject: string = ""; // Hardcoded!
const paymentCoin = ""; // Hardcoded!
const depositToken = ""; // Hardcoded!
const SUI_PRIVATE_KEY = "";
const dstChainResolverKeypair = Ed25519Keypair.fromSecretKey(SUI_PRIVATE_KEY);
const secret = "Secret";

const hexToBytes = (hex: string): number[] => {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16));
  }
  return bytes;
};

export const useExecuteEthToSUI = async () => {
  const executeOrder = async (params: OrderParams, order: any) => {
    await deploySrcEscrow(params, order);
    const escrowId = await deployDistEscrow(params);
    await withdrawDst(escrowId, secret);
    await withdrawSrc();
  };

  return { executeOrder };
};

import * as Sdk from "@1inch/cross-chain-sdk";
import { deploySrcEscrow, withdrawSrc } from "./ResolveSrcETHOrder";
import { deployDistEscrow, withdrawDst } from "./ResolveDstSUIOrder";
import { uint8ArrayToHex } from "@1inch/byte-utils";
import { randomBytes } from "crypto";

const secrets = Array.from({ length: 11 }).map(() =>
  uint8ArrayToHex(randomBytes(32)),
);
const secret = secrets[secrets.length - 1]!;

export const useExecuteEthToSUI = () => {
  const executeOrder = async (
    order: Sdk.CrossChainOrder,
    orderHash: string,
    signature: string,
  ) => {
    await deploySrcEscrow(order, signature, secrets);
    const escrowId = await deployDistEscrow(order, orderHash);
    await withdrawDst(escrowId, secret);
    // await withdrawSrc(secret);
  };

  return { executeOrder };
};

import * as Sdk from "@1inch/cross-chain-sdk";
import { deploySrcEscrow, withdrawSrc } from "./ResolveSrcOrder";
import { deployDistEscrow, withdrawDst } from "./ResolveDstOrder";

const secret = "Secret";

export const useExecuteEthToSUI = async () => {
  const executeOrder = async (order: Sdk.CrossChainOrder) => {
    await deploySrcEscrow(order);
    const escrowId = await deployDistEscrow(order);
    await withdrawDst(escrowId, secret);
    await withdrawSrc();
  };

  return { executeOrder };
};

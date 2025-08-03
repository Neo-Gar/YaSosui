import * as Sdk from "@1inch/cross-chain-sdk";
import { useETHEscrow } from "./ResolveSrcETHOrder";
import { useDeployDistSUIEscrow } from "./ResolveDstSUIOrder";
import { uint8ArrayToHex } from "@1inch/byte-utils";
import { randomBytes } from "crypto";

export const useExecuteEthToSUI = () => {
  const { deploySrcEscrow, withdrawSrc } = useETHEscrow();
  const { deployDistEscrow, withdrawDst } = useDeployDistSUIEscrow();

  const executeOrder = async (
    order: Sdk.CrossChainOrder,
    orderHash: string,
    signature: string,
    secret: string,
  ) => {
    let { escrowAddress } = await deploySrcEscrow(order, signature, secret);
    const escrowId = await deployDistEscrow(order, orderHash, secret);
    await withdrawDst(escrowId, secret);
    await withdrawSrc(order, escrowAddress, secret);
  };

  return { executeOrder };
};

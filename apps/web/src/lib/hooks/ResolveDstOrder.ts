import { JsonRpcProvider, randomBytes, Wallet } from "ethers";
import { Resolver } from "../../lib/other/resolver";
import * as Sdk from "@1inch/cross-chain-sdk";
import { Address } from "@1inch/fusion-sdk";
import { uint8ArrayToHex } from "@1inch/byte-utils";

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

const ethRPCLink = "";
const ethChainId = 1;
const ethProvider = new JsonRpcProvider(ethRPCLink, ethChainId, {
  cacheTimeout: -1,
  staticNetwork: true,
});
const resolverPk = "";
const srcChainResolver = new Wallet(resolverPk, ethProvider);

export const deploySrcEscrow = async (orderParams: OrderParams, order: any) => {
  const resolverContract = new Resolver("", "");
  const srcChainId = 1;
  const signature = "";
  const takerTraits = {};
  const amount = "";
  const hashLock = "";
  const escrowFactory = "";

  const secrets = Array.from({ length: 11 }).map(() =>
    uint8ArrayToHex(randomBytes(32)),
  );
  const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s));
  const leaves = Sdk.HashLock.getMerkleLeaves(secrets);
  const idx = leaves.length - 1;
  const fillAmount = BigInt(orderParams.amount);

  await srcChainResolver.sendTransaction(
    resolverContract.deploySrc(
      srcChainId,
      order,
      signature,
      Sdk.TakerTraits.default()
        .setExtension(order.extension)
        .setInteraction(
          // Set up multiple fill interaction with Merkle proof
          new Sdk.EscrowFactory(
            new Address(escrowFactory),
          ).getMultipleFillInteraction(
            Sdk.HashLock.getProof(leaves, idx),
            idx,
            secretHashes[idx]!,
          ),
        )
        .setAmountMode(Sdk.AmountMode.maker)
        .setAmountThreshold(order.takingAmount),
      fillAmount,
      Sdk.HashLock.fromString(secretHashes[idx]!),
    ),
  );
};

export const withdrawSrc = async () => {};

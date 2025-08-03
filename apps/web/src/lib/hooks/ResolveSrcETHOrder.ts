import {
  JsonRpcProvider,
  randomBytes,
  Wallet,
  Interface,
  keccak256,
  Contract,
} from "ethers";
import { Resolver } from "../other/resolver";
import * as Sdk from "@1inch/cross-chain-sdk";
import { Address } from "@1inch/fusion-sdk";
import { uint8ArrayToHex } from "@1inch/byte-utils";
import useETHUser from "./ETHUser";

// Import the contract ABIs for parsing events
import ResolverContract from "../../../../../packages/solidity/dist/contracts/Resolver.sol/Resolver.json";
import BaseEscrowFactoryContract from "../../../../../packages/solidity/dist/contracts/BaseEscrowFactory.sol/BaseEscrowFactory.json";
import CustomEscrowFactoryContract from "../../../../../packages/solidity/dist/contracts/CustomEscrowFactory.sol/CustomEscrowFactory.json";
import CustomEscrowSrcContract from "../../../../../packages/solidity/dist/contracts/CustomEscrowSrc.sol/CustomEscrowSrc.json";

const escrowFactoryAddress = "0x55faF22F4ccCccAC99C124816518adAB93b995d5";

export const useETHEscrow = () => {
  const { sendTransaction, connect } = useETHUser();

  const deploySrcEscrow = async (
    order: Sdk.CrossChainOrder,
    signature: string,
    secrets: string[],
  ) => {
    // Create contract interface
    const contractInterface = new Interface(CustomEscrowFactoryContract.abi);

    // Hash the order to get orderHash - need to provide chainId for getOrderHash
    const chainId = 1; // Ethereum mainnet
    const orderHash = order.getOrderHash(chainId);

    // Extract maker from the order
    const maker = order.maker.toString();

    // Extract maker asset and making amount
    const makerAsset = order.makerAsset.toString();
    const makingAmount = order.makingAmount.toString();

    // Extract safety deposit - you may need to adjust based on your order structure
    const safetyDeposit = "0"; // You'll need to determine the correct safety deposit amount

    // Get the first secret hashlock from secrets array with null check
    if (secrets.length === 0) {
      throw new Error("No secrets provided");
    }
    const secretHashlock = keccak256(secrets[secrets.length - 1]!);

    // Encode the function call
    const data = contractInterface.encodeFunctionData("deploySrcEscrow", [
      orderHash,
      maker,
      makerAsset,
      makingAmount,
      safetyDeposit,
      chainId.toString(),
      secretHashlock,
    ]);

    // Send the transaction
    const tx = await sendTransaction({
      to: escrowFactoryAddress,
      data: data,
      value: safetyDeposit, // Send the safety deposit as value
    });

    // Use a public JSON-RPC provider for the read-only contract call
    const provider = new JsonRpcProvider(
      process.env.NEXT_PUBLIC_ETH_RPC_URL || "https://eth.llamarpc.com",
    );

    const contract = new Contract(
      escrowFactoryAddress,
      CustomEscrowFactoryContract.abi,
      provider,
    );

    // Call addressOfEscrowSrc to get the deployed escrow contract address
    if (!contract.addressOfEscrowSrc) {
      throw new Error("addressOfEscrowSrc method not found on contract");
    }

    const escrowAddress = await contract.addressOfEscrowSrc(orderHash);

    return {
      transactionHash: tx,
      escrowAddress: escrowAddress,
      orderHash: orderHash,
    };
  };

  const withdrawSrc = async (
    order: Sdk.CrossChainOrder,
    srcEscrowAddress: string,
    secret: string,
  ) => {
    // Create contract interface for CustomEscrowSrc
    const contractInterface = new Interface(CustomEscrowSrcContract.abi);

    // Extract target address (taker) - this should be the address that will receive the tokens
    // For now, using the current user's address as target, but you may need to pass this as parameter
    const { user } = useETHUser();
    if (!user?.address) {
      throw new Error("User not connected");
    }
    const target = user.address;

    // Extract token and amount from the order
    const token = order.makerAsset.toString();
    const amount = order.makingAmount.toString();

    // Convert string secret to bytes32
    const secretBytes32 = secret;

    // Encode the function call for withdraw
    const data = contractInterface.encodeFunctionData("withdraw", [
      secretBytes32,
      target,
      token,
      amount,
    ]);

    // Send the transaction to the specific escrow contract
    const tx = await sendTransaction({
      to: srcEscrowAddress,
      data: data,
      value: "0", // No value needed for withdraw
    });

    return tx;
  };

  return { deploySrcEscrow, withdrawSrc };
};

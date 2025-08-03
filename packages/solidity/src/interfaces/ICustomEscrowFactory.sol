// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ICustomBaseEscrow} from "./ICustomBaseEscrow.sol";

/**
 * @title CustomEscrowFactory interface for cross-chain atomic swap.
 * @author Alexander Scherbatyuk
 * @notice Simple implementation of 1inch Escrow Factory interface.
 * @dev This interface is used to create escrow contracts for the source and destination chains.
 * @dev This interface is used purely for UniteDeFi 1inch / ETHGlobal hackathon.
 */
interface ICustomEscrowFactory {
    struct ExtraDataArgs {
        bytes32 hashlockInfo; // Hash of the secret or the Merkle tree root if multiple fills are allowed
        uint256 dstChainId;
        address dstToken;
        uint256 deposits;
    }

    struct DstImmutablesComplement {
        address maker;
        uint256 amount;
        address token;
        uint256 safetyDeposit;
        uint256 chainId;
    }

    error InsufficientEscrowBalance();
    error InvalidCreationTime();
    error InvalidPartialFill();
    error InvalidSecretsAmount();

    /**
     * @notice Emitted on EscrowSrc deployment to recreate EscrowSrc and EscrowDst immutables off-chain.
     * @param escrow The address of the created escrow.
     * @param orderHash The hash of the order.
     * @param sender The address of the sender.
     * @param dstImmutablesComplement Additional immutables related to the escrow contract on the destination chain.
     */
    event SrcEscrowCreated(
        address escrow, bytes32 orderHash, address sender, DstImmutablesComplement dstImmutablesComplement
    );

    /**
     * @notice Emitted on EscrowDst deployment.
     * @param escrow The address of the created escrow.
     * @param orderHash The hash of the order.
     * @param sender The address of the sender.
     */
    event DstEscrowCreated(address escrow, bytes32 orderHash, address sender);

    /**
     * @notice Creates a new source escrow contract.
     * @param orderHash The hash of the order.
     * @param maker The address of the maker.
     * @param makerAsset The maker's asset address.
     * @param makingAmount The amount of tokens to be filled.
     * @param safetyDeposit The safety deposit amount in native tokens.
     * @param chainId The chain ID.
     * @param secretHashlock The hashlock for the secret.
     */
    function deploySrcEscrow(
        bytes32 orderHash,
        address maker,
        address makerAsset,
        uint256 makingAmount,
        uint256 safetyDeposit,
        uint256 chainId,
        bytes32 secretHashlock
    ) external payable;

    /**
     * @notice Creates a new escrow contract for taker on the destination chain.
     * @dev The caller must send the safety deposit in the native token along with the function call
     * and approve the destination token to be transferred to the created escrow.
     * @param token The token address to be deposited.
     * @param amount The amount of tokens to be deposited.
     * @param safetyDeposit The safety deposit amount in native tokens.
     * @param orderHash The hashlock for the order.
     * @param secretHashlock The hashlock for the secret.
     */
    function deployDstEscrow(
        address token,
        uint256 amount,
        uint256 safetyDeposit,
        bytes32 orderHash,
        bytes32 secretHashlock
    ) external payable;

    /**
     * @notice Returns the address of implementation on the source chain.
     * @return The address of implementation on the source chain.
     */
    function getEscrowSrcImplementation() external view returns (address);

    /**
     * @notice Returns the address of implementation on the destination chain.
     * @return The address of implementation on the destination chain.
     */
    function getEscrowDstImplementation() external view returns (address);

    /**
     * @notice Returns the deterministic address of the source escrow based on the salt.
     * @param orderHash The order hash used to compute the salt.
     * @return The computed address of the escrow.
     */
    function addressOfEscrowSrc(bytes32 orderHash) external view returns (address);

    /**
     * @notice Returns the deterministic address of the destination escrow based on the salt.
     * @param orderHash The order hash used to compute the salt.
     * @return The computed address of the escrow.
     */
    function addressOfEscrowDst(bytes32 orderHash) external view returns (address);
}

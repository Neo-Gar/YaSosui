// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {CustomEscrowSrc} from "./CustomEscrowSrc.sol";
import {CustomEscrowDst} from "./CustomEscrowDst.sol";
import {ICustomEscrowFactory} from "./interfaces/ICustomEscrowFactory.sol";
import {ProxyHashLib} from "./ProxyHashLib.sol";
import {Create2} from "openzeppelin-contracts/contracts/utils/Create2.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Clones} from "openzeppelin-contracts/contracts/proxy/Clones.sol";

/**
 * @title CustomEscrowFactory
 * @author Alexander Scherbatyuk
 * @notice CustomEscrowFactory is a factory contract for creating escrow contracts for cross-chain atomic swap.
 * @dev This contract is used to create escrow contracts for the source and destination chains.
 * @dev This contract is used purely for UniteDeFi 1inch / ETHGlobal hackathon.
 */
contract CustomEscrowFactory is ICustomEscrowFactory {
    using SafeERC20 for IERC20;
    using Clones for address;

    address private immutable ESCROW_SRC_IMPLEMENTATION;
    address private immutable ESCROW_DST_IMPLEMENTATION;
    bytes32 internal immutable _PROXY_SRC_BYTECODE_HASH;
    bytes32 internal immutable _PROXY_DST_BYTECODE_HASH;

    constructor() {
        ESCROW_SRC_IMPLEMENTATION = address(new CustomEscrowSrc());
        ESCROW_DST_IMPLEMENTATION = address(new CustomEscrowDst());
        _PROXY_SRC_BYTECODE_HASH = ProxyHashLib.computeProxyBytecodeHash(ESCROW_SRC_IMPLEMENTATION);
        _PROXY_DST_BYTECODE_HASH = ProxyHashLib.computeProxyBytecodeHash(ESCROW_DST_IMPLEMENTATION);
    }

    function deploySrcEscrow(
        bytes32 orderHash,
        address maker,
        address makerAsset,
        uint256 makingAmount,
        uint256 safetyDeposit,
        uint256 chainId,
        bytes32 secretHashlock
    ) external payable {
        DstImmutablesComplement memory immutablesComplement = DstImmutablesComplement({
            maker: maker,
            amount: makingAmount,
            token: makerAsset,
            safetyDeposit: safetyDeposit,
            chainId: chainId
        });

        bytes32 salt = orderHash;

        address escrow = _deployEscrow(salt, msg.value, ESCROW_SRC_IMPLEMENTATION);

        CustomEscrowSrc(escrow).setHashlock(secretHashlock);

        emit SrcEscrowCreated(escrow, orderHash, msg.sender, immutablesComplement);

        if (makerAsset != address(0)) {
            IERC20(makerAsset).safeTransferFrom(address(maker), escrow, makingAmount);
        }

        if (
            escrow.balance < safetyDeposit
                || (makerAsset != address(0) && IERC20(makerAsset).balanceOf(escrow) < makingAmount)
        ) {
            revert InsufficientEscrowBalance();
        }
    }

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
    ) external payable {
        uint256 nativeAmount = safetyDeposit;
        if (token == address(0)) {
            nativeAmount += amount;
        }
        if (msg.value != nativeAmount) revert InsufficientEscrowBalance();

        bytes32 salt = orderHash;
        address escrow = _deployEscrow(salt, msg.value, ESCROW_DST_IMPLEMENTATION);

        CustomEscrowDst(escrow).setHashlock(secretHashlock);

        if (token != address(0)) {
            IERC20(token).safeTransferFrom(msg.sender, escrow, amount);
        }

        emit DstEscrowCreated(escrow, orderHash, msg.sender);
    }

    /**
     * @notice Deploys a new escrow contract.
     * @param salt The salt for the deterministic address computation.
     * @param value The value to be sent to the escrow contract.
     * @param implementation Address of the implementation.
     * @return escrow The address of the deployed escrow contract.
     */
    function _deployEscrow(bytes32 salt, uint256 value, address implementation)
        internal
        virtual
        returns (address escrow)
    {
        escrow = implementation.cloneDeterministic(salt, value);
    }

    /**
     * @notice Checks if the partial fill is valid.
     * @param makingAmount The amount of tokens to be filled.
     * @param remainingMakingAmount The remaining amount of tokens to be filled.
     * @param orderMakingAmount The amount of tokens to be filled in the order.
     * @param partsAmount The number of parts in the order.
     * @param validatedIndex The index of the validated fill.
     */
    function _isValidPartialFill(
        uint256 makingAmount,
        uint256 remainingMakingAmount,
        uint256 orderMakingAmount,
        uint256 partsAmount,
        uint256 validatedIndex
    ) internal pure returns (bool) {
        uint256 calculatedIndex =
            (orderMakingAmount - remainingMakingAmount + makingAmount - 1) * partsAmount / orderMakingAmount;

        if (remainingMakingAmount == makingAmount) {
            // The last secret must be used for the last fill.
            return (calculatedIndex + 2 == validatedIndex);
        } else if (orderMakingAmount != remainingMakingAmount) {
            // Calculate the previous fill index only if this is not the first fill.
            uint256 prevCalculatedIndex =
                (orderMakingAmount - remainingMakingAmount - 1) * partsAmount / orderMakingAmount;
            if (calculatedIndex == prevCalculatedIndex) return false;
        }

        return calculatedIndex + 1 == validatedIndex;
    }

    /**
     * @notice Returns the address of the source escrow.
     * @param orderHash The hash of the order.
     * @return The address of the source escrow.
     */
    function addressOfEscrowSrc(bytes32 orderHash) external view returns (address) {
        return Create2.computeAddress(orderHash, _PROXY_SRC_BYTECODE_HASH);
    }

    /**
     * @notice Returns the address of the destination escrow.
     * @param orderHash The hash of the order.
     * @return The address of the destination escrow.
     */
    function addressOfEscrowDst(bytes32 orderHash) external view returns (address) {
        return Create2.computeAddress(orderHash, _PROXY_DST_BYTECODE_HASH);
    }

    /**
     * @notice Returns the address of the source escrow implementation.
     * @return The address of the source escrow implementation.
     */
    function getEscrowSrcImplementation() external view returns (address) {
        return ESCROW_SRC_IMPLEMENTATION;
    }

    /**
     * @notice Returns the address of the destination escrow implementation.
     * @return The address of the destination escrow implementation.
     */
    function getEscrowDstImplementation() external view returns (address) {
        return ESCROW_DST_IMPLEMENTATION;
    }
}

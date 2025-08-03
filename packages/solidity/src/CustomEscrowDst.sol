// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {CustomBaseEscrow} from "./CustomBaseEscrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CustomEscrowDst
 * @author Alexander Scherbatyuk
 * @notice CustomEscrowDst is a custom escrow contract for the destination chain.
 * @dev This contract is used to create escrow contracts for the destination chain.
 * @dev This contract is used purely for UniteDeFi 1inch / ETHGlobal hackathon.
 */
contract CustomEscrowDst is CustomBaseEscrow {
    using SafeERC20 for IERC20;

    constructor() CustomBaseEscrow() {}
    /**
     * @dev Transfers ERC20 tokens to the target and native tokens to the caller.
     * @param secret The secret that unlocks the escrow.
     * @param target The address to transfer ERC20 tokens to.
     */

    function withdraw(bytes32 secret, address target, address token, uint256 amount)
        external
        override
        onlyValidSecret(secret)
    {
        if (token == address(0)) {
            /**
             * @dev The result of the call is not checked intentionally. This is done to ensure that
             * even in case of malicious receiver the withdrawal flow can not be blocked and takers
             * will be able to get their safety deposit back.
             *
             */
            (bool success,) = target.call{value: amount}("");
            if (!success) revert NativeTokenSendingFailure();
        } else {
            IERC20(token).safeTransfer(target, amount);
        }
        _ethTransfer(msg.sender, address(this).balance);
        emit Withdrawal(secret);
    }

    /**
     * @dev Transfers ERC20 tokens to the maker and native tokens to the caller.
     * @param user The address of the taker.
     * @param token The address of the token to transfer.
     * @param amount The amount of tokens to transfer.
     */
    function cancel(address user, address token, uint256 amount) external override {
        _uniTransfer(token, user, amount);
        _ethTransfer(msg.sender, amount);
        emit EscrowCancelled();
    }
}

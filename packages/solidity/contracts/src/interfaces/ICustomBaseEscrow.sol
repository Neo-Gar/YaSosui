// SPDX-License-Identifier: MIT

pragma solidity ^0.8.23;

/**
 * @title CustomBaseEscrow interface for cross-chain atomic swap.
 * @author Alexander Scherbatyuk
 * @notice Simple implementation of BaseEscrow interface.
 * @dev This interface is used to create escrow contracts for the source and destination chains.
 * @dev This interface is used purely for UniteDeFi 1inch / ETHGlobal hackathon.
 */
interface ICustomBaseEscrow {
    /**
     * @notice Emitted on escrow cancellation.
     */
    event EscrowCancelled();

    /**
     * @notice Emitted when funds are rescued.
     * @param token The address of the token rescued. Zero address for native token.
     * @param amount The amount of tokens rescued.
     */
    event FundsRescued(address token, uint256 amount);

    /**
     * @notice Emitted on successful withdrawal.
     * @param secret The secret that unlocks the escrow.
     */
    event Withdrawal(bytes32 secret);

    error InvalidCaller();
    error InvalidImmutables();
    error InvalidSecret();
    error InvalidTime();
    error InvalidFactory();
    error NativeTokenSendingFailure();

    /**
     * @notice Returns the address of the factory that created the escrow.
     */
    function getFactoryAddress() external view returns (address);

    /**
     * @notice Withdraws funds to a predetermined recipient.
     * @dev Withdrawal can only be made with secret with hash matches the hashlock.
     * The safety deposit is sent to the caller.
     * @param secret The secret that unlocks the escrow.
     * @param target The address to transfer ERC20 tokens to.
     * @param token The address of the token to transfer.
     * @param amount The amount of tokens to transfer.
     */
    function withdraw(bytes32 secret, address target, address token, uint256 amount) external;

    /**
     * @notice Cancels the escrow and returns tokens to a predetermined recipient.
     * @dev The escrow can only be cancelled.
     * The safety deposit is sent to the caller.
     * @param user The address of the user ether maker or taker.
     * @param token The address of the token to rescue. Zero address for native token.
     * @param amount The amount of tokens to rescue.
     */
    function cancel(address user, address token, uint256 amount) external;

    /**
     * @notice Rescues funds from the escrow.
     * @dev Funds can only be rescued.
     * @param token The address of the token to rescue. Zero address for native token.
     * @param amount The amount of tokens to rescue.
     */
    function rescueFunds(address token, uint256 amount) external;
}

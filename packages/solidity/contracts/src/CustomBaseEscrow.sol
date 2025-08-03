// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {ICustomBaseEscrow} from "./interfaces/ICustomBaseEscrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CustomBaseEscrow
 * @author Alexander Scherbatyuk
 * @notice This contract is a custom implementation of the 1inch BaseEscrow contract.
 * @dev This contract is used to create a custom escrow for the cross-chain swap.
 * @dev This contract is simple implementation of the 1inch BaseEscrow contract.
 * @dev This contract is only for the UniteDeFi 1inch / ETHGlobal hackathon.
 */
contract CustomBaseEscrow is ICustomBaseEscrow {
    using SafeERC20 for IERC20;

    address private immutable i_factoryAdress = msg.sender;
    bytes32 private s_hashlock;

    constructor() {
        i_factoryAdress = msg.sender;
    }

    /**
     * @dev This modifier is used to check if the secret is valid.
     * @param secret The secret that unlocks the escrow.
     */
    modifier onlyValidSecret(bytes32 secret) {
        if (_keccakBytes32(secret) != s_hashlock) revert InvalidSecret();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != i_factoryAdress) revert InvalidFactory();
        _;
    }

    function setHashlock(bytes32 hashlock) external onlyFactory {
        s_hashlock = hashlock;
    }

    /**
     * @notice Rescues funds from the escrow.
     * @dev This is a custom implementation of the 1inch BaseEscrow contract.
     * @dev This function is used to rescue funds from the escrow.
     * @dev This function does not have check and allow to rescue funds from the escrow to any msg.sender.
     * @param token The address of the token to rescue. Zero address for native token.
     * @param amount The amount of tokens to rescue.
     */
    function rescueFunds(address token, uint256 amount) external {
        _uniTransfer(token, msg.sender, amount);
        emit FundsRescued(token, amount);
    }

    /**
     * @notice Withdraws funds to a predetermined recipient.
     * @dev Withdrawal can only be made with secret with hash matches the hashlock.
     * @param secret The secret that unlocks the escrow.
     */
    function withdraw(bytes32 secret, address target, address token, uint256 amount)
        external
        virtual
        onlyValidSecret(secret)
    {
        _uniTransfer(token, target, amount);
        emit Withdrawal(secret);
    }

    /**
     * @notice Cancels the escrow and returns tokens to a predetermined recipient.
     * @dev The escrow can only be cancelled.
     * @param user The address of the user ether maker or taker.
     * @param token The address of the token to rescue. Zero address for native token.
     * @param amount The amount of tokens to rescue.
     */
    function cancel(address user, address token, uint256 amount) external virtual {
        _uniTransfer(token, user, amount);
        emit EscrowCancelled();
    }

    /**
     * @notice Transfers ERC20 or native tokens to the recipient.
     * @param token The address of the token to transfer.
     * @param to The address of the recipient.
     * @param amount The amount of tokens to transfer.
     */
    function _uniTransfer(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            _ethTransfer(to, amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @notice Transfers native tokens to the recipient.
     * @param to The address of the recipient.
     * @param amount The amount of tokens to transfer.
     */
    function _ethTransfer(address to, uint256 amount) internal {
        (bool success,) = to.call{value: amount}("");
        if (!success) revert NativeTokenSendingFailure();
    }

    /**
     * @dev Computes the Keccak-256 hash of the secret.
     * @param secret The secret that unlocks the escrow.
     * @return ret The computed hash.
     */
    function _keccakBytes32(bytes32 secret) private pure returns (bytes32 ret) {
        assembly ("memory-safe") {
            mstore(0, secret)
            ret := keccak256(0, 0x20)
        }
    }

    /**
     * @notice Returns the address of the factory that created the escrow.
     * @return The address of the factory that created the escrow.
     */
    function getFactoryAddress() external view returns (address) {
        return i_factoryAdress;
    }

    /**
     * @notice Returns the hashlock of the escrow.
     * @return The hashlock of the escrow.
     */
    function getHashlock() external view returns (bytes32) {
        return s_hashlock;
    }
}

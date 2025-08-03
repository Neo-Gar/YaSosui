// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {Address} from "solidity-utils/contracts/libraries/AddressLib.sol";
import {TakerTraits} from "limit-order-protocol/contracts/libraries/TakerTraitsLib.sol";
import {MakerTraits} from "limit-order-protocol/contracts/libraries/MakerTraitsLib.sol";
import {IOrderMixin} from "limit-order-protocol/contracts/interfaces/IOrderMixin.sol";
import {LimitOrderProtocol} from "limit-order-protocol/contracts/LimitOrderProtocol.sol";

import {Resolver} from "../src/Resolver.sol";
import {TestEscrowFactory, IERC20} from "../src/TestEscrowFactory.sol";
import {IBaseEscrow} from "../lib/cross-chain-swap/contracts/interfaces/IBaseEscrow.sol";
import {TimelocksLib, Timelocks} from "../lib/cross-chain-swap/contracts/libraries/TimelocksLib.sol";
import {TimelocksSettersLib} from "../lib/cross-chain-swap/test/utils/libraries/TimelocksSettersLib.sol";
import {TokenMock} from "solidity-utils/contracts/mocks/TokenMock.sol";

contract ResolverTest is Test {
    using TimelocksLib for Timelocks;

    Resolver public resolver;
    TestEscrowFactory public factory;
    LimitOrderProtocol public lop;
    TokenMock public token;

    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);

    bytes32 public constant ORDER_HASH = keccak256("test_order");
    bytes32 public constant HASHED_SECRET = keccak256("test_secret");
    uint256 public constant AMOUNT = 1 ether;
    uint256 public constant SAFETY_DEPOSIT = 0.1 ether;

    function setUp() public {
        // Deploy mock token

        // Deploy factory
        factory = new TestEscrowFactory(
            address(0x111111125421cA6dc452d289314280a0f8842A65),
            IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2),
            IERC20(address(0)),
            msg.sender,
            uint32(0),
            uint32(0)
        );

        // Deploy Limit Order Protocol
        lop = LimitOrderProtocol(payable(address(0x111111125421cA6dc452d289314280a0f8842A65)));

        // Deploy resolver
        resolver = new Resolver(factory, IOrderMixin(0x111111125421cA6dc452d289314280a0f8842A65));

        // Label addresses for better debugging
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
        vm.label(charlie, "Charlie");
        vm.label(address(resolver), "Resolver");
        vm.label(address(factory), "Factory");
        vm.label(address(lop), "LOP");
        vm.label(address(token), "Token");

        // Fund accounts
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
    }

    function test_DeploySrc_Success() public {
        // Prepare test data
        IBaseEscrow.Immutables memory immutables = _createImmutables();
        IOrderMixin.Order memory order = _createOrder();
        bytes32 r = bytes32(uint256(1));
        bytes32 vs = bytes32(uint256(2));
        uint256 amount = AMOUNT;
        TakerTraits takerTraits = TakerTraits.wrap(0);
        bytes memory args = "";

        // Mock the factory to return a predictable address
        // address expectedEscrow = address(0x123);
        // vm.mockCall(
        //     address(factory), abi.encodeWithSelector(factory.addressOfEscrowSrc.selector), abi.encode(expectedEscrow)
        // );

        // // Mock the LOP fillOrderArgs call
        // vm.mockCall(address(lop), abi.encodeWithSelector(lop.fillOrderArgs.selector), abi.encode());

        // Execute deploySrc
        vm.prank(alice);
        resolver.deploySrc{value: SAFETY_DEPOSIT}(immutables, order, r, vs, amount, takerTraits, args);

        // Verify that the safety deposit was sent to the computed escrow address
        // assertEq(expectedEscrow.balance, SAFETY_DEPOSIT);
    }

    // function test_DeploySrc_UpdatesTimelocks() public {
    //     // Prepare test data
    //     IBaseEscrow.Immutables memory immutables = _createImmutables();
    //     IOrderMixin.Order memory order = _createOrder();
    //     bytes32 r = bytes32(uint256(1));
    //     bytes32 vs = bytes32(uint256(2));
    //     uint256 amount = AMOUNT;
    //     TakerTraits takerTraits = TakerTraits.wrap(0);
    //     bytes memory args = "";

    //     address expectedEscrow = address(0x123);
    //     vm.mockCall(
    //         address(factory), abi.encodeWithSelector(factory.addressOfEscrowSrc.selector), abi.encode(expectedEscrow)
    //     );

    //     vm.mockCall(address(lop), abi.encodeWithSelector(lop.fillOrderArgs.selector), abi.encode());

    //     uint256 blockTimestamp = block.timestamp;

    //     // Execute deploySrc
    //     vm.prank(alice);
    //     resolver.deploySrc{value: SAFETY_DEPOSIT}(immutables, order, r, vs, amount, takerTraits, args);

    //     // Verify that the factory was called with updated timelocks
    //     // The timelocks should have been updated with the current block.timestamp
    //     vm.verifyCall(
    //         address(factory),
    //         abi.encodeWithSelector(
    //             factory.addressOfEscrowSrc.selector, _createImmutablesWithUpdatedTimelocks(blockTimestamp)
    //         )
    //     );
    // }

    // function test_DeploySrc_UpdatesTakerTraits() public {
    //     // Prepare test data
    //     IBaseEscrow.Immutables memory immutables = _createImmutables();
    //     IOrderMixin.Order memory order = _createOrder();
    //     bytes32 r = bytes32(uint256(1));
    //     bytes32 vs = bytes32(uint256(2));
    //     uint256 amount = AMOUNT;
    //     TakerTraits originalTakerTraits = TakerTraits.wrap(0);
    //     bytes memory args = "";

    //     address expectedEscrow = address(0x123);
    //     vm.mockCall(
    //         address(factory), abi.encodeWithSelector(factory.addressOfEscrowSrc.selector), abi.encode(expectedEscrow)
    //     );

    //     // Capture the takerTraits that gets passed to fillOrderArgs
    //     TakerTraits capturedTakerTraits;
    //     vm.mockCall(address(lop), abi.encodeWithSelector(lop.fillOrderArgs.selector), abi.encode());

    //     // Execute deploySrc
    //     vm.prank(alice);
    //     resolver.deploySrc{value: SAFETY_DEPOSIT}(immutables, order, r, vs, amount, originalTakerTraits, args);

    //     // Verify that fillOrderArgs was called with updated takerTraits
    //     // The takerTraits should have the _ARGS_HAS_TARGET flag set (1 << 251)
    //     vm.verifyCall(
    //         address(lop),
    //         abi.encodeWithSelector(
    //             lop.fillOrderArgs.selector,
    //             order,
    //             r,
    //             vs,
    //             amount,
    //             TakerTraits.wrap(uint256(1 << 251)), // Updated takerTraits
    //             abi.encodePacked(expectedEscrow, args) // argsMem
    //         )
    //     );
    // }

    // function test_DeploySrc_NativeTokenSendingFailure() public {
    //     // Prepare test data
    //     IBaseEscrow.Immutables memory immutables = _createImmutables();
    //     IOrderMixin.Order memory order = _createOrder();
    //     bytes32 r = bytes32(uint256(1));
    //     bytes32 vs = bytes32(uint256(2));
    //     uint256 amount = AMOUNT;
    //     TakerTraits takerTraits = TakerTraits.wrap(0);
    //     bytes memory args = "";

    //     // Mock the factory to return an address that will fail on native token transfer
    //     address failingEscrow = address(0x123);
    //     vm.mockCall(
    //         address(factory), abi.encodeWithSelector(factory.addressOfEscrowSrc.selector), abi.encode(failingEscrow)
    //     );

    //     // Mock the failing escrow to revert on native token transfer
    //     vm.mockCallRevert(failingEscrow, abi.encodeWithSignature(""), abi.encodeWithSignature("TransferFailed()"));

    //     // Execute deploySrc and expect it to revert
    //     vm.prank(alice);
    //     vm.expectRevert(IBaseEscrow.NativeTokenSendingFailure.selector);
    //     resolver.deploySrc{value: SAFETY_DEPOSIT}(immutables, order, r, vs, amount, takerTraits, args);
    // }

    // function test_DeploySrc_WithCustomArgs() public {
    //     // Prepare test data
    //     IBaseEscrow.Immutables memory immutables = _createImmutables();
    //     IOrderMixin.Order memory order = _createOrder();
    //     bytes32 r = bytes32(uint256(1));
    //     bytes32 vs = bytes32(uint256(2));
    //     uint256 amount = AMOUNT;
    //     TakerTraits takerTraits = TakerTraits.wrap(0);
    //     bytes memory customArgs = abi.encode("custom", "data");

    //     address expectedEscrow = address(0x123);
    //     vm.mockCall(
    //         address(factory), abi.encodeWithSelector(factory.addressOfEscrowSrc.selector), abi.encode(expectedEscrow)
    //     );

    //     vm.mockCall(address(lop), abi.encodeWithSelector(lop.fillOrderArgs.selector), abi.encode());

    //     // Execute deploySrc
    //     vm.prank(alice);
    //     resolver.deploySrc{value: SAFETY_DEPOSIT}(immutables, order, r, vs, amount, takerTraits, customArgs);

    //     // Verify that fillOrderArgs was called with the correct args (computed address + custom args)
    //     vm.verifyCall(
    //         address(lop),
    //         abi.encodeWithSelector(
    //             lop.fillOrderArgs.selector,
    //             order,
    //             r,
    //             vs,
    //             amount,
    //             TakerTraits.wrap(uint256(1 << 251)),
    //             abi.encodePacked(expectedEscrow, customArgs)
    //         )
    //     );
    // }

    // function test_DeploySrc_WithInsufficientValue() public {
    //     // Prepare test data
    //     IBaseEscrow.Immutables memory immutables = _createImmutables();
    //     IOrderMixin.Order memory order = _createOrder();
    //     bytes32 r = bytes32(uint256(1));
    //     bytes32 vs = bytes32(uint256(2));
    //     uint256 amount = AMOUNT;
    //     TakerTraits takerTraits = TakerTraits.wrap(0);
    //     bytes memory args = "";

    //     address expectedEscrow = address(0x123);
    //     vm.mockCall(
    //         address(factory), abi.encodeWithSelector(factory.addressOfEscrowSrc.selector), abi.encode(expectedEscrow)
    //     );

    //     // Execute deploySrc with insufficient value
    //     vm.prank(alice);
    //     vm.expectRevert(); // Should revert due to insufficient value
    //     resolver.deploySrc{value: SAFETY_DEPOSIT - 0.01 ether}(immutables, order, r, vs, amount, takerTraits, args);
    // }

    // function test_DeploySrc_WithExcessValue() public {
    //     // Prepare test data
    //     IBaseEscrow.Immutables memory immutables = _createImmutables();
    //     IOrderMixin.Order memory order = _createOrder();
    //     bytes32 r = bytes32(uint256(1));
    //     bytes32 vs = bytes32(uint256(2));
    //     uint256 amount = AMOUNT;
    //     TakerTraits takerTraits = TakerTraits.wrap(0);
    //     bytes memory args = "";

    //     address expectedEscrow = address(0x123);
    //     vm.mockCall(
    //         address(factory), abi.encodeWithSelector(factory.addressOfEscrowSrc.selector), abi.encode(expectedEscrow)
    //     );

    //     vm.mockCall(address(lop), abi.encodeWithSelector(lop.fillOrderArgs.selector), abi.encode());

    //     uint256 excessValue = SAFETY_DEPOSIT + 0.5 ether;

    //     // Execute deploySrc with excess value
    //     vm.prank(alice);
    //     resolver.deploySrc{value: excessValue}(immutables, order, r, vs, amount, takerTraits, args);

    //     // Verify that only the safety deposit was sent to the escrow
    //     assertEq(expectedEscrow.balance, SAFETY_DEPOSIT);

    //     // Verify that the excess value was returned to the caller
    //     assertEq(alice.balance, 100 ether - excessValue + (excessValue - SAFETY_DEPOSIT));
    // }

    // Helper functions
    function _createImmutables() internal view returns (IBaseEscrow.Immutables memory) {
        return IBaseEscrow.Immutables({
            orderHash: ORDER_HASH,
            hashlock: HASHED_SECRET,
            maker: Address.wrap(uint160(alice)),
            taker: Address.wrap(uint160(bob)),
            token: Address.wrap(uint160(address(token))),
            amount: AMOUNT,
            safetyDeposit: SAFETY_DEPOSIT,
            timelocks: _createTimelocks()
        });
    }

    function _createImmutablesWithUpdatedTimelocks(uint256 deployedAt)
        internal
        view
        returns (IBaseEscrow.Immutables memory)
    {
        IBaseEscrow.Immutables memory immutables = _createImmutables();
        immutables.timelocks = TimelocksLib.setDeployedAt(immutables.timelocks, deployedAt);
        return immutables;
    }

    function _createTimelocks() internal pure returns (Timelocks) {
        return TimelocksSettersLib.init(
            120, // srcWithdrawal
            500, // srcPublicWithdrawal
            1020, // srcCancellation
            1530, // srcPublicCancellation
            120, // dstWithdrawal
            500, // dstPublicWithdrawal
            1020, // dstCancellation
            0 // deployedAt (will be set later)
        );
    }

    function _createOrder() internal view returns (IOrderMixin.Order memory) {
        return IOrderMixin.Order({
            salt: 1,
            maker: Address.wrap(uint160(alice)),
            receiver: Address.wrap(uint160(alice)),
            makerAsset: Address.wrap(uint160(address(token))),
            takerAsset: Address.wrap(uint160(address(token))),
            makingAmount: AMOUNT,
            takingAmount: AMOUNT,
            makerTraits: MakerTraits.wrap(0)
        });
    }
}

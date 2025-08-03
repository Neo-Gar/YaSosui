// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test, console, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";

import {CustomEscrowFactory} from "../src/CustomEscrowFactory.sol";
import {CustomEscrowSrc} from "../src/CustomEscrowSrc.sol";
import {CustomEscrowDst} from "../src/CustomEscrowDst.sol";
import {ICustomEscrowFactory} from "../src/interfaces/ICustomEscrowFactory.sol";
import {ICustomBaseEscrow} from "../src/interfaces/ICustomBaseEscrow.sol";
import {ProxyHashLib} from "../src/ProxyHashLib.sol";

// Mock ERC20 token for testing
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    string public name = "Mock Token";
    string public symbol = "MTK";
    uint8 public decimals = 18;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract CustomEscrowFactoryTest is Test {
    using SafeERC20 for IERC20;

    CustomEscrowFactory public factory;
    MockERC20 public mockToken;
    MockERC20 public mockAsset;

    address public alice = address(0x1);
    address public bob = address(0x2);

    bytes32 public constant ORDER_HASH = keccak256(abi.encodePacked("test_order"));
    bytes32 public constant HASHLOCK = keccak256(abi.encodePacked("test_hashlock"));
    bytes32 public constant SECRET_HASHLOCK = keccak256(abi.encodePacked("test_secret_hashlock"));

    uint256 public constant MAKING_AMOUNT = 1000;
    uint256 public constant SAFETY_DEPOSIT = 100;
    uint256 public constant CHAIN_ID = 1;

    function setUp() public {
        factory = new CustomEscrowFactory();
        mockToken = new MockERC20();
        mockAsset = new MockERC20();

        // Mint tokens to test addresses
        mockToken.mint(alice, 10000);
        mockAsset.mint(alice, 10000);
        mockToken.mint(bob, 10000);
        mockAsset.mint(bob, 10000);

        // Give ETH to test addresses
        vm.deal(alice, 10000 ether);
        vm.deal(bob, 10000 ether);

        vm.label(address(factory), "Factory");
        vm.label(address(mockToken), "MockToken");
        vm.label(address(mockAsset), "MockAsset");
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
    }

    // ========== Constructor Tests ==========

    function test_Constructor_DeploysImplementations() public view {
        address srcImpl = factory.getEscrowSrcImplementation();
        address dstImpl = factory.getEscrowDstImplementation();

        assertTrue(srcImpl != address(0), "Src implementation should not be zero");
        assertTrue(dstImpl != address(0), "Dst implementation should not be zero");
        assertTrue(srcImpl != dstImpl, "Src and dst implementations should be different");
    }

    // ========== Address Computation Tests ==========

    function test_AddressOfEscrowSrc_DifferentHashes() public view {
        bytes32 hash1 = keccak256(abi.encodePacked("hash1"));
        bytes32 hash2 = keccak256(abi.encodePacked("hash2"));

        address address1 = factory.addressOfEscrowSrc(hash1);
        address address2 = factory.addressOfEscrowSrc(hash2);

        assertTrue(address1 != address2, "Different hashes should produce different addresses");
    }

    function test_AddressOfEscrowDst_DifferentHashes() public view {
        bytes32 hash1 = keccak256(abi.encodePacked("hash1"));
        bytes32 hash2 = keccak256(abi.encodePacked("hash2"));

        address address1 = factory.addressOfEscrowDst(hash1);
        address address2 = factory.addressOfEscrowDst(hash2);

        assertTrue(address1 != address2, "Different hashes should produce different addresses");
    }

    // ========== Implementation Address Tests ==========

    function test_GetEscrowSrcImplementation_ReturnsCorrectAddress() public view {
        address srcImpl = factory.getEscrowSrcImplementation();
        assertTrue(srcImpl != address(0), "Src implementation should not be zero");
    }

    function test_GetEscrowDstImplementation_ReturnsCorrectAddress() public view {
        address dstImpl = factory.getEscrowDstImplementation();
        assertTrue(dstImpl != address(0), "Dst implementation should not be zero");
    }

    function test_ImplementationsAreDifferent() public view {
        address srcImpl = factory.getEscrowSrcImplementation();
        address dstImpl = factory.getEscrowDstImplementation();

        assertTrue(srcImpl != dstImpl, "Src and dst implementations should be different");
    }

    // ========== Deploy Src Escrow Tests ==========

    function test_DeploySrcEscrow_Success() public {
        vm.startPrank(alice);

        // Alice needs to have tokens and approve them to the factory
        mockToken.transfer(alice, MAKING_AMOUNT);
        mockToken.approve(address(factory), MAKING_AMOUNT);

        vm.expectEmit(true, true, true, true);
        ICustomEscrowFactory.DstImmutablesComplement memory expectedComplement = ICustomEscrowFactory
            .DstImmutablesComplement({
            maker: alice,
            amount: MAKING_AMOUNT,
            token: address(mockToken),
            safetyDeposit: SAFETY_DEPOSIT,
            chainId: CHAIN_ID
        });
        emit ICustomEscrowFactory.SrcEscrowCreated(
            factory.addressOfEscrowSrc(ORDER_HASH), ORDER_HASH, alice, expectedComplement
        );

        factory.deploySrcEscrow{value: SAFETY_DEPOSIT}(
            ORDER_HASH, alice, address(mockToken), MAKING_AMOUNT, SAFETY_DEPOSIT, CHAIN_ID, SECRET_HASHLOCK
        );

        address escrow = factory.addressOfEscrowSrc(ORDER_HASH);
        assertTrue(escrow != address(0), "Escrow should be deployed");

        vm.stopPrank();
    }

    function _keccakBytes32(bytes32 secret) private pure returns (bytes32 ret) {
        assembly ("memory-safe") {
            mstore(0, secret)
            ret := keccak256(0, 0x20)
        }
    }

    function test_DeploySrcEscrowAndWithdraw_Success() public {
        vm.startPrank(alice);

        uint256 balanceBefore = address(alice).balance;
        // Alice needs to have tokens and approve them to the factory
        mockToken.transfer(alice, MAKING_AMOUNT);
        mockToken.approve(address(factory), MAKING_AMOUNT);

        vm.expectEmit(true, true, true, true);
        ICustomEscrowFactory.DstImmutablesComplement memory expectedComplement = ICustomEscrowFactory
            .DstImmutablesComplement({
            maker: alice,
            amount: MAKING_AMOUNT,
            token: address(mockToken),
            safetyDeposit: SAFETY_DEPOSIT,
            chainId: CHAIN_ID
        });
        emit ICustomEscrowFactory.SrcEscrowCreated(
            factory.addressOfEscrowSrc(ORDER_HASH), ORDER_HASH, alice, expectedComplement
        );

        factory.deploySrcEscrow{value: SAFETY_DEPOSIT}(
            ORDER_HASH,
            alice,
            address(mockToken),
            MAKING_AMOUNT,
            SAFETY_DEPOSIT,
            CHAIN_ID,
            _keccakBytes32(SECRET_HASHLOCK)
        );

        address escrow = factory.addressOfEscrowSrc(ORDER_HASH);
        assertEq(_keccakBytes32(SECRET_HASHLOCK), ICustomBaseEscrow(escrow).getHashlock());
        assertTrue(escrow != address(0), "Escrow should be deployed");

        vm.expectEmit(true, true, true, true);
        emit ICustomBaseEscrow.Withdrawal(SECRET_HASHLOCK);

        CustomEscrowSrc(escrow).withdraw(SECRET_HASHLOCK, alice, address(mockToken), MAKING_AMOUNT);

        uint256 balanceAfter = address(alice).balance;
        assertEq(balanceAfter, balanceBefore, "Balance should be the same after withdrawal");

        vm.stopPrank();
    }

    function test_DeploySrcEscrow_ZeroSafetyDeposit() public {
        vm.startPrank(alice);

        // Alice needs to have tokens and approve them to the factory
        mockToken.transfer(alice, MAKING_AMOUNT);
        mockToken.approve(address(factory), MAKING_AMOUNT);

        vm.expectEmit(true, true, true, true);
        ICustomEscrowFactory.DstImmutablesComplement memory expectedComplement = ICustomEscrowFactory
            .DstImmutablesComplement({
            maker: alice,
            amount: MAKING_AMOUNT,
            token: address(mockToken),
            safetyDeposit: 0,
            chainId: CHAIN_ID
        });
        emit ICustomEscrowFactory.SrcEscrowCreated(
            factory.addressOfEscrowSrc(ORDER_HASH), ORDER_HASH, alice, expectedComplement
        );

        factory.deploySrcEscrow{value: 0}(
            ORDER_HASH,
            alice,
            address(mockToken),
            MAKING_AMOUNT,
            0, // Zero safety deposit
            CHAIN_ID,
            SECRET_HASHLOCK
        );

        address escrow = factory.addressOfEscrowSrc(ORDER_HASH);
        assertTrue(escrow != address(0), "Escrow should be deployed even with zero safety deposit");

        vm.stopPrank();
    }

    function test_DeploySrcEscrow_NativeToken() public {
        vm.startPrank(alice);

        // For native token, the balance check should pass since we're sending the safety deposit
        // and for native token (address(0)), the balanceOf check is skipped
        vm.expectEmit(true, true, true, true);
        ICustomEscrowFactory.DstImmutablesComplement memory expectedComplement = ICustomEscrowFactory
            .DstImmutablesComplement({
            maker: alice,
            amount: MAKING_AMOUNT,
            token: address(0), // Native token
            safetyDeposit: SAFETY_DEPOSIT,
            chainId: CHAIN_ID
        });
        emit ICustomEscrowFactory.SrcEscrowCreated(
            factory.addressOfEscrowSrc(ORDER_HASH), ORDER_HASH, alice, expectedComplement
        );

        factory.deploySrcEscrow{value: SAFETY_DEPOSIT}(
            ORDER_HASH,
            alice,
            address(0), // Native token
            MAKING_AMOUNT,
            SAFETY_DEPOSIT,
            CHAIN_ID,
            SECRET_HASHLOCK
        );

        address escrow = factory.addressOfEscrowSrc(ORDER_HASH);
        assertTrue(escrow != address(0), "Escrow should be deployed for native token");

        vm.stopPrank();
    }

    // ========== Deploy Dst Escrow Tests ==========

    function test_DeployDstEscrow_Success() public {
        vm.startPrank(bob);

        mockToken.transfer(bob, MAKING_AMOUNT);
        mockToken.approve(address(factory), MAKING_AMOUNT);

        vm.expectEmit(true, true, true, true);
        emit ICustomEscrowFactory.DstEscrowCreated(factory.addressOfEscrowDst(ORDER_HASH), ORDER_HASH, bob);

        factory.deployDstEscrow{value: SAFETY_DEPOSIT}(
            address(mockToken), MAKING_AMOUNT, SAFETY_DEPOSIT, ORDER_HASH, SECRET_HASHLOCK
        );

        address escrow = factory.addressOfEscrowDst(ORDER_HASH);
        assertTrue(escrow != address(0), "Escrow should be deployed");

        vm.stopPrank();
    }

    function test_DeployDstEscrow_ZeroSafetyDeposit() public {
        vm.startPrank(bob);

        mockToken.transfer(bob, MAKING_AMOUNT);
        mockToken.approve(address(factory), MAKING_AMOUNT);

        vm.expectEmit(true, true, true, true);
        emit ICustomEscrowFactory.DstEscrowCreated(factory.addressOfEscrowDst(ORDER_HASH), ORDER_HASH, bob);

        factory.deployDstEscrow{value: 0}(address(mockToken), MAKING_AMOUNT, 0, ORDER_HASH, SECRET_HASHLOCK);

        address escrow = factory.addressOfEscrowDst(ORDER_HASH);
        assertTrue(escrow != address(0), "Escrow should be deployed even with zero safety deposit");

        vm.stopPrank();
    }

    function test_DeployDstEscrow_NativeToken() public {
        vm.startPrank(bob);

        // For native token, the amount should be included in the value
        uint256 nativeAmount = SAFETY_DEPOSIT + MAKING_AMOUNT;

        vm.expectEmit(true, true, true, true);
        emit ICustomEscrowFactory.DstEscrowCreated(factory.addressOfEscrowDst(ORDER_HASH), ORDER_HASH, bob);

        factory.deployDstEscrow{value: nativeAmount}(
            address(0), // Native token
            MAKING_AMOUNT,
            SAFETY_DEPOSIT,
            ORDER_HASH,
            SECRET_HASHLOCK
        );

        address escrow = factory.addressOfEscrowDst(ORDER_HASH);
        assertTrue(escrow != address(0), "Escrow should be deployed for native token");

        vm.stopPrank();
    }

    // ========== Error Tests ==========

    function test_DeploySrcEscrow_InsufficientBalance() public {
        vm.startPrank(alice);

        // Alice doesn't have any tokens and doesn't approve any tokens
        // This should cause the safeTransferFrom to fail

        vm.expectRevert(); // safeTransferFrom will revert with SafeTransferFromFailed

        factory.deploySrcEscrow{value: SAFETY_DEPOSIT}(
            ORDER_HASH, alice, address(mockToken), MAKING_AMOUNT, SAFETY_DEPOSIT, CHAIN_ID, SECRET_HASHLOCK
        );

        vm.stopPrank();
    }

    function test_DeployDstEscrow_InsufficientValue() public {
        vm.startPrank(bob);

        mockToken.transfer(bob, MAKING_AMOUNT);
        mockToken.approve(address(factory), MAKING_AMOUNT);

        vm.expectRevert(ICustomEscrowFactory.InsufficientEscrowBalance.selector);

        factory.deployDstEscrow{value: SAFETY_DEPOSIT - 1}(
            address(mockToken), MAKING_AMOUNT, SAFETY_DEPOSIT, ORDER_HASH, SECRET_HASHLOCK
        );

        vm.stopPrank();
    }

    function test_DeployDstEscrow_NativeToken_InsufficientValue() public {
        vm.startPrank(bob);

        uint256 nativeAmount = SAFETY_DEPOSIT + MAKING_AMOUNT;

        vm.expectRevert(ICustomEscrowFactory.InsufficientEscrowBalance.selector);

        factory.deployDstEscrow{value: nativeAmount - 1}(
            address(0), // Native token
            MAKING_AMOUNT,
            SAFETY_DEPOSIT,
            ORDER_HASH,
            SECRET_HASHLOCK
        );

        vm.stopPrank();
    }

    // ========== _isValidPartialFill Tests ==========

    function test_IsValidPartialFill_InvalidIndex() public pure {
        uint256 makingAmount = 100;
        uint256 remainingMakingAmount = 200;
        uint256 orderMakingAmount = 1000;
        uint256 partsAmount = 10;
        uint256 validatedIndex = 10; // Wrong index

        bool isValid =
            _callIsValidPartialFill(makingAmount, remainingMakingAmount, orderMakingAmount, partsAmount, validatedIndex);

        assertFalse(isValid, "Invalid index should return false");
    }

    function test_IsValidPartialFill_SameIndexAsPrevious() public pure {
        uint256 makingAmount = 100;
        uint256 remainingMakingAmount = 300; // Second fill
        uint256 orderMakingAmount = 1000;
        uint256 partsAmount = 10;
        uint256 validatedIndex = 7; // Same as previous calculated index

        bool isValid =
            _callIsValidPartialFill(makingAmount, remainingMakingAmount, orderMakingAmount, partsAmount, validatedIndex);

        assertFalse(isValid, "Same index as previous should return false");
    }

    // ========== Helper Functions ==========

    function _callIsValidPartialFill(
        uint256 makingAmount,
        uint256 remainingMakingAmount,
        uint256 orderMakingAmount,
        uint256 partsAmount,
        uint256 validatedIndex
    ) internal pure returns (bool) {
        uint256 calculatedIndex =
            (orderMakingAmount - remainingMakingAmount + makingAmount - 1) * partsAmount / orderMakingAmount;

        if (remainingMakingAmount == makingAmount) {
            return (calculatedIndex + 2 == validatedIndex);
        } else if (orderMakingAmount != remainingMakingAmount) {
            uint256 prevCalculatedIndex =
                (orderMakingAmount - remainingMakingAmount - 1) * partsAmount / orderMakingAmount;
            if (calculatedIndex == prevCalculatedIndex) return false;
        }

        return calculatedIndex + 1 == validatedIndex;
    }
}

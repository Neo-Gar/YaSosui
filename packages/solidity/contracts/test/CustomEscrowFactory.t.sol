// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";

import {CustomEscrowFactory} from "../src/CustomEscrowFactory.sol";
import {CustomEscrowSrc} from "../src/CustomEscrowSrc.sol";
import {CustomEscrowDst} from "../src/CustomEscrowDst.sol";
import {ICustomEscrowFactory} from "../src/interfaces/ICustomEscrowFactory.sol";
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

    // ========== Edge Cases ==========

    function test_DeploySrcEscrow_ZeroSafetyDeposit() public {
        vm.startPrank(alice);

        mockAsset.transfer(alice, MAKING_AMOUNT);
        mockAsset.approve(address(factory), MAKING_AMOUNT);

        // Transfer tokens to escrow
        address escrowAddress = factory.addressOfEscrowSrc(ORDER_HASH);
        mockAsset.transfer(escrowAddress, MAKING_AMOUNT);

        factory.deploySrcEscrow{value: 0}(
            ORDER_HASH,
            alice,
            address(mockToken),
            address(mockAsset),
            MAKING_AMOUNT,
            0, // Zero safety deposit
            CHAIN_ID
        );

        address escrow = factory.addressOfEscrowSrc(ORDER_HASH);
        assertTrue(escrow != address(0), "Escrow should be deployed even with zero safety deposit");

        vm.stopPrank();
    }

    function test_DeployDstEscrow_ZeroSafetyDeposit() public {
        vm.startPrank(bob);

        mockToken.transfer(bob, MAKING_AMOUNT);
        mockToken.approve(address(factory), MAKING_AMOUNT);

        factory.deployDstEscrow{value: 0}(
            address(mockToken),
            MAKING_AMOUNT,
            0, // Zero safety deposit
            ORDER_HASH,
            HASHLOCK
        );

        address escrow = factory.addressOfEscrowDst(ORDER_HASH);
        assertTrue(escrow != address(0), "Escrow should be deployed even with zero safety deposit");

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

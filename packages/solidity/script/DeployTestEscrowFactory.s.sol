// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {TestEscrowFactory, IERC20} from "../src/TestEscrowFactory.sol";
import {Resolver, IOrderMixin} from "../src/Resolver.sol";
import {Script} from "forge-std/Script.sol";

contract DeployTestEscrowFactory is Script {
    TestEscrowFactory testEscrowFactory;

    function run() public {
        testEscrowFactory = deployTestEscrowFactory();
        deployResolver(testEscrowFactory);
    }

    function deployTestEscrowFactory() public returns (TestEscrowFactory) {
        vm.startBroadcast();
        TestEscrowFactory testEscrowFactory = new TestEscrowFactory(
            0x111111125421cA6dc452d289314280a0f8842A65,
            IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2),
            IERC20(address(0)),
            msg.sender,
            uint32(0),
            uint32(0)
        );
        vm.stopBroadcast();
        return testEscrowFactory;
    }

    function deployResolver(TestEscrowFactory testEscrowFactory) public {
        vm.startBroadcast();
        new Resolver(testEscrowFactory, IOrderMixin(0x111111125421cA6dc452d289314280a0f8842A65));
        vm.stopBroadcast();
    }
}

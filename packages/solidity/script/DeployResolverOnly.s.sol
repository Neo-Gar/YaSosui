// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {TestEscrowFactory, IERC20} from "../contracts/src/TestEscrowFactory.sol";
import {Resolver, IOrderMixin} from "../contracts/src/Resolver.sol";
import {Script} from "forge-std/Script.sol";

contract DeployResolverOnly is Script {
    TestEscrowFactory testEscrowFactory;

    function run() public {
        deployResolver(TestEscrowFactory(0x7cA1DaC2BBc62896A70658019435Cd178c9651B2));
    }

    function deployResolver(TestEscrowFactory testEscrowFactory) public {
        vm.startBroadcast();
        new Resolver(testEscrowFactory, IOrderMixin(0x111111125421cA6dc452d289314280a0f8842A65));
        vm.stopBroadcast();
    }
}

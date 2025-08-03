// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {CustomEscrowFactory} from "../src/CustomEscrowFactory.sol";
import {Script} from "forge-std/Script.sol";

contract DeployCustomEscrowFactory is Script {
    CustomEscrowFactory factory;

    function run() public {
        deployCustomEscrowFactory();
    }

    function deployCustomEscrowFactory() public {
        vm.startBroadcast();
        factory = new CustomEscrowFactory();
        vm.stopBroadcast();
    }
}

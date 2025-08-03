-include .env

install:; forge install foundry-rs/forge-std && forge install OpenZeppelin/openzeppelin-contracts@v5.4.0

.PHONY: all test clean deploy fund install snapshot format anvil 

deploy-test-sepolia:; forge script script/Deploy.s.sol:Deploy --broadcast --rpc-url $(SEPOLIA_RPC_URL) --account devKey --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

deploy-resolver-only:; forge script script/DeployResolverOnly.s.sol:DeployResolverOnly --broadcast --rpc-url $(SEPOLIA_RPC_URL) --account devKey --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

deploy-seploia:; forge script script/DeployCustomEscrowFactory.s.sol:DeployCustomEscrowFactory --broadcast --rpc-url $(SEPOLIA_RPC_URL) --account devKey --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

deploy-mainnet:; forge script script/DeployCustomEscrowFactory.s.sol:DeployCustomEscrowFactory --broadcast --rpc-url $(MAINNET_RPC_URL) --account devKey --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

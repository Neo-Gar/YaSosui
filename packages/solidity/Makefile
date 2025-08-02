-include .env

install:; forge install foundry-rs/forge-std

.PHONY: all test clean deploy fund install snapshot format anvil 

deploy-sepolia:; forge script script/Deploy.s.sol:Deploy --broadcast --rpc-url $(SEPOLIA_RPC_URL) --account devKey --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

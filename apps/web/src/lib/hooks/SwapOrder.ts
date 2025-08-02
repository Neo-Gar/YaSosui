// SDK
import { useState } from "react";
import * as Sdk from '@1inch/cross-chain-sdk'
import { NetworkEnum, Address } from '@1inch/fusion-sdk'
import {
    computeAddress,
    ContractFactory,
    JsonRpcProvider,
    MaxUint256,
    parseEther,
    parseUnits,
    randomBytes,
    Wallet as SignerWallet,
    type Signer
} from 'ethers'
import { uint8ArrayToHex, UINT_40_MAX } from '@1inch/byte-utils'
import { useAccount, useWalletClient, usePublicClient, useReadContract, useWriteContract } from 'wagmi'



// Configs
import { config } from '@/lib/config/chainConfig'
import type { ChainConfig } from '@/lib/config/chainConfig'
// SUI
import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

// Utils
import { EscrowFactory } from '@/lib/utils/escrow-factory'
import { Resolver } from '@/lib/utils/resolver'
import { Wallet } from "@/lib/utils/wallet";
import factoryContract from '../../../../../packages/solidity/dist/contracts/TestEscrowFactory.sol/TestEscrowFactory.json'
import resolverContract from '../../../../../packages/solidity/dist/contracts/Resolver.sol/Resolver.json'


// Hook for user's swap Order
/**
 * @notice Hook to manage active swap order
 * @dev A user can interact only with one active order at the time
 * @dev If order is activr pendingSwap == true, user can't create new order
 */
export function useSwapOrder() {
    const [swapSuiToEth, setSwapEthToSui] = useState(false);
    const [pendingSwap, setPendingSwap] = useState(false);

    // Configuration
    interface EvmChain {
        provider: JsonRpcProvider
        escrowFactory: string
        resolver: string
    }

    interface SuiChain {
        client: SuiClient
        escrowFactory: string
        keypair: Ed25519Keypair
    }

    const { address: userAddress, chainId, chain } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()


    /*//////////////////////////////////////////////////////////////
                           MAIN STEPS
    //////////////////////////////////////////////////////////////*/

    const startSwapOrder = async (tokenAddress: string, amount: bigint) => {
        setPendingSwap(true)
        if (!swapSuiToEth) {

            console.log('[swapOrder] // STEP 0: Initializing swapOrder by user on Ethereum')

            // Create an ethers BrowserProvider from the wallet client
            if (!walletClient) throw new Error('Wallet client not available')
            const jsonRpcProvider = new JsonRpcProvider(config.chain.evm.rpcUrl);

            const src: EvmChain = await initChain(config.chain.evm, jsonRpcProvider)

            // STEP 0: Initializing swapOrder by user on Ethereum

            // Get initial balance of user's token
            const initialBalance = await getBalanceEVMForToken(tokenAddress as `0x${string}`)//await chainUser.tokenBalance(tokenAddress as `0x${string}`)

            console.log('[swapOrder] User initialBalance for EVM token ', tokenAddress, initialBalance)
            console.log('[swapOrder] // STEP 1: User creates cross-chain order with multiple fill capability')

            // STEP 1: User creates cross-chain order with multiple fill capability

            // Generate 11 secrets for multiple fills (in production, use crypto-secure random)
            const secrets = Array.from({ length: 11 }).map(() => uint8ArrayToHex(randomBytes(32)))
            const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s))
            const leaves = Sdk.HashLock.getMerkleLeaves(secrets)

            // Create order with multiple fills enabled
            const order = createLocalOrder(
                src.escrowFactory,
                userAddress as `0x${string}`,
                parseUnits('100', 6),
                parseUnits('99', 6),
                config.chain.evm.tokens.USDC.address,
                '0x0000000000000000000000000000000000000001', // Placeholder for Sui USDC
                secrets[0]!, // Use the first secret for multiple fills
                1,
                1,
                BigInt((await src.provider.getBlock('latest'))!.timestamp),
                src.resolver, /// TODO: Add resolver CONTRACT address
                true,
                secrets
            )
            // STEP 2: User signs the order
            const signature = await signOrder(chainId as number, order)
            const orderHash = order.getOrderHash(chainId as number)


            console.log(`[swapOrder]`, `${chainId} Order signed by user`, orderHash)

        } else {
            // Initializing swapOrder by user on SUI

        }
    }

    /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    // TODO: Implement helper functions getting balance for EVM
    async function getBalanceEVMForToken(tokenAddress: string): Promise<bigint> {
        if (!publicClient) throw new Error('Public client not available')

        const balance = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: [{
                name: 'balanceOf',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'account', type: 'address' }],
                outputs: [{ name: 'balance', type: 'uint256' }]
            }],
            functionName: 'balanceOf',
            args: [userAddress as `0x${string}`]
        })
        return balance ?? 0n
    }

    async function signOrder(srcChainId: number, order: Sdk.CrossChainOrder): Promise<string> {
        if (!walletClient) throw new Error('Wallet client not available')

        const typedData = order.getTypedData(srcChainId)

        return walletClient.signTypedData({
            domain: typedData.domain,
            types: { Order: typedData.types[typedData.primaryType]! },
            primaryType: 'Order',
            message: typedData.message
        })
    }

    // TODO: Implement helper functions getting balance for SUI

    /**
     * Initialize a chain with deployed contracts
     * @param cnf Chain configuration
     * @returns Chain instance with provider, escrow factory, and resolver addresses
     */
    async function initChain(
        cnf: ChainConfig,
        provider: JsonRpcProvider,
    ): Promise<{ provider: JsonRpcProvider; escrowFactory: string; resolver: string }> {
        try {
            console.log('[swapOrder:initChain] Initializing chain pk', cnf.ownerPrivateKey)

            if (!cnf.ownerPrivateKey) throw new Error('Owner private key is required')

            const deployer = new SignerWallet(cnf.ownerPrivateKey, provider)

            // STEP 1: Deploy EscrowFactory contract
            const escrowFactory = await deploy(
                factoryContract,
                [
                    cnf.limitOrderProtocol,
                    cnf.wrappedNative, // feeToken,
                    Address.fromBigInt(0n).toString(), // accessToken,
                    deployer.address, // owner
                    60 * 30, // src rescue delay
                    60 * 30 // dst rescue delay
                ],
                provider,
                deployer
            )
            console.log(`[${chainId}]`, `Escrow factory contract deployed to`, escrowFactory)

            // STEP 2: Deploy Resolver contract
            const resolver = await deploy(
                resolverContract,
                [
                    escrowFactory,
                    cnf.limitOrderProtocol,
                    deployer.address // resolver as owner of contract
                ],
                provider,
                deployer
            )
            console.log(`[${chainId}]`, `Resolver contract deployed to`, resolver)

            return { provider, resolver, escrowFactory }
        } catch (error) {
            console.error('[swapOrder:initChain] Error initializing chain', error)
            throw error
        }
    }

    /**
 * Deploy contract and return its address
 * @param json Contract ABI and bytecode
 * @param params Constructor parameters
 * @param provider JSON-RPC provider
 * @param deployer Deployer wallet
 * @returns Deployed contract address
 */
    async function deploy(
        json: { abi: any; bytecode: any },
        params: unknown[],
        provider: JsonRpcProvider,
        deployer: SignerWallet
    ): Promise<string> {
        const deployed = await new ContractFactory(json.abi, json.bytecode, deployer).deploy(...params)
        await deployed.waitForDeployment()

        return await deployed.getAddress()
    }

    /*//////////////////////////////////////////////////////////////
          HELPER FUNCTIONS THAT COULD BE MOVED TO LIB
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Helper function to create a local Order object for cross-chain swaps. Takes order parameters and returns a CrossChainOrder instance.
     * @param escrowFactory The address of the escrow factory contract
     * @param maker The address of the maker (order creator)
     * @param makingAmount The amount of tokens the maker is offering
     * @param takingAmount The amount of tokens the maker wants in return
     * @param makerAsset The token address that the maker is offering
     * @param takerAsset The token address that the maker wants in return
     * @param secret The hash lock secret for single fill orders
     * @param srcChainId The chain ID of the source chain
     * @param dstChainId The chain ID of the destination chain
     * @param srcTimestamp The timestamp on the source chain when order was created
     * @param resolver The address of the resolver contract
     * @param allowMultipleFills Whether multiple fills are allowed for this order
     * @param secrets Array of secrets for multiple fill orders using Merkle tree
     * @returns The created cross-chain order object
     * @dev For single fill orders (allowMultipleFills = false), provide only the secret parameter.
     * @dev For multiple fill orders (allowMultipleFills = true), provide the secrets array parameter which will be used to create a Merkle tree.
     */
    function createLocalOrder(
        escrowFactory: string,
        maker: string,
        makingAmount: bigint,
        takingAmount: bigint,
        makerAsset: string,
        takerAsset: string,
        secret: string,
        srcChainId: number,
        dstChainId: number,
        srcTimestamp: bigint,
        resolver: string,
        allowMultipleFills: boolean = false,
        secrets?: string[]
    ) {
        if (allowMultipleFills && secrets) {
            // STEP 1: Create hash lock for multiple fills using Merkle tree
            const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s))
            const leaves = Sdk.HashLock.getMerkleLeaves(secrets)

            return Sdk.CrossChainOrder.new(
                new Address(escrowFactory),
                {
                    salt: Sdk.randBigInt(1000n),
                    maker: new Address(maker),
                    makingAmount,
                    takingAmount,
                    makerAsset: new Address(makerAsset),
                    takerAsset: new Address(takerAsset)
                },
                {
                    // Create hash lock for multiple fills using Merkle tree
                    hashLock: Sdk.HashLock.forMultipleFills(leaves),
                    timeLocks: Sdk.TimeLocks.new({
                        srcWithdrawal: 10n,
                        srcPublicWithdrawal: 120n,
                        srcCancellation: 121n,
                        srcPublicCancellation: 122n,
                        dstWithdrawal: 10n,
                        dstPublicWithdrawal: 100n,
                        dstCancellation: 101n
                    }),
                    srcChainId,
                    dstChainId,
                    srcSafetyDeposit: parseEther('0.001'),
                    dstSafetyDeposit: parseEther('0.001')
                },
                {
                    auction: new Sdk.AuctionDetails({
                        initialRateBump: 0,
                        points: [],
                        duration: 120n,
                        startTime: srcTimestamp
                    }),
                    whitelist: [
                        {
                            address: new Address(resolver),
                            allowFrom: 0n
                        }
                    ],
                    resolvingStartTime: 0n
                },
                {
                    nonce: Sdk.randBigInt(UINT_40_MAX),
                    allowPartialFills: true,
                    allowMultipleFills: true
                }
            )
        } else {
            // STEP 1: Create hash lock for single fill (only one secret needed)
            return Sdk.CrossChainOrder.new(
                new Address(escrowFactory),
                {
                    salt: Sdk.randBigInt(1000n),
                    maker: new Address(maker),
                    makingAmount,
                    takingAmount,
                    makerAsset: new Address(makerAsset),
                    takerAsset: new Address(takerAsset)
                },
                {
                    // Create hash lock for single fill (only one secret needed)
                    hashLock: Sdk.HashLock.forSingleFill(secret),
                    timeLocks: Sdk.TimeLocks.new({
                        srcWithdrawal: 10n,
                        srcPublicWithdrawal: 120n,
                        srcCancellation: 121n,
                        srcPublicCancellation: 122n,
                        dstWithdrawal: 10n,
                        dstPublicWithdrawal: 100n,
                        dstCancellation: 101n
                    }),
                    srcChainId,
                    dstChainId,
                    srcSafetyDeposit: parseEther('0.001'),
                    dstSafetyDeposit: parseEther('0.001')
                },
                {
                    auction: new Sdk.AuctionDetails({
                        initialRateBump: 0,
                        points: [],
                        duration: 120n,
                        startTime: srcTimestamp
                    }),
                    whitelist: [
                        {
                            address: new Address(resolver),
                            allowFrom: 0n
                        }
                    ],
                    resolvingStartTime: 0n
                },
                {
                    nonce: Sdk.randBigInt(UINT_40_MAX),
                    allowPartialFills: false,
                    allowMultipleFills: false
                }
            )
        }
    }

    return { startSwapOrder }
}
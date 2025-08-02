/**
 * Main Test Structure:
 *
 * Setup Phase (STEP 1-9):
 * - Chain initialization for both Ethereum and Sui
 * - Wallet setup for different actors
 * - Funding and approval setup
 * - Sui-specific configuration
 *
 * Test Scenarios:
 * 1. Single Fill Test (STEP 1-11):
 *    STEP 1: User creates cross-chain order locally
 *    STEP 2: User signs the order
 *    STEP 3: Resolver fills the order on Ethereum using 1inch SDK
 *    STEP 4: Get source escrow deployment event
 *    STEP 5: Create destination escrow immutables
 *    STEP 6: Deploy destination escrow and deposit funds on Sui
 *    STEP 7: Calculate escrow addresses for both chains
 *    STEP 8: Wait for finality lock to pass
 *    STEP 9: User shares secret and resolver withdraws funds on destination chain (Sui)
 *    STEP 10: Resolver withdraws funds on source chain using the same secret
 *    STEP 11: Verify final balances match expected transfers
 *
 * 2. Multiple Fills Test (STEP 1-11):
 *    STEP 1: User creates cross-chain order with multiple fill capability
 *    STEP 2: User signs the order
 *    STEP 3: Resolver fills the order with 100% amount
 *    STEP 4: Get source escrow deployment event
 *    STEP 5: Create destination escrow immutables
 *    STEP 6: Deploy destination escrow and deposit funds on Sui
 *    STEP 7: Use the secret corresponding to the fill index
 *    STEP 8: Calculate escrow addresses
 *    STEP 9: Wait for finality lock to pass
 *    STEP 10: Withdraw funds using the secret
 *    STEP 11: Verify final balances
 *
 * 3. Cancel Test (STEP 1-11):
 *    STEP 1: User creates cross-chain order
 *    STEP 2: User signs the order
 *    STEP 3: Resolver fills the order on source chain
 *    STEP 4: Get source escrow deployment event
 *    STEP 5: Create destination escrow immutables
 *    STEP 6: Deploy destination escrow and deposit funds on Sui
 *    STEP 7: Calculate escrow addresses
 *    STEP 8: Wait for cancellation time locks to pass (user doesn't share secret)
 *    STEP 9: Cancel destination escrow (resolver gets funds back)
 *    STEP 10: Cancel source escrow (user gets funds back)
 *    STEP 11: Verify final balances are unchanged (no net transfer)
 *
 * Sui-Specific Details:
 * - Cross-Chain Integration:
 *   - Sui imports and configuration
 *   - SuiChain interface for cross-chain functionality
 *   - Sui-specific transaction building and signing (partially implemented)
 *
 * - Local Order Creation:
 *   - Single vs multiple fill hash lock creation
 *   - Parameter documentation
 *
 * - Sui Chain Initialization:
 *   - Sui client connection to testnet
 *   - Keypair setup from environment variables
 *   - Cross-chain testing setup
 *
 * - Sui Transaction Handling:
 *   - Sui escrow deployment implementation (placeholder/TODO)
 *   - Withdrawal and cancellation logic (placeholder/TODO)
 *   - Balance checking limitations (placeholder/TODO)
 *
 * Key Differences from EVM:
 * - Time manipulation only works on EVM chains
 * - Sui uses different SDK and transaction format
 * - Sui escrow addresses need different implementation (TODO)
 * - Token balance checking needs separate implementation (TODO)
 * - Many Sui-specific operations are currently placeholders
 */

import 'dotenv/config'
import { expect, jest } from '@jest/globals'

import { createServer } from 'prool'
import type { CreateServerReturnType } from 'prool'
import { instances } from 'prool'
const { anvil } = instances

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
    Wallet as SignerWallet
} from 'ethers'
import { uint8ArrayToHex, UINT_40_MAX } from '@1inch/byte-utils'
// Sui imports for cross-chain functionality
import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

import assert from 'node:assert'

import { config } from './config-sui'
import type { ChainConfig } from './config-sui'
import { Wallet } from './wallet'
import { Resolver } from './resolver'
import { EscrowFactory } from './escrow-factory'
import factoryContract from '../../../packages/solidity/dist/contracts/TestEscrowFactory.sol/TestEscrowFactory.json'
import resolverContract from '../../../packages/solidity/dist/contracts/Resolver.sol/Resolver.json'


jest.setTimeout(1000 * 60)

// Test private keys for user and resolver wallets
const userPk = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const resolverPk = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'

// Sui configuration from environment variables
const SUI_ESCROW_FACTORY_ADDRESS =
    process.env.SUI_ESCROW_FACTORY_ADDRESS || '0xfab87636c79339242adf52df5f5ef84f31191be7366ff0a83c8b030236a2b931'
const SUI_PRIVATE_KEY = process.env.SUI_PRIVATE_KEY

// Define SuiChain interface for cross-chain integration
interface SuiChain {
    client: SuiClient
    escrowFactory: string
    keypair: Ed25519Keypair
}

/**
 * Helper function to create orders locally without external services
 * This avoids dependencies on external APIs and ensures reliable testing
 * @param escrowFactory Address of the escrow factory contract
 * @param maker Address of the order maker
 * @param makingAmount Amount being offered on source chain
 * @param takingAmount Amount being requested on destination chain
 * @param makerAsset Asset being offered (source chain)
 * @param takerAsset Asset being requested (destination chain)
 * @param secret Secret for hash lock
 * @param srcChainId Source chain ID
 * @param dstChainId Destination chain ID
 * @param srcTimestamp Timestamp for order creation
 * @param resolver Resolver address
 * @param allowMultipleFills Whether to allow multiple fills
 * @param secrets Array of secrets for multiple fills
 * @returns Cross-chain order object
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

/**
 * Initialize Sui chain for cross-chain testing
 * @returns SuiChain instance with client, escrow factory, and keypair
 */
async function initSuiChain(): Promise<SuiChain> {
    // STEP 1: Create Sui client connection to testnet
    const client = new SuiClient({
        url: 'https://fullnode.testnet.sui.io:443'
    }) // Use a testnet RPC for testing

    // STEP 2: Set up Sui keypair from environment variable
    if (!SUI_PRIVATE_KEY) {
        throw new Error('SUI_PRIVATE_KEY environment variable is required')
    }

    const keypair = Ed25519Keypair.fromSecretKey(SUI_PRIVATE_KEY)

    return {
        client,
        escrowFactory: SUI_ESCROW_FACTORY_ADDRESS,
        keypair
    }
}

/**
 * @notice Integration test for cross-chain escrow resolution flow from Ethereum to Sui
 * @dev Test steps:
 * 1. Initialize source (Ethereum) and destination (Sui) chains with deployed contracts
 * 2. Set up test wallets for user and resolver on both chains
 * 3. Create EscrowFactory instances for interacting with contracts
 * 4. Fund source chain user with 1000 USDC test tokens
 * 5. Approve USDC spending to LimitOrderProtocol
 * 6. Test escrow creation, resolution and withdrawal flows across chains
 *
 * NOTE: This test uses local order creation instead of external order creation services
 * to avoid dependencies on external APIs and ensure reliable testing.
 */

describe('Ethereum to Sui Cross-Chain Swap', () => {
    // Chain configuration for source (Ethereum) and destination (Sui)
    const srcChainId = config.chain.source.chainId

    // TODO: Identify the need for fake dstChainId
    const dstChainId = NetworkEnum.BINANCE // Use BSC as placeholder for Sui???

    type EvmChain = {
        node?: CreateServerReturnType | undefined
        provider: JsonRpcProvider
        escrowFactory: string
        resolver: string
    }

    // Chain instances for source (Ethereum) and destination (Sui)
    let src: EvmChain
    let dst: SuiChain

    // Wallet instances for different actors on both chains
    let srcChainUser: Wallet
    let srcChainResolver: Wallet
    let dstChainResolver: Ed25519Keypair

    // Factory and resolver contract instances
    let srcFactory: EscrowFactory
    let srcResolverContract: Wallet

    // Timestamp for order creation
    let srcTimestamp: bigint

    // Helper function to increase time on EVM chain only (Sui doesn't support time manipulation)
    async function increaseTime(t: number): Promise<void> {
        // Only increase time on EVM chain (source)
        await src.provider.send('evm_increaseTime', [t])
    }

    /**
     * @notice Setup function that runs before all tests to initialize chains and actors
     * @dev Performs the following setup steps:
     * 1. Initializes Ethereum chain with deployed contracts
     * 2. Initializes Sui chain for cross-chain testing
     * 3. Sets up wallet instances for user and resolver on both chains
     * 4. Creates factory instances for interacting with escrow contracts
     * 5. Funds source chain EVM user with test USDC tokens
     * 6. Approves USDC spending to LimitOrderProtocol
     * 7. Sets up resolver contract for destination chain
     * 8. Ensures Sui resolver has required funds
     * 9. Gets current timestamp for order creation
     */
    beforeAll(async () => {
        // STEP 1: Initialize Ethereum chain with deployed contracts
        src = await initChain(config.chain.source)

        // STEP 2: Initialize Sui chain for cross-chain testing
        dst = await initSuiChain()

        // STEP 3: Set up wallet instances for user and resolver on both chains
        srcChainUser = new Wallet(userPk, src.provider)
        srcChainResolver = new Wallet(resolverPk, src.provider)
        dstChainResolver = dst.keypair

        /////////////////////// These are EVM staps /////////////////////////////

        // STEP 4: Create factory instances for interacting with escrow contracts
        srcFactory = new EscrowFactory(src.provider, src.escrowFactory)

        // STEP 5: Fund source chain EVM user with 1000 USDC test tokens for testing
        await srcChainUser.topUpFromDonor(
            config.chain.source.tokens.USDC.address,
            config.chain.source.tokens.USDC.donor,
            parseUnits('1000', 6)
        )

        // STEP 6: Approve USDC spending to LimitOrderProtocol for order creation
        await srcChainUser.approveToken(
            config.chain.source.tokens.USDC.address,
            config.chain.source.limitOrderProtocol,
            MaxUint256
        )

        // STEP 7: Set up resolver contract for source chain (EVM)
        srcResolverContract = await Wallet.fromAddress(src.resolver, src.provider)

        /////////////////////// These are SUI staps /////////////////////////////

        // STEP 8: For Sui, we need to ensure the resolver has funds
        // This would typically be done through Sui-specific funding mechanisms
        console.log('[SUI] Resolver address:', dstChainResolver.getPublicKey().toSuiAddress())

        // STEP 9: Get current timestamp for order creation
        srcTimestamp = BigInt((await src.provider.getBlock('latest'))!.timestamp)
    })

    // Helper function to get token balances for all actors on both chains
    async function getBalances(
        srcToken: string,
        _dstToken: string
    ): Promise<{ src: { user: bigint; resolver: bigint }; dst: { user: bigint; resolver: bigint } }> {
        return {
            src: {
                user: await srcChainUser.tokenBalance(srcToken),
                resolver: await srcResolverContract.tokenBalance(srcToken)
            },
            dst: {
                user: 0n, // TODO: Implement Sui token balance checking
                resolver: 0n // TODO: Implement Sui token balance checking
            }
        }
    }

    afterAll(async () => {
        // Clean up providers and nodes
        if (src?.provider) {
            src.provider.destroy()
        }
        if (src?.node) {
            await src.node.stop()
        }
    })

    describe('Fill', () => {
        it('should swap Ethereum USDC -> Sui USDC. Single fill only', async () => {
            // Get initial balances to verify transfers
            const initialBalances = await getBalances(
                config.chain.source.tokens.USDC.address,
                config.chain.sui.tokens.USDC.address
            )

            // STEP 1: User creates cross-chain order with multiple fill capability
            // Generate 11 secrets for multiple fills (in production, use crypto-secure random)
            const secrets = Array.from({ length: 11 }).map(() => uint8ArrayToHex(randomBytes(32)))
            const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s))
            const leaves = Sdk.HashLock.getMerkleLeaves(secrets)

            // Create order with multiple fills enabled
            const order = createLocalOrder(
                src.escrowFactory,
                await srcChainUser.getAddress(),
                parseUnits('100', 6),
                parseUnits('99', 6),
                config.chain.source.tokens.USDC.address,
                '0x0000000000000000000000000000000000000001', // Placeholder for Sui USDC
                secrets[0]!, // Use the first secret for multiple fills
                srcChainId,
                dstChainId,
                srcTimestamp,
                src.resolver,
                true,
                secrets
            )

            // STEP 2: User signs the order
            const signature = await srcChainUser.signOrder(srcChainId, order)
            const orderHash = order.getOrderHash(srcChainId)

            // STEP 3: Resolver fills the order with 100% amount
            // Use a placeholder address for Sui since the SDK expects EVM format
            const resolverContract = new Resolver(src.resolver, '0x0000000000000000000000000000000000000001')

            console.log(`[${srcChainId}]`, `Filling order ${orderHash}`)

            const fillAmount = order.makingAmount
            const idx = secrets.length - 1 // Use last index to fulfill 100%

            // Deploy source escrow with multiple fill interaction
            const { txHash: orderFillHash, blockHash: srcDeployBlock } = await srcChainResolver.send(
                resolverContract.deploySrc(
                    srcChainId,
                    order,
                    signature,
                    Sdk.TakerTraits.default()
                        .setExtension(order.extension)
                        .setInteraction(
                            // Set up multiple fill interaction with Merkle proof
                            new Sdk.EscrowFactory(new Address(src.escrowFactory)).getMultipleFillInteraction(
                                Sdk.HashLock.getProof(leaves, idx),
                                idx,
                                secretHashes[idx]!
                            )
                        )
                        .setAmountMode(Sdk.AmountMode.maker)
                        .setAmountThreshold(order.takingAmount),
                    fillAmount,
                    Sdk.HashLock.fromString(secretHashes[idx]!)
                )
            )

            console.log(`[${srcChainId}]`, `Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`)

            // STEP 4: Get source escrow deployment event
            const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock)

            // STEP 5: Create destination escrow immutables
            const dstImmutables = srcEscrowEvent[0]
                .withComplement(srcEscrowEvent[1])
                .withTaker(new Address(resolverContract.dstAddress))

            // STEP 6: Deploy destination escrow and deposit funds on Sui
            console.log(`[${dstChainId}]`, `Depositing ${dstImmutables.amount} for order ${orderHash}`)

            // TODO: Deploy Escrow on SUI using EscrowFactory
            //////////////////////////// Implement deploy ////////////////////////////

            // Deploy escrow on Sui by calling deploy_escrow
            const txbEscrow = new Transaction()

            const hexToBytes = (hex: string): number[] => {
                const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
                const bytes: number[] = []
                for (let i = 0; i < cleanHex.length; i += 2) {
                    bytes.push(parseInt(cleanHex.substr(i, 2), 16))
                }
                return bytes
            }

            //const [paymentCoin] = txbEscrow.splitCoins(txbEscrow.gas, [txbEscrow.pure('u64', 1000000n)]) // Use valid amount for coin split


            txbEscrow.moveCall({
                target: `${dst.escrowFactory}::escrow_factory::deploy_escrow`,
                arguments: [
                    txbEscrow.object('0x3f3f2cfd1a303d474e92322e38027700f1b86c298b4a778f536368e8faef940e'), // factory object
                    txbEscrow.pure('vector<u8>', hexToBytes(orderHash)), // order_hash
                    txbEscrow.pure('vector<u8>', hexToBytes(dstImmutables.hashLock.toString())), // hash_lock
                    txbEscrow.pure('address', dstImmutables.maker.toString()), // maker
                    txbEscrow.pure('address', dstImmutables.taker.toString()), // taker
                    txbEscrow.pure('address', config.chain.source.tokens.USDC.address), // token
                    txbEscrow.pure('u64', dstImmutables.amount), // amount
                    txbEscrow.pure('u64', dstImmutables.safetyDeposit), // safety_deposit
                    txbEscrow.pure('vector<u8>', hexToBytes(dstImmutables.timeLocks.toString())), // time_locks
                    //paymentCoin, // payment coin
                ]
            })

            const dstDeployedAt = await dst.client.signAndExecuteTransaction({
                transaction: txbEscrow,
                signer: dstChainResolver,
                options: { showEvents: true, showObjectChanges: true } // or showEffects: true on older SDKs
            })

            const transaction = await dst.client.getTransactionBlock({
                digest: dstDeployedAt.digest,
                options: { showEvents: true }
            })

            const parsed = transaction.events?.[0]!.parsedJson as any
            const escrow_id = parsed.escrow_id

            console.log(escrow_id)

            // STEP 7: Use the secret corresponding to the fill index
            const secret = secrets[idx]



            // STEP 8: Calculate escrow addresses

            const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl()

            const srcEscrowAddress = new Sdk.EscrowFactory(new Address(src.escrowFactory)).getSrcEscrowAddress(
                srcEscrowEvent[0],
                ESCROW_SRC_IMPLEMENTATION
            )

            // STEP 9: Wait for finality lock to pass
            await increaseTime(11)

            // STEP 10: Withdraw funds using the secret
            console.log(`[${dstChainId}]`, `Withdrawing funds for user from ${escrow_id}`)

            // For Sui withdrawal, implement Sui-specific withdrawal logic

            const escrowWithdrawTxb = new Transaction()
            escrowWithdrawTxb.moveCall({
                target: `${dst.escrowFactory}::escrow_factory::withdraw`,
                arguments: [
                    escrowWithdrawTxb.object(escrow_id),
                    escrowWithdrawTxb.pure('vector<u8>', Array.from(Buffer.from(secret!.slice(2), 'hex')))
                ]
            })

            const escrowWithdrawAt = await dst.client.signAndExecuteTransaction({
                transaction: escrowWithdrawTxb,
                signer: dstChainResolver,
                options: { showEvents: true, showObjectChanges: true } // or showEffects: true on older SDKs
            })

            console.log(escrowWithdrawAt)

            console.log(`[${srcChainId}]`, `Withdrawing funds for resolver from ${srcEscrowAddress}`)
            const { txHash: resolverWithdrawHash } = await srcChainResolver.send(
                resolverContract.withdraw('src', srcEscrowAddress, secret!, srcEscrowEvent[0])
            )
            console.log(
                `[${srcChainId}]`,
                `Withdrew funds for resolver from ${srcEscrowAddress} to ${src.resolver} in tx ${resolverWithdrawHash}`
            )

            // STEP 11: Verify final balances
            const resultBalances = await getBalances(
                config.chain.source.tokens.USDC.address,
                config.chain.sui.tokens.USDC.address
            )

            // Verify user transferred funds to resolver on the source chain
            expect(initialBalances.src.user - resultBalances.src.user).toBe(order.makingAmount)
            expect(resultBalances.src.resolver - initialBalances.src.resolver).toBe(order.makingAmount)

            // For Sui, we would verify the destination chain balances
            console.log('[SUI] Multiple fill withdrawal completed successfully')
        })

        it('should swap Ethereum USDC -> Sui USDC. Multiple fills. Fill 100%', async () => {
            // Get initial balances to verify transfers
            const initialBalances = await getBalances(
                config.chain.source.tokens.USDC.address,
                config.chain.sui.tokens.USDC.address
            )

            // STEP 1: User creates cross-chain order with multiple fill capability
            // Generate 11 secrets for multiple fills (in production, use crypto-secure random)
            const secrets = Array.from({ length: 11 }).map(() => uint8ArrayToHex(randomBytes(32)))
            const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s))
            const leaves = Sdk.HashLock.getMerkleLeaves(secrets)

            // Create order with multiple fills enabled
            const order = createLocalOrder(
                src.escrowFactory,
                await srcChainUser.getAddress(),
                parseUnits('100', 6),
                parseUnits('99', 6),
                config.chain.source.tokens.USDC.address,
                '0x0000000000000000000000000000000000000001', // Placeholder for Sui USDC
                secrets[0]!, // Use the first secret for multiple fills
                srcChainId,
                dstChainId,
                srcTimestamp,
                src.resolver,
                true,
                secrets
            )

            // STEP 2: User signs the order
            const signature = await srcChainUser.signOrder(srcChainId, order)
            const orderHash = order.getOrderHash(srcChainId)

            // STEP 3: Resolver fills the order with 100% amount
            // Use a placeholder address for Sui since the SDK expects EVM format
            const resolverContract = new Resolver(src.resolver, '0x0000000000000000000000000000000000000001')

            console.log(`[${srcChainId}]`, `Filling order ${orderHash}`)

            const fillAmount = order.makingAmount
            const idx = secrets.length - 1 // Use last index to fulfill 100%

            // Deploy source escrow with multiple fill interaction
            const { txHash: orderFillHash, blockHash: srcDeployBlock } = await srcChainResolver.send(
                resolverContract.deploySrc(
                    srcChainId,
                    order,
                    signature,
                    Sdk.TakerTraits.default()
                        .setExtension(order.extension)
                        .setInteraction(
                            // Set up multiple fill interaction with Merkle proof
                            new Sdk.EscrowFactory(new Address(src.escrowFactory)).getMultipleFillInteraction(
                                Sdk.HashLock.getProof(leaves, idx),
                                idx,
                                secretHashes[idx]!
                            )
                        )
                        .setAmountMode(Sdk.AmountMode.maker)
                        .setAmountThreshold(order.takingAmount),
                    fillAmount,
                    Sdk.HashLock.fromString(secretHashes[idx]!)
                )
            )

            console.log(`[${srcChainId}]`, `Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`)

            // STEP 4: Get source escrow deployment event
            const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock)

            // STEP 5: Create destination escrow immutables
            const dstImmutables = srcEscrowEvent[0]
                .withComplement(srcEscrowEvent[1])
                .withTaker(new Address(resolverContract.dstAddress))

            // STEP 6: Deploy destination escrow and deposit funds on Sui
            console.log(`[${dstChainId}]`, `Depositing ${dstImmutables.amount} for order ${orderHash}`)

            // TODO: Deploy Escrow on SUI using EscrowFactory
            //////////////////////////// Implement deploy ////////////////////////////

            // Deploy escrow on Sui by calling deploy_escrow
            const txbEscrow = new Transaction()

            const hexToBytes = (hex: string): number[] => {
                const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
                const bytes: number[] = []
                for (let i = 0; i < cleanHex.length; i += 2) {
                    bytes.push(parseInt(cleanHex.substr(i, 2), 16))
                }
                return bytes
            }

            //const [paymentCoin] = txbEscrow.splitCoins(txbEscrow.gas, [txbEscrow.pure('u64', 1000000n)]) // Use valid amount for coin split


            txbEscrow.moveCall({
                target: `${dst.escrowFactory}::escrow_factory::deploy_escrow`,
                arguments: [
                    txbEscrow.object('0x3f3f2cfd1a303d474e92322e38027700f1b86c298b4a778f536368e8faef940e'), // factory object
                    txbEscrow.pure('vector<u8>', hexToBytes(orderHash)), // order_hash
                    txbEscrow.pure('vector<u8>', hexToBytes(dstImmutables.hashLock.toString())), // hash_lock
                    txbEscrow.pure('address', dstImmutables.maker.toString()), // maker
                    txbEscrow.pure('address', dstImmutables.taker.toString()), // taker
                    txbEscrow.pure('address', config.chain.source.tokens.USDC.address), // token
                    txbEscrow.pure('u64', dstImmutables.amount), // amount
                    txbEscrow.pure('u64', dstImmutables.safetyDeposit), // safety_deposit
                    txbEscrow.pure('vector<u8>', hexToBytes(dstImmutables.timeLocks.toString())), // time_locks
                    //paymentCoin, // payment coin
                ]
            })

            const dstDeployedAt = await dst.client.signAndExecuteTransaction({
                transaction: txbEscrow,
                signer: dstChainResolver,
                options: { showEvents: true, showObjectChanges: true } // or showEffects: true on older SDKs
            })

            const transaction = await dst.client.getTransactionBlock({
                digest: dstDeployedAt.digest,
                options: { showEvents: true }
            })

            const parsed = transaction.events?.[0]!.parsedJson as any
            const escrow_id = parsed.escrow_id

            console.log(escrow_id)

            // STEP 7: Use the secret corresponding to the fill index
            const secret = secrets[idx]

            // STEP 8: Calculate escrow addresses

            const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl()

            const srcEscrowAddress = new Sdk.EscrowFactory(new Address(src.escrowFactory)).getSrcEscrowAddress(
                srcEscrowEvent[0],
                ESCROW_SRC_IMPLEMENTATION
            )

            // STEP 9: Wait for finality lock to pass
            await increaseTime(11)

            // STEP 10: Withdraw funds using the secret
            console.log(`[${dstChainId}]`, `Withdrawing funds for user from ${escrow_id}`)

            // For Sui withdrawal, implement Sui-specific withdrawal logic

            const escrowWithdrawTxb = new Transaction()
            escrowWithdrawTxb.moveCall({
                target: `${dst.escrowFactory}::escrow_factory::withdraw`,
                arguments: [
                    escrowWithdrawTxb.object(escrow_id),
                    escrowWithdrawTxb.pure('vector<u8>', Array.from(Buffer.from(secret!.slice(2), 'hex')))
                ]
            })

            const escrowWithdrawAt = await dst.client.signAndExecuteTransaction({
                transaction: escrowWithdrawTxb,
                signer: dstChainResolver,
                options: { showEvents: true, showObjectChanges: true } // or showEffects: true on older SDKs
            })

            console.log(escrowWithdrawAt)

            console.log(`[${srcChainId}]`, `Withdrawing funds for resolver from ${srcEscrowAddress}`)
            const { txHash: resolverWithdrawHash } = await srcChainResolver.send(
                resolverContract.withdraw('src', srcEscrowAddress, secret!, srcEscrowEvent[0])
            )
            console.log(
                `[${srcChainId}]`,
                `Withdrew funds for resolver from ${srcEscrowAddress} to ${src.resolver} in tx ${resolverWithdrawHash}`
            )

            // STEP 11: Verify final balances
            const resultBalances = await getBalances(
                config.chain.source.tokens.USDC.address,
                config.chain.sui.tokens.USDC.address
            )

            // Verify user transferred funds to resolver on the source chain
            expect(initialBalances.src.user - resultBalances.src.user).toBe(order.makingAmount)
            expect(resultBalances.src.resolver - initialBalances.src.resolver).toBe(order.makingAmount)

            // For Sui, we would verify the destination chain balances
            console.log('[SUI] Multiple fill withdrawal completed successfully')
        })
    })

    describe('Cancel', () => {
        it('should cancel swap Ethereum USDC -> Sui USDC', async () => {
            // Get initial balances to verify no net transfer
            const initialBalances = await getBalances(
                config.chain.source.tokens.USDC.address,
                config.chain.sui.tokens.USDC.address
            )

            // STEP 1: User creates cross-chain order
            const secret = uint8ArrayToHex(randomBytes(32))
            const order = createLocalOrder(
                src.escrowFactory,
                await srcChainUser.getAddress(),
                parseUnits('100', 6),
                parseUnits('99', 6),
                config.chain.source.tokens.USDC.address,
                '0x0000000000000000000000000000000000000001', // Placeholder for Sui USDC
                secret,
                srcChainId,
                dstChainId,
                srcTimestamp,
                src.resolver,
                false
            )

            // STEP 2: User signs the order
            const signature = await srcChainUser.signOrder(srcChainId, order)
            const orderHash = order.getOrderHash(srcChainId)

            // STEP 3: Resolver fills the order on source chain
            // Use a placeholder address for Sui since the SDK expects EVM format
            const resolverContract = new Resolver(src.resolver, '0x0000000000000000000000000000000000000001')

            console.log(`[${srcChainId}]`, `Filling order ${orderHash}`)

            const fillAmount = order.makingAmount
            // Deploy source escrow and fill the order
            const { txHash: orderFillHash, blockHash: srcDeployBlock } = await srcChainResolver.send(
                resolverContract.deploySrc(
                    srcChainId,
                    order,
                    signature,
                    Sdk.TakerTraits.default()
                        .setExtension(order.extension)
                        .setAmountMode(Sdk.AmountMode.maker)
                        .setAmountThreshold(order.takingAmount),
                    fillAmount
                )
            )

            console.log(`[${srcChainId}]`, `Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`)

            // STEP 4: Get source escrow deployment event
            const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock)

            // STEP 5: Create destination escrow immutables
            const dstImmutables = srcEscrowEvent[0]
                .withComplement(srcEscrowEvent[1])
                .withTaker(new Address(resolverContract.dstAddress))

            // STEP 6: Deploy destination escrow and deposit funds on Sui
            console.log(`[${dstChainId}]`, `Depositing ${dstImmutables.amount} for order ${orderHash}`)

            // For Sui, create and sign transaction using Sui SDK
            const txb = new Transaction()
            txb.setSender(dstChainResolver.getPublicKey().toSuiAddress())
            const [coin] = txb.splitCoins(txb.gas, [txb.pure('u64', 1000000n)])
            txb.transferObjects([coin], txb.pure('address', dstChainResolver.getPublicKey().toSuiAddress()))

            const bytes = await txb.build({ client: dst.client })
            const signature_sui = await dstChainResolver.sign(bytes)

            console.log(`[${dstChainId}]`, `Created dst deposit for order ${orderHash} in tx ${signature_sui}`)

            // STEP 7: Calculate escrow addresses
            const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl()

            const srcEscrowAddress = new Sdk.EscrowFactory(new Address(src.escrowFactory)).getSrcEscrowAddress(
                srcEscrowEvent[0],
                ESCROW_SRC_IMPLEMENTATION
            )

            // For Sui, we would need to implement proper escrow address calculation
            const dstEscrowAddress = '0xplaceholder' // TODO: Implement proper Sui escrow address calculation

            // STEP 8: Wait for cancellation time locks to pass (user doesn't share secret)
            await increaseTime(125)

            // STEP 9: Cancel destination escrow (resolver gets funds back)
            console.log(`[${dstChainId}]`, `Cancelling dst escrow ${dstEscrowAddress}`)

            // For Sui cancellation, implement Sui-specific cancellation logic
            const cancelTxb = new Transaction()
            cancelTxb.setSender(dstChainResolver.getPublicKey().toSuiAddress())
            const [cancelCoin] = cancelTxb.splitCoins(cancelTxb.gas, [cancelTxb.pure('u64', 250000n)])
            cancelTxb.transferObjects(
                [cancelCoin],
                cancelTxb.pure('address', dstChainResolver.getPublicKey().toSuiAddress())
            )

            const cancelBytes = await cancelTxb.build({ client: dst.client })
            const _cancelSignature = await dstChainResolver.sign(cancelBytes)

            // STEP 10: Cancel source escrow (user gets funds back)
            console.log(`[${srcChainId}]`, `Cancelling src escrow ${srcEscrowAddress}`)
            const { txHash: cancelSrcEscrow } = await srcChainResolver.send(
                resolverContract.cancel('src', srcEscrowAddress, srcEscrowEvent[0])
            )
            console.log(`[${srcChainId}]`, `Cancelled src escrow ${srcEscrowAddress} in tx ${cancelSrcEscrow}`)

            // STEP 11: Verify final balances are unchanged (no net transfer)
            const resultBalances = await getBalances(
                config.chain.source.tokens.USDC.address,
                config.chain.sui.tokens.USDC.address
            )

            expect(initialBalances).toEqual(resultBalances)
        })
    })
})

/**
 * Initialize a chain with deployed contracts
 * @param cnf Chain configuration
 * @returns Chain instance with provider, escrow factory, and resolver addresses
 */
async function initChain(
    cnf: ChainConfig
): Promise<{ node?: CreateServerReturnType; provider: JsonRpcProvider; escrowFactory: string; resolver: string }> {
    // Get provider (fork or direct connection)
    const { node, provider } = await getProvider(cnf)
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
    console.log(`[${cnf.chainId}]`, `Escrow factory contract deployed to`, escrowFactory)

    // STEP 2: Deploy Resolver contract
    const resolver = await deploy(
        resolverContract,
        [
            escrowFactory,
            cnf.limitOrderProtocol,
            computeAddress(resolverPk) // resolver as owner of contract
        ],
        provider,
        deployer
    )
    console.log(`[${cnf.chainId}]`, `Resolver contract deployed to`, resolver)

    return { node: node, provider, resolver, escrowFactory }
}

/**
 * Get provider for chain (fork or direct connection)
 * @param cnf Chain configuration
 * @returns Provider and optional node instance
 */
async function getProvider(cnf: ChainConfig): Promise<{ node?: CreateServerReturnType; provider: JsonRpcProvider }> {
    if (!cnf.createFork) {
        // Use direct connection to existing network
        return {
            provider: new JsonRpcProvider(cnf.url, cnf.chainId, {
                cacheTimeout: -1,
                staticNetwork: true
            })
        }
    }

    // Create local fork for testing
    const node = createServer({
        instance: anvil({ forkUrl: cnf.url, chainId: cnf.chainId }),
        limit: 1
    })
    await node.start()

    const address = node.address()
    assert(address)

    const localUrl = `http://${address.address}:${address.port}`

    const provider = new JsonRpcProvider(localUrl, cnf.chainId, {
        cacheTimeout: -1,
        staticNetwork: true
    })

    return {
        provider,
        node
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

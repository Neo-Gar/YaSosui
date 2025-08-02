// SDK
import { useState } from "react";
import * as Sdk from '@1inch/cross-chain-sdk'
import { Address } from '@1inch/fusion-sdk'
import {
    JsonRpcProvider,
    parseEther,
    parseUnits,
    randomBytes,
} from 'ethers'
import { uint8ArrayToHex, UINT_40_MAX } from '@1inch/byte-utils'
import { useAccount, useWalletClient, usePublicClient, useReadContract, useWriteContract } from 'wagmi'
import { createLocalOrder } from '@/lib/utils/orderHelper'

// Configs
import { config } from '@/lib/config/chainConfig'
//import type { ChainConfig } from '@/lib/config/chainConfig'

// SUI
import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

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

    interface SwapOrder {
        fromTokenKey: string
        fromNetwork: string
        toTokenKey: string
        toNetwork: string
        signature: string[]
        orderHash: string[]
        secrets: string[]
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

            //const src: EvmChain = await initChain(config.chain.evm, jsonRpcProvider)
            const escrowFactory = process.env.NEXT_PUBLIC_EVM_ESCROW_FACTORY_ADDRESS
            const resolver = process.env.NEXT_PUBLIC_EVM_RESOLVER_ADDRESS

            console.log('[swapOrder] Escrow factory address', escrowFactory)
            console.log('[swapOrder] Resolver address', resolver)

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
                escrowFactory as `0x${string}`,
                userAddress as `0x${string}`,
                parseUnits('100', 6),
                parseUnits('99', 6),
                config.chain.evm.tokens.USDC.address,
                '0x0000000000000000000000000000000000000001', // Placeholder for Sui USDC
                secrets[0]!, // Use the first secret for multiple fills
                1,
                10,
                BigInt((await jsonRpcProvider.getBlock('latest'))!.timestamp),
                resolver as `0x${string}`, /// TODO: Add resolver CONTRACT address
                true,
                secrets
            )
            // STEP 2: User signs the order
            const signature = await signOrder(chainId as number, order)
            const orderHash = order.getOrderHash(chainId as number)

            console.log('[swapOrder] Order', order)

            console.log(`[swapOrder]`, `${chainId} Order signed by user`, orderHash)

            return {
                data: {
                    fromTokenKey: config.chain.evm.tokens.USDC.address,
                    fromNetwork: 'ethereum',
                    toTokenKey: '0x0000000000000000000000000000000000000001',
                    toNetwork: 'sui',
                    signature: [signature],
                    orderHash: [orderHash],
                    secrets: secrets
                }
            }
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

        // Handle ETH (native token) - use getBalance instead of contract call
        if (tokenAddress === 'ETH' || tokenAddress === '0x0000000000000000000000000000000000000000') {
            return await publicClient.getBalance({ address: userAddress as `0x${string}` })
        }

        // For ERC20 tokens, use balanceOf contract call
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

    return { startSwapOrder }
}
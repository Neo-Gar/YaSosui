import { z } from 'zod'
import * as process from 'node:process'

const bool = z
    .string()
    .transform((v) => v.toLowerCase() === 'true')
    .pipe(z.boolean())

const ConfigSchema = z.object({
    SRC_CHAIN_RPC: z.string().url(),
    SUI_RPC_URL: z.string().url().optional(),
    SRC_CHAIN_CREATE_FORK: bool.default('true'),
    SUI_ESCROW_FACTORY_ADDRESS: z.string().optional(),
    SUI_PRIVATE_KEY: z.string().optional()
})

const fromEnv = ConfigSchema.parse(process.env)

export const config = {
    chain: {
        source: {
            chainId: 1, // Ethereum mainnet
            url: fromEnv.SRC_CHAIN_RPC,
            createFork: fromEnv.SRC_CHAIN_CREATE_FORK,
            limitOrderProtocol: '0x111111125421ca6dc452d289314280a0f8842a65',
            wrappedNative: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            ownerPrivateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            tokens: {
                USDC: {
                    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                    donor: '0xd54F23BE482D9A58676590fCa79c8E43087f92fB'
                }
            }
        },
        sui: {
            rpcUrl: fromEnv.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443',
            escrowFactoryAddress: fromEnv.SUI_ESCROW_FACTORY_ADDRESS || '',
            privateKey: fromEnv.SUI_PRIVATE_KEY || '',
            // Sui-specific token configuration
            tokens: {
                USDC: {
                    address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', // Sui USDC address
                    donor: '' // You'll need to provide a donor address with Sui USDC
                }
            }
        }
    }
} as const

export type ChainConfig = (typeof config.chain)['source']
export type SuiConfig = (typeof config.chain)['sui'] 
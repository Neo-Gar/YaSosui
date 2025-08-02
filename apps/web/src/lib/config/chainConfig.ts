import { z } from 'zod'
import * as process from 'node:process'
import { mainnet } from '@reown/appkit/networks'

const bool = z
    .string()
    .transform((v) => v.toLowerCase() === 'true')
    .pipe(z.boolean())

const ConfigSchema = z.object({
    EVM_CHAIN_RPC_URL: z.string().url(),
    SUI_CHAIN_RPC_URL: z.string().url().optional(),
    SRC_CHAIN_CREATE_FORK: bool.default('true'),
    SUI_ESCROW_FACTORY_ADDRESS: z.string().optional(),
    EVM_ESCROW_FACTORY_ADDRESS: z.string().optional(),
    SUI_PRIVATE_KEY: z.string().optional(),
    EVM_OWNER_PRIVATE_KEY: z.string().optional()
})

const fromEnv = ConfigSchema.parse(process.env)

export const config = {
    chain: {
        evm: {
            type: 'evm',
            rpcUrl: fromEnv.EVM_CHAIN_RPC_URL,
            limitOrderProtocol: '0x111111125421ca6dc452d289314280a0f8842a65',
            escrowFactoryAddress: fromEnv.EVM_ESCROW_FACTORY_ADDRESS || '',
            ownerPrivateKey: fromEnv.EVM_OWNER_PRIVATE_KEY || '',
            wrappedNative: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            tokens: {
                USDC: {
                    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                    donor: '0xd54F23BE482D9A58676590fCa79c8E43087f92fB'
                }
            }
        },
        sui: {
            type: 'sui',
            rpcUrl: fromEnv.SUI_CHAIN_RPC_URL,
            escrowFactoryAddress: fromEnv.SUI_ESCROW_FACTORY_ADDRESS || '',
            privateKey: fromEnv.SUI_PRIVATE_KEY || '',
            tokens: {
                USDC: {
                    address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', // Sui USDC address
                    donor: '' // You'll need to provide a donor address with Sui USDC
                }
            }
        }
    }
} as const

export type ChainConfig = (typeof config.chain)['evm']
export type SuiConfig = (typeof config.chain)['sui'] 
import { env } from '@/env'

export const config = {
    chain: {
        evm: {
            type: 'evm',
            rpcUrl: process.env.NEXT_PUBLIC_EVM_CHAIN_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
            limitOrderProtocol: '0x111111125421ca6dc452d289314280a0f8842a65',
            escrowFactoryAddress: process.env.NEXT_PUBLIC_EVM_ESCROW_FACTORY_ADDRESS || '',
            ownerPrivateKey: env.NEXT_PUBLIC_EVM_OWNER_PRIVATE_KEY,
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
            rpcUrl: process.env.NEXT_PUBLIC_SUI_CHAIN_RPC_URL || 'https://fullnode.mainnet.sui.io:443',
            escrowFactoryAddress: process.env.NEXT_PUBLIC_SUI_ESCROW_FACTORY_ADDRESS || '',
            privateKey: process.env.NEXT_PUBLIC_SUI_PRIVATE_KEY || '',
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
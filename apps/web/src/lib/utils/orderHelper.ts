import * as Sdk from '@1inch/cross-chain-sdk'
import { Address } from '@1inch/fusion-sdk'
import { parseEther } from 'viem'
import { uint8ArrayToHex, UINT_40_MAX } from '@1inch/byte-utils'

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
export function createLocalOrder(
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

import * as Sdk from '@1inch/cross-chain-sdk'
import { Address } from '@1inch/fusion-sdk'

/**
 * Interface representing the serializable data of a CrossChainOrder
 * This includes the original creation parameters since CrossChainOrder doesn't expose internal hash lock data
 */
export interface SerializedCrossChainOrder {
    // Order info
    salt: string
    maker: string
    makingAmount: string
    takingAmount: string
    makerAsset: string
    takerAsset: string

    // Escrow params
    hashLock: {
        type: 'single' | 'multiple'
        data: string | string[] // secret for single, secrets array for multiple
    }
    timeLocks: {
        srcWithdrawal: string
        srcPublicWithdrawal: string
        srcCancellation: string
        srcPublicCancellation: string
        dstWithdrawal: string
        dstPublicWithdrawal: string
        dstCancellation: string
    }
    srcChainId: number
    dstChainId: number
    srcSafetyDeposit: string
    dstSafetyDeposit: string

    // Details
    auction: {
        initialRateBump: number
        points: any[]
        duration: string
        startTime: string
    }
    whitelist: Array<{
        address: string
        allowFrom: string
    }>
    resolvingStartTime: string

    // Extra
    nonce: string
    allowPartialFills: boolean
    allowMultipleFills: boolean

    // Escrow factory
    escrowFactory: string
}

/**
 * Enhanced interface that includes the original creation parameters
 * This is more reliable for reconstruction since we store the original secrets
 */
export interface SerializedCrossChainOrderWithParams extends SerializedCrossChainOrder {
    // Original creation parameters
    originalParams: {
        secret?: string // For single fill orders
        secrets?: string[] // For multiple fill orders
        allowMultipleFills: boolean
    }
}

/**
 * Serialize a CrossChainOrder instance to a JSON-serializable object
 * Note: This requires the original creation parameters since CrossChainOrder doesn't expose internal hash lock data
 * @param order The CrossChainOrder instance to serialize
 * @param originalSecret The original secret used to create the order (for single fill)
 * @param originalSecrets The original secrets array used to create the order (for multiple fills)
 * @returns A serializable object containing all order data
 */
export function serializeCrossChainOrder(
    order: Sdk.CrossChainOrder,
    originalSecret?: string,
    originalSecrets?: string[]
): SerializedCrossChainOrderWithParams {
    // Extract order data using the build() method
    const orderData = order.build()

    // Extract extension data
    const extension = order.extension

    // Get escrow extension data
    const escrowExtension = order.escrowExtension

    // Determine hash lock type and data based on original parameters
    let hashLockType: 'single' | 'multiple'
    let hashLockData: string | string[]

    if (order.multipleFillsAllowed && originalSecrets) {
        hashLockType = 'multiple'
        hashLockData = originalSecrets
    } else if (originalSecret) {
        hashLockType = 'single'
        hashLockData = originalSecret
    } else {
        // Fallback - try to determine from order properties
        hashLockType = order.multipleFillsAllowed ? 'multiple' : 'single'
        hashLockData = order.multipleFillsAllowed ? ['placeholder'] : 'placeholder'
    }

    return {
        // Order info
        salt: order.salt.toString(),
        maker: order.maker.toString(),
        makingAmount: order.makingAmount.toString(),
        takingAmount: order.takingAmount.toString(),
        makerAsset: order.makerAsset.toString(),
        takerAsset: order.takerAsset.toString(),

        // Escrow params
        hashLock: {
            type: hashLockType,
            data: hashLockData
        },
        timeLocks: {
            srcWithdrawal: escrowExtension.timeLocks.srcWithdrawal.toString(),
            srcPublicWithdrawal: escrowExtension.timeLocks.srcPublicWithdrawal.toString(),
            srcCancellation: escrowExtension.timeLocks.srcCancellation.toString(),
            srcPublicCancellation: escrowExtension.timeLocks.srcPublicCancellation.toString(),
            dstWithdrawal: escrowExtension.timeLocks.dstWithdrawal.toString(),
            dstPublicWithdrawal: escrowExtension.timeLocks.dstPublicWithdrawal.toString(),
            dstCancellation: escrowExtension.timeLocks.dstCancellation.toString()
        },
        srcChainId: escrowExtension.srcChainId,
        dstChainId: escrowExtension.dstChainId,
        srcSafetyDeposit: escrowExtension.srcSafetyDeposit.toString(),
        dstSafetyDeposit: escrowExtension.dstSafetyDeposit.toString(),

        // Details
        auction: {
            initialRateBump: extension.auction.initialRateBump,
            points: extension.auction.points,
            duration: extension.auction.duration.toString(),
            startTime: extension.auction.startTime.toString()
        },
        whitelist: extension.whitelist.map(item => ({
            address: item.address.toString(),
            allowFrom: item.allowFrom.toString()
        })),
        resolvingStartTime: extension.resolvingStartTime.toString(),

        // Extra
        nonce: order.nonce.toString(),
        allowPartialFills: order.partialFillAllowed,
        allowMultipleFills: order.multipleFillsAllowed,

        // Escrow factory
        escrowFactory: escrowExtension.escrowFactory.toString(),

        // Original creation parameters
        originalParams: {
            secret: originalSecret,
            secrets: originalSecrets,
            allowMultipleFills: order.multipleFillsAllowed
        }
    }
}

/**
 * Deserialize a CrossChainOrder from serialized data
 * @param serialized The serialized order data
 * @returns A new CrossChainOrder instance
 */
export function deserializeCrossChainOrder(serialized: SerializedCrossChainOrderWithParams): Sdk.CrossChainOrder {
    // Reconstruct hash lock using original parameters
    let hashLock: Sdk.HashLock

    if (serialized.originalParams.allowMultipleFills && serialized.originalParams.secrets) {
        // For multiple fills, use the original secrets to recreate the leaves
        const leaves = Sdk.HashLock.getMerkleLeaves(serialized.originalParams.secrets)
        hashLock = Sdk.HashLock.forMultipleFills(leaves)
    } else if (serialized.originalParams.secret) {
        // For single fill, use the original secret
        hashLock = Sdk.HashLock.forSingleFill(serialized.originalParams.secret)
    } else {
        // Fallback - try to reconstruct from stored data
        if (serialized.hashLock.type === 'single') {
            hashLock = Sdk.HashLock.forSingleFill(serialized.hashLock.data as string)
        } else {
            const leaves = serialized.hashLock.data as string[]
            hashLock = Sdk.HashLock.forMultipleFills(leaves)
        }
    }

    // Reconstruct time locks
    const timeLocks = Sdk.TimeLocks.new({
        srcWithdrawal: BigInt(serialized.timeLocks.srcWithdrawal),
        srcPublicWithdrawal: BigInt(serialized.timeLocks.srcPublicWithdrawal),
        srcCancellation: BigInt(serialized.timeLocks.srcCancellation),
        srcPublicCancellation: BigInt(serialized.timeLocks.srcPublicCancellation),
        dstWithdrawal: BigInt(serialized.timeLocks.dstWithdrawal),
        dstPublicWithdrawal: BigInt(serialized.timeLocks.dstPublicWithdrawal),
        dstCancellation: BigInt(serialized.timeLocks.dstCancellation)
    })

    // Reconstruct auction details
    const auction = new Sdk.AuctionDetails({
        initialRateBump: serialized.auction.initialRateBump,
        points: serialized.auction.points,
        duration: BigInt(serialized.auction.duration),
        startTime: BigInt(serialized.auction.startTime)
    })

    // Reconstruct whitelist
    const whitelist = serialized.whitelist.map(item => ({
        address: new Address(item.address),
        allowFrom: BigInt(item.allowFrom)
    }))

    // Create the order using the static new method
    return Sdk.CrossChainOrder.new(
        new Address(serialized.escrowFactory),
        {
            salt: BigInt(serialized.salt),
            maker: new Address(serialized.maker),
            makingAmount: BigInt(serialized.makingAmount),
            takingAmount: BigInt(serialized.takingAmount),
            makerAsset: new Address(serialized.makerAsset),
            takerAsset: new Address(serialized.takerAsset)
        },
        {
            hashLock,
            timeLocks,
            srcChainId: serialized.srcChainId,
            dstChainId: serialized.dstChainId,
            srcSafetyDeposit: BigInt(serialized.srcSafetyDeposit),
            dstSafetyDeposit: BigInt(serialized.dstSafetyDeposit)
        },
        {
            auction,
            whitelist,
            resolvingStartTime: BigInt(serialized.resolvingStartTime)
        },
        {
            nonce: BigInt(serialized.nonce),
            allowPartialFills: serialized.allowPartialFills,
            allowMultipleFills: serialized.allowMultipleFills
        }
    )
}

/**
 * Convert a CrossChainOrder to JSON string
 * @param order The CrossChainOrder instance to serialize
 * @param originalSecret The original secret used to create the order (for single fill)
 * @param originalSecrets The original secrets array used to create the order (for multiple fills)
 * @returns JSON string representation
 */
export function orderToJson(
    order: Sdk.CrossChainOrder,
    originalSecret?: string,
    originalSecrets?: string[]
): string {
    const serialized = serializeCrossChainOrder(order, originalSecret, originalSecrets)
    return JSON.stringify(serialized)
}

/**
 * Convert a JSON string back to a CrossChainOrder instance
 * @param json The JSON string representation
 * @returns A new CrossChainOrder instance
 */
export function orderFromJson(json: string): Sdk.CrossChainOrder {
    const serialized = JSON.parse(json) as SerializedCrossChainOrderWithParams
    return deserializeCrossChainOrder(serialized)
}

/**
 * Enhanced order creation function that returns both the order and serialization data
 * This makes it easier to serialize/deserialize orders
 */
export function createOrderWithSerialization(
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
    let order: Sdk.CrossChainOrder
    let serializationData: { originalSecret?: string; originalSecrets?: string[] }

    if (allowMultipleFills && secrets) {
        // Create order with multiple fills
        const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s))
        const leaves = Sdk.HashLock.getMerkleLeaves(secrets)

        order = Sdk.CrossChainOrder.new(
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
                srcSafetyDeposit: BigInt('1000000000000000'), // 0.001 ETH
                dstSafetyDeposit: BigInt('1000000000000000')  // 0.001 ETH
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
                nonce: Sdk.randBigInt(BigInt('1099511627775')), // UINT_40_MAX
                allowPartialFills: true,
                allowMultipleFills: true
            }
        )

        serializationData = { originalSecrets: secrets }
    } else {
        // Create order with single fill
        order = Sdk.CrossChainOrder.new(
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
                srcSafetyDeposit: BigInt('1000000000000000'), // 0.001 ETH
                dstSafetyDeposit: BigInt('1000000000000000')  // 0.001 ETH
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
                nonce: Sdk.randBigInt(BigInt('1099511627775')), // UINT_40_MAX
                allowPartialFills: false,
                allowMultipleFills: false
            }
        )

        serializationData = { originalSecret: secret }
    }

    return {
        order,
        serializationData
    }
}

/**
 * Alternative serialization method that stores the order data and extension separately
 * This might be more reliable for complex orders
 */
export interface AlternativeSerializedOrder {
    orderData: {
        salt: string
        maker: string
        makingAmount: string
        takingAmount: string
        makerAsset: string
        takerAsset: string
        receiver: string
        deadline: string
        auctionStartTime: string
        auctionEndTime: string
        nonce: string
        partialFillAllowed: boolean
        multipleFillsAllowed: boolean
    }
    extension: {
        auction: {
            initialRateBump: number
            points: any[]
            duration: string
            startTime: string
        }
        whitelist: Array<{
            address: string
            allowFrom: string
        }>
        resolvingStartTime: string
    }
    escrowParams: {
        hashLock: {
            type: 'single' | 'multiple'
            data: string | string[]
        }
        timeLocks: {
            srcWithdrawal: string
            srcPublicWithdrawal: string
            srcCancellation: string
            srcPublicCancellation: string
            dstWithdrawal: string
            dstPublicWithdrawal: string
            dstCancellation: string
        }
        srcChainId: number
        dstChainId: number
        srcSafetyDeposit: string
        dstSafetyDeposit: string
    }
    escrowFactory: string
}

/**
 * Alternative serialization method
 */
export function serializeOrderAlternative(order: Sdk.CrossChainOrder): AlternativeSerializedOrder {
    return {
        orderData: {
            salt: order.salt.toString(),
            maker: order.maker.toString(),
            makingAmount: order.makingAmount.toString(),
            takingAmount: order.takingAmount.toString(),
            makerAsset: order.makerAsset.toString(),
            takerAsset: order.takerAsset.toString(),
            receiver: order.receiver.toString(),
            deadline: order.deadline.toString(),
            auctionStartTime: order.auctionStartTime.toString(),
            auctionEndTime: order.auctionEndTime.toString(),
            nonce: order.nonce.toString(),
            partialFillAllowed: order.partialFillAllowed,
            multipleFillsAllowed: order.multipleFillsAllowed
        },
        extension: {
            auction: {
                initialRateBump: order.extension.auction.initialRateBump,
                points: order.extension.auction.points,
                duration: order.extension.auction.duration.toString(),
                startTime: order.extension.auction.startTime.toString()
            },
            whitelist: order.extension.whitelist.map(item => ({
                address: item.address.toString(),
                allowFrom: item.allowFrom.toString()
            })),
            resolvingStartTime: order.extension.resolvingStartTime.toString()
        },
        escrowParams: {
            hashLock: {
                type: order.multipleFillsAllowed ? 'multiple' : 'single',
                data: order.multipleFillsAllowed ? ['placeholder'] : 'placeholder' // You'd need to extract actual data
            },
            timeLocks: {
                srcWithdrawal: order.escrowExtension.timeLocks.srcWithdrawal.toString(),
                srcPublicWithdrawal: order.escrowExtension.timeLocks.srcPublicWithdrawal.toString(),
                srcCancellation: order.escrowExtension.timeLocks.srcCancellation.toString(),
                srcPublicCancellation: order.escrowExtension.timeLocks.srcPublicCancellation.toString(),
                dstWithdrawal: order.escrowExtension.timeLocks.dstWithdrawal.toString(),
                dstPublicWithdrawal: order.escrowExtension.timeLocks.dstPublicWithdrawal.toString(),
                dstCancellation: order.escrowExtension.timeLocks.dstCancellation.toString()
            },
            srcChainId: order.escrowExtension.srcChainId,
            dstChainId: order.escrowExtension.dstChainId,
            srcSafetyDeposit: order.escrowExtension.srcSafetyDeposit.toString(),
            dstSafetyDeposit: order.escrowExtension.dstSafetyDeposit.toString()
        },
        escrowFactory: order.escrowExtension.escrowFactory.toString()
    }
} 
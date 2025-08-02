import * as Sdk from '@1inch/cross-chain-sdk'
import { Address } from '@1inch/fusion-sdk'
import { parseEther } from 'viem'
import { uint8ArrayToHex, UINT_40_MAX } from '@1inch/byte-utils'
import { randomBytes } from 'ethers'
import {
    serializeCrossChainOrder,
    deserializeCrossChainOrder,
    orderToJson,
    orderFromJson,
    createOrderWithSerialization
} from './orderSerializer'

/**
 * Example: How to serialize and deserialize a CrossChainOrder
 */
export function exampleSerializeDeserialize() {
    // Example parameters
    const escrowFactory = '0x1234567890123456789012345678901234567890'
    const maker = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    const makingAmount = parseEther('100')
    const takingAmount = parseEther('99')
    const makerAsset = '0x1111111111111111111111111111111111111111'
    const takerAsset = '0x2222222222222222222222222222222222222222'
    const secret = uint8ArrayToHex(randomBytes(32))
    const srcChainId = 1
    const dstChainId = 10
    const srcTimestamp = BigInt(Math.floor(Date.now() / 1000))
    const resolver = '0x3333333333333333333333333333333333333333'

    console.log('=== Single Fill Order Example ===')

    // Method 1: Using the enhanced creation function
    const { order: order1, serializationData } = createOrderWithSerialization(
        escrowFactory,
        maker,
        makingAmount,
        takingAmount,
        makerAsset,
        takerAsset,
        secret,
        srcChainId,
        dstChainId,
        srcTimestamp,
        resolver,
        false // allowMultipleFills = false for single fill
    )

    // Serialize to JSON
    const json1 = orderToJson(order1, serializationData.originalSecret)
    console.log('Serialized order:', json1)

    // Deserialize from JSON
    const deserializedOrder1 = orderFromJson(json1)
    console.log('Deserialized order salt:', deserializedOrder1.salt.toString())
    console.log('Deserialized order maker:', deserializedOrder1.maker.toString())

    // Method 2: Manual serialization with original parameters
    const serialized1 = serializeCrossChainOrder(order1, secret)
    const json2 = JSON.stringify(serialized1)
    const deserializedOrder2 = deserializeCrossChainOrder(JSON.parse(json2))

    console.log('=== Multiple Fill Order Example ===')

    // Create multiple fill order
    const secrets = Array.from({ length: 5 }).map(() => uint8ArrayToHex(randomBytes(32)))
    const { order: order2, serializationData: serializationData2 } = createOrderWithSerialization(
        escrowFactory,
        maker,
        makingAmount,
        takingAmount,
        makerAsset,
        takerAsset,
        secrets[0]!, // Use first secret for compatibility
        srcChainId,
        dstChainId,
        srcTimestamp,
        resolver,
        true, // allowMultipleFills = true
        secrets
    )

    // Serialize to JSON
    const json3 = orderToJson(order2, undefined, serializationData2.originalSecrets)
    console.log('Serialized multiple fill order:', json3)

    // Deserialize from JSON
    const deserializedOrder3 = orderFromJson(json3)
    console.log('Deserialized multiple fill order salt:', deserializedOrder3.salt.toString())
    console.log('Multiple fills allowed:', deserializedOrder3.multipleFillsAllowed)

    return {
        singleFillOrder: order1,
        multipleFillOrder: order2,
        serializedSingleFill: json1,
        serializedMultipleFill: json3
    }
}

/**
 * Example: Store and retrieve order from localStorage
 */
export function exampleLocalStorage() {
    const { order, serializationData } = createOrderWithSerialization(
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parseEther('100'),
        parseEther('99'),
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        uint8ArrayToHex(randomBytes(32)),
        1,
        10,
        BigInt(Math.floor(Date.now() / 1000)),
        '0x3333333333333333333333333333333333333333'
    )

    // Store in localStorage
    const json = orderToJson(order, serializationData.originalSecret)
    localStorage.setItem('savedOrder', json)

    // Retrieve from localStorage
    const savedJson = localStorage.getItem('savedOrder')
    if (savedJson) {
        const retrievedOrder = orderFromJson(savedJson)
        console.log('Retrieved order from localStorage:', retrievedOrder.salt.toString())
        return retrievedOrder
    }

    return null
}

/**
 * Example: Store order in database with serialization
 */
export function exampleDatabaseStorage() {
    const { order, serializationData } = createOrderWithSerialization(
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parseEther('100'),
        parseEther('99'),
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        uint8ArrayToHex(randomBytes(32)),
        1,
        10,
        BigInt(Math.floor(Date.now() / 1000)),
        '0x3333333333333333333333333333333333333333'
    )

    // Serialize for database storage
    const serialized = serializeCrossChainOrder(order, serializationData.originalSecret)

    // This would be stored in your database
    const databaseRecord = {
        id: 'order-123',
        serializedOrder: JSON.stringify(serialized),
        createdAt: new Date(),
        status: 'pending'
    }

    console.log('Database record:', databaseRecord)

    // Retrieve from database
    const retrievedSerialized = JSON.parse(databaseRecord.serializedOrder)
    const retrievedOrder = deserializeCrossChainOrder(retrievedSerialized)

    console.log('Retrieved order from database:', retrievedOrder.salt.toString())

    return {
        databaseRecord,
        retrievedOrder
    }
}

/**
 * Example: Compare original and deserialized orders
 */
export function exampleOrderComparison() {
    const { order: originalOrder, serializationData } = createOrderWithSerialization(
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parseEther('100'),
        parseEther('99'),
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        uint8ArrayToHex(randomBytes(32)),
        1,
        10,
        BigInt(Math.floor(Date.now() / 1000)),
        '0x3333333333333333333333333333333333333333'
    )

    // Serialize and deserialize
    const json = orderToJson(originalOrder, serializationData.originalSecret)
    const deserializedOrder = orderFromJson(json)

    // Compare key properties
    const comparison = {
        salt: {
            original: originalOrder.salt.toString(),
            deserialized: deserializedOrder.salt.toString(),
            match: originalOrder.salt.toString() === deserializedOrder.salt.toString()
        },
        maker: {
            original: originalOrder.maker.toString(),
            deserialized: deserializedOrder.maker.toString(),
            match: originalOrder.maker.toString() === deserializedOrder.maker.toString()
        },
        makingAmount: {
            original: originalOrder.makingAmount.toString(),
            deserialized: deserializedOrder.makingAmount.toString(),
            match: originalOrder.makingAmount.toString() === deserializedOrder.makingAmount.toString()
        },
        takingAmount: {
            original: originalOrder.takingAmount.toString(),
            deserialized: deserializedOrder.takingAmount.toString(),
            match: originalOrder.takingAmount.toString() === deserializedOrder.takingAmount.toString()
        },
        multipleFillsAllowed: {
            original: originalOrder.multipleFillsAllowed,
            deserialized: deserializedOrder.multipleFillsAllowed,
            match: originalOrder.multipleFillsAllowed === deserializedOrder.multipleFillsAllowed
        }
    }

    console.log('Order comparison:', comparison)

    const allMatch = Object.values(comparison).every(prop => prop.match)
    console.log('All properties match:', allMatch)

    return {
        originalOrder,
        deserializedOrder,
        comparison,
        allMatch
    }
} 
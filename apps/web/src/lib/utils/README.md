# CrossChainOrder Serialization Utilities

This module provides utilities for serializing and deserializing `CrossChainOrder` instances from the 1inch Cross-Chain SDK.

## Problem

The `CrossChainOrder` class has a private constructor and doesn't expose the internal hash lock data needed for reconstruction. This makes it challenging to serialize and deserialize orders for storage or transmission.

## Solution

The serialization utilities store the original creation parameters (secrets) along with the order data, allowing for complete reconstruction of the order.

## Usage

### Basic Serialization/Deserialization

```typescript
import { 
  serializeCrossChainOrder, 
  deserializeCrossChainOrder, 
  orderToJson, 
  orderFromJson 
} from './orderSerializer'

// Create an order (you need the original secret)
const order = createLocalOrder(/* your parameters */)
const originalSecret = 'your-secret-here'

// Serialize to JSON
const json = orderToJson(order, originalSecret)

// Deserialize from JSON
const deserializedOrder = orderFromJson(json)
```

### Enhanced Order Creation

Use the enhanced creation function that returns both the order and serialization data:

```typescript
import { createOrderWithSerialization } from './orderSerializer'

// Create order with serialization data
const { order, serializationData } = createOrderWithSerialization(
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
  allowMultipleFills,
  secrets // Optional for multiple fills
)

// Serialize with the returned data
const json = orderToJson(order, serializationData.originalSecret, serializationData.originalSecrets)
```

### Single Fill Orders

```typescript
// Create single fill order
const { order, serializationData } = createOrderWithSerialization(
  escrowFactory,
  maker,
  makingAmount,
  takingAmount,
  makerAsset,
  takerAsset,
  secret, // Single secret
  srcChainId,
  dstChainId,
  srcTimestamp,
  resolver,
  false // allowMultipleFills = false
)

// Serialize
const json = orderToJson(order, serializationData.originalSecret)
```

### Multiple Fill Orders

```typescript
// Create multiple fill order
const secrets = Array.from({ length: 5 }).map(() => generateRandomSecret())
const { order, serializationData } = createOrderWithSerialization(
  escrowFactory,
  maker,
  makingAmount,
  takingAmount,
  makerAsset,
  takerAsset,
  secrets[0], // First secret for compatibility
  srcChainId,
  dstChainId,
  srcTimestamp,
  resolver,
  true, // allowMultipleFills = true
  secrets // All secrets array
)

// Serialize
const json = orderToJson(order, undefined, serializationData.originalSecrets)
```

## Storage Examples

### localStorage

```typescript
// Store in localStorage
const json = orderToJson(order, originalSecret)
localStorage.setItem('savedOrder', json)

// Retrieve from localStorage
const savedJson = localStorage.getItem('savedOrder')
if (savedJson) {
  const retrievedOrder = orderFromJson(savedJson)
}
```

### Database Storage

```typescript
// Store in database
const serialized = serializeCrossChainOrder(order, originalSecret)
const databaseRecord = {
  id: 'order-123',
  serializedOrder: JSON.stringify(serialized),
  createdAt: new Date(),
  status: 'pending'
}

// Retrieve from database
const retrievedSerialized = JSON.parse(databaseRecord.serializedOrder)
const retrievedOrder = deserializeCrossChainOrder(retrievedSerialized)
```

## API Reference

### Functions

#### `serializeCrossChainOrder(order, originalSecret?, originalSecrets?)`
Serializes a CrossChainOrder instance to a JSON-serializable object.

**Parameters:**
- `order`: The CrossChainOrder instance to serialize
- `originalSecret`: The original secret used to create the order (for single fill)
- `originalSecrets`: The original secrets array used to create the order (for multiple fills)

**Returns:** `SerializedCrossChainOrderWithParams`

#### `deserializeCrossChainOrder(serialized)`
Deserializes a CrossChainOrder from serialized data.

**Parameters:**
- `serialized`: The serialized order data

**Returns:** `CrossChainOrder`

#### `orderToJson(order, originalSecret?, originalSecrets?)`
Converts a CrossChainOrder to JSON string.

**Parameters:**
- `order`: The CrossChainOrder instance to serialize
- `originalSecret`: The original secret used to create the order (for single fill)
- `originalSecrets`: The original secrets array used to create the order (for multiple fills)

**Returns:** `string`

#### `orderFromJson(json)`
Converts a JSON string back to a CrossChainOrder instance.

**Parameters:**
- `json`: The JSON string representation

**Returns:** `CrossChainOrder`

#### `createOrderWithSerialization(...params)`
Enhanced order creation function that returns both the order and serialization data.

**Parameters:** Same as `createLocalOrder` from `orderHelper.ts`

**Returns:** `{ order: CrossChainOrder, serializationData: { originalSecret?: string, originalSecrets?: string[] } }`

### Interfaces

#### `SerializedCrossChainOrderWithParams`
```typescript
interface SerializedCrossChainOrderWithParams {
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
  
  // Original creation parameters
  originalParams: {
    secret?: string
    secrets?: string[]
    allowMultipleFills: boolean
  }
}
```

## Important Notes

1. **Original Parameters Required**: The serialization requires the original secrets used to create the order because the `CrossChainOrder` class doesn't expose internal hash lock data.

2. **Security**: Be careful when storing secrets. Consider encrypting sensitive data before storage.

3. **Compatibility**: The serialization format is versioned through the interface structure. Future changes should maintain backward compatibility.

4. **Validation**: Always validate deserialized orders before using them in production.

## Examples

See `orderSerializerExample.ts` for complete working examples including:
- Basic serialization/deserialization
- localStorage storage
- Database storage
- Order comparison
- Single and multiple fill orders 
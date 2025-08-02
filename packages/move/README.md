# Sui Escrow Factory

This package contains the Move contracts for the Sui escrow factory used in the cross-chain resolver example.

## Overview

The escrow factory enables cross-chain escrow operations between Ethereum and Sui, allowing users to:
- Deploy escrows on Sui
- Withdraw funds using secrets
- Cancel escrows after time locks expire

## Contract Structure

### `escrow_factory.move`
Main contract containing:
- `Escrow` struct: Individual escrow instances
- `EscrowFactory` struct: Factory for managing escrows
- `deploy_escrow()`: Create new escrow instances
- `withdraw()`: Withdraw funds using secret
- `cancel_escrow()`: Cancel escrow after time lock

### `init.move`
Initialization module that sets up the factory when deployed.

## Deployment

### Prerequisites
1. Install Sui CLI:
   ```bash
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui
   ```

2. Set up Sui client:
   ```bash
   sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
   sui client switch --env testnet
   ```

### Deploy to Testnet
```bash
# Navigate to the package directory
cd sui-escrow-factory

# Run the deployment script
./deploy.sh
```

### Manual Deployment
```bash
# Build the package
sui move build

# Deploy to testnet
sui client publish --gas-budget 10000000 --network testnet
```

## Usage

### 1. Deploy Escrow
```move
// Call deploy_escrow function
escrow_factory::deploy_escrow(
    factory,
    order_hash,
    hash_lock,
    maker,
    taker,
    token,
    amount,
    safety_deposit,
    time_locks,
    payment,
    ctx
);
```

### 2. Withdraw Funds
```move
// Call withdraw function with secret
escrow_factory::withdraw(
    escrow,
    secret,
    ctx
);
```

### 3. Cancel Escrow
```move
// Call cancel_escrow function after time lock
escrow_factory::cancel_escrow(
    escrow,
    clock,
    ctx
);
```

## Integration with TypeScript

After deployment, update your `.env` file:
```env
SUI_ESCROW_FACTORY_ADDRESS=0x... # Your deployed package ID
SUI_PRIVATE_KEY=0x... # Your Sui private key
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
```

## Security Features

1. **Secret Verification**: Uses SHA3-256 hash verification
2. **Time Locks**: Prevents premature cancellation
3. **State Management**: Tracks withdrawal/cancellation status
4. **Event Emission**: All operations emit events for tracking

## Error Codes

- `EInvalidSecret (0)`: Invalid secret or already processed
- `ETimeLockNotExpired (1)`: Time lock has not expired
- `EInsufficientBalance (2)`: Insufficient balance
- `EInvalidOrderHash (3)`: Invalid order hash
- `EInvalidHashLock (4)`: Invalid hash lock

## Events

- `EscrowCreated`: Emitted when escrow is deployed
- `EscrowWithdrawn`: Emitted when funds are withdrawn
- `EscrowCancelled`: Emitted when escrow is cancelled

## Testing

The contracts are designed to work with the TypeScript test suite in the parent directory. After deployment:

1. Update your environment variables
2. Run the tests: `pnpm test tests/sui.spec.ts`

## Notes

- This is a simplified implementation for demonstration
- In production, you would need additional security measures
- Token transfers are simulated - implement actual token transfers as needed
- Consider adding more comprehensive error handling 
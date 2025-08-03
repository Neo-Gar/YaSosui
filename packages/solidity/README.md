## Deployed Contracts (Sepolia Testnet)

The following contracts have been deployed to the Sepolia testnet (Chain ID: 11155111):

### Main Contracts
- **TestEscrowFactory**: `0x7ca1dac2bbc62896a70658019435cd178c9651b2`
- **CustomEscrowFactory**: `0xe9754c50880db91939814beb8b758e6b68709cd0`
- **Resolver**: `0x4f38502d422d500f4a53294dd0074ed47319065d`

### Additional Contracts
- **CustomBaseEscrow**: `0x5bbe65544ce4af14a3f1912e46e8502ae593c4dc`
- **CustomEscrowDst**: `0xf3592b3bf56921fb6513fb28ccefa47872371f4e`
- **TestEscrowSrc**: `0x11e3a710d7a0b9c05e54f68084f174ba7f827aa3`
- **TestEscrowDst**: `0x24595ed75534bf2b60f06611070485b25450d745`
- **TestEscrowSrc2**: `0x48996defaa7cb22511e7b9da225c276f44a08327`
- **Resolver2**: `0x8c03b6684de6abdb06c078f1177a158e56d03911`

## Contract Descriptions

### Custom* Contracts

#### CustomEscrowFactory
A factory contract for creating escrow contracts for cross-chain atomic swaps. This contract deploys both source and destination escrow contracts using the proxy pattern with deterministic addresses. It handles the creation of escrow contracts for both the source chain (where the maker deposits tokens) and the destination chain (where the taker deposits tokens).

**Key Features:**
- Deploys source escrow contracts with `deploySrcEscrow()`
- Deploys destination escrow contracts with `deployDstEscrow()`
- Uses deterministic addresses based on order hashes
- Handles both ERC20 and native token deposits
- Emits events for off-chain tracking of escrow creation

#### CustomBaseEscrow
A base escrow contract that provides the core functionality for cross-chain atomic swaps. This contract implements the fundamental escrow logic including hashlock validation, fund withdrawal, and cancellation mechanisms.

**Key Features:**
- Hashlock-based secret validation
- Fund withdrawal with secret verification
- Escrow cancellation functionality
- Fund rescue capabilities
- Support for both ERC20 and native tokens

#### CustomEscrowSrc
A source chain escrow contract that extends CustomBaseEscrow. This contract handles the maker's side of the cross-chain swap on the source chain.

**Key Features:**
- Inherits all functionality from CustomBaseEscrow
- Handles ERC20 token transfers to target addresses
- Returns native tokens (safety deposits) to the caller
- Optimized for source chain operations

#### CustomEscrowDst
A destination chain escrow contract that extends CustomBaseEscrow. This contract handles the taker's side of the cross-chain swap on the destination chain.

**Key Features:**
- Inherits all functionality from CustomBaseEscrow
- Handles both ERC20 and native token transfers
- Includes additional safety checks for native token transfers
- Optimized for destination chain operations

### ICustom* Interfaces

#### ICustomBaseEscrow
Interface defining the core functionality for custom escrow contracts. This interface specifies the required methods and events for any escrow contract implementation.

**Key Methods:**
- `withdraw()` - Withdraw funds using a secret
- `cancel()` - Cancel the escrow and return funds
- `rescueFunds()` - Emergency fund rescue functionality
- `getFactoryAddress()` - Get the factory address

#### ICustomEscrowFactory
Interface defining the factory contract functionality for creating escrow contracts. This interface specifies the methods and events for the escrow factory implementation.

**Key Methods:**
- `deploySrcEscrow()` - Deploy source chain escrow
- `deployDstEscrow()` - Deploy destination chain escrow
- `getEscrowSrcImplementation()` - Get source implementation address
- `getEscrowDstImplementation()` - Get destination implementation address

**Key Events:**
- `SrcEscrowCreated` - Emitted when source escrow is created
- `DstEscrowCreated` - Emitted when destination escrow is created

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

# ETHGlobal YASOSUI Swap

A cross-chain atomic swap application enabling secure token exchanges between Ethereum and Sui networks.

## Overview

This project implements a complete cross-chain swap solution with:
- **Solidity contracts** for Ethereum escrow management
- **Move contracts** for Sui escrow management  
- **Next.js web interface** for user interactions
- **Cross-chain resolver** for coordinating swaps

## Architecture

### Smart Contracts

#### Ethereum (Solidity)
- **CustomEscrowFactory**: Factory for deploying escrow contracts
- **CustomBaseEscrow**: Base escrow functionality with hashlock validation
- **CustomEscrowSrc**: Source chain escrow for maker deposits
- **CustomEscrowDst**: Destination chain escrow for taker deposits
- **Resolver**: Cross-chain coordination and order management

#### Sui (Move)
- **EscrowFactory**: Sui-side escrow factory
- **Escrow**: Individual escrow instances with withdrawal/cancellation logic

### Web Application
- **Next.js frontend** with TypeScript and Tailwind CSS
- **Wallet integration** for both Ethereum and Sui
- **Real-time order tracking** and swap management
- **Cross-chain SDK integration** for seamless swaps

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm package manager
- Sui CLI
- Foundry (for Solidity development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ethglobal-yasosui-swap

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env
# Edit .env with your configuration
```

### Development

```bash
# Start the development server
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Contract Deployment

#### Ethereum (Sepolia)
```bash
cd packages/solidity
forge script script/DeployCustomEscrowFactory.s.sol --rpc-url <sepolia-rpc> --private-key <your-key>
```

#### Sui (Testnet)
```bash
cd packages/move
sui move build
sui client publish --gas-budget 10000000 --network testnet
```

## Project Structure

```
ethglobal-yasosui-swap/
├── apps/
│   └── web/                 # Next.js web application
├── packages/
│   ├── solidity/            # Ethereum smart contracts
│   └── move/               # Sui smart contracts
├── README.md
└── package.json
```

## Deployed Contracts

### Ethereum (Sepolia Testnet)
- **CustomEscrowFactory**: `0xe9754c50880db91939814beb8b758e6b68709cd0`
- **Resolver**: `0x4f38502d422d500f4a53294dd0074ed47319065d`
- **CustomBaseEscrow**: `0x5bbe65544ce4af14a3f1912e46e8502ae593c4dc`
- **CustomEscrowDst**: `0xf3592b3bf56921fb6513fb28ccefa47872371f4e`

### Sui (Testnet)
- **EscrowFactory**: Deployed package ID (update in .env)

## Features

- 🔄 **Cross-chain atomic swaps** between Ethereum and Sui
- 🔒 **Hashlock-based security** with time-locked escrows
- 💰 **Support for ERC20 and native tokens**
- 🎯 **Deterministic escrow addresses** for gas optimization
- 📱 **Modern web interface** with wallet integration
- ⚡ **Real-time order tracking** and status updates

## Security

- Hashlock verification using SHA3-256
- Time-locked cancellation mechanisms
- Deterministic address generation
- Comprehensive error handling
- Event emission for off-chain tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license here]

## Links

- [ETHGlobal](https://ethglobal.com/)
- [Sui Documentation](https://docs.sui.io/)
- [1inch Cross-chain SDK](https://github.com/1inch/cross-chain-sdk)

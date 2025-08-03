# YaSosui - Cross-Chain Atomic Swaps

A comprehensive cross-chain atomic swap platform enabling secure token exchanges between Ethereum and Sui networks with a modern web interface.

## 🚀 Overview

YaSosui is a complete cross-chain swap solution that allows users to securely exchange tokens between Ethereum and Sui blockchains using atomic swaps. The platform features hashlock-based security, time-locked escrows, and a user-friendly web interface.

## 🏗️ Architecture

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

## 🛠️ Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Blockchain**: Solidity (Ethereum), Move (Sui)
- **Database**: Prisma, PostgreSQL
- **API**: tRPC
- **Testing**: Jest, Foundry
- **Package Manager**: pnpm

## 📁 Project Structure

```
YaSosui/
├── apps/
│   └── web/                 # Next.js web application
│       ├── src/
│       │   ├── app/         # App router pages
│       │   ├── components/  # React components
│       │   ├── context/     # React contexts
│       │   ├── lib/         # Utilities and configurations
│       │   ├── server/      # tRPC API routes
│       │   └── styles/      # Global styles
│       ├── prisma/          # Database schema and migrations
│       └── tests/           # Test files
├── packages/
│   ├── solidity/            # Ethereum smart contracts
│   │   ├── src/             # Contract source files
│   │   ├── test/            # Foundry tests
│   │   └── script/          # Deployment scripts
│   └── move/               # Sui smart contracts
│       └── sources/         # Move source files
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm package manager
- Sui CLI
- Foundry (for Solidity development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd YaSosui

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

## 🔧 Features

- 🔄 **Cross-chain atomic swaps** between Ethereum and Sui
- 🔒 **Hashlock-based security** with time-locked escrows
- 💰 **Support for ERC20 and native tokens**
- 🎯 **Deterministic escrow addresses** for gas optimization
- 📱 **Modern web interface** with wallet integration
- ⚡ **Real-time order tracking** and status updates
- 🗄️ **Database persistence** for order management
- 🔍 **Order history** and status monitoring

## 🏛️ Deployed Contracts

### Ethereum (Sepolia Testnet)

- **CustomEscrowFactory**: `0xe9754c50880db91939814beb8b758e6b68709cd0`
- **Resolver**: `0x4f38502d422d500f4a53294dd0074ed47319065d`
- **CustomBaseEscrow**: `0x5bbe65544ce4af14a3f1912e46e8502ae593c4dc`
- **CustomEscrowDst**: `0xf3592b3bf56921fb6513fb28ccefa47872371f4e`

### Sui (Testnet)

- **EscrowFactory**: Deployed package ID (update in .env)

## 🔐 Security

- Hashlock verification using SHA3-256
- Time-locked cancellation mechanisms
- Deterministic address generation
- Comprehensive error handling
- Event emission for off-chain tracking

## 🧪 Testing

```bash
# Run frontend tests
cd apps/web
pnpm test

# Run Solidity tests
cd packages/solidity
forge test

# Run Move tests
cd packages/move
sui move test
```

## 📝 API Documentation

The project uses tRPC for type-safe API communication. API routes are defined in `apps/web/src/server/api/routers/`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [ETHGlobal](https://ethglobal.com/)
- [Sui Documentation](https://docs.sui.io/)
- [1inch Cross-chain SDK](https://github.com/1inch/cross-chain-sdk)
- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/)

## 🙏 Acknowledgments

- ETHGlobal for the hackathon platform
- Sui Foundation for blockchain infrastructure
- 1inch for cross-chain SDK
- OpenZeppelin for secure smart contract libraries

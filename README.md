# Private Inheritance Distribution Platform

A private inheritance distribution platform built on Zama FHEVM. Heirs can only see their own allocations - preventing family disputes over inheritance comparisons.

## Features

- **Private Allocations** - Heir amounts encrypted via FHE, visible only to the individual heir
- **Executor Oversight** - Full visibility for the executor for legal compliance
- **Dispute Prevention** - Cryptographic guarantee that heirs cannot see siblings' allocations
- **On-chain Audit Trail** - Immutable record of all distributions
- **ERC-7984 Tokens** - Confidential token standard for private transfers

## Architecture

```
                                    INHERITANCE DISTRIBUTION PLATFORM

    +------------------+                                      +------------------+
    |     EXECUTOR     |                                      |      HEIR A      |
    |------------------|                                      |------------------|
    | - Create estate  |                                      | - View own only  |
    | - Add heirs      |         +------------------+         | - Claim tokens   |
    | - Set allocation |-------->| FHEVM ENCRYPTED  |<--------| - Private balance|
    | - View all       |         |    SMART CONTRACT |         +------------------+
    | - Finalize       |         |------------------|
    +------------------+         | euint64 alloc[A] |         +------------------+
                                 | euint64 alloc[B] |         |      HEIR B      |
                                 | euint64 alloc[C] |         |------------------|
                                 +------------------+         | - View own only  |
                                          |                   | - Claim tokens   |
                                          v                   | - Private balance|
                                 +------------------+         +------------------+
                                 |   ACL PERMISSIONS |
                                 |------------------|         +------------------+
                                 | A -> alloc[A]    |         |      HEIR C      |
                                 | B -> alloc[B]    |         |------------------|
                                 | C -> alloc[C]    |         | - View own only  |
                                 | Exec -> ALL      |         | - Claim tokens   |
                                 +------------------+         +------------------+
```

## Flow

```
1. SETUP                    2. ALLOCATION                3. CLAIM
+---------------+           +---------------+            +---------------+
| Executor      |           | Executor      |            | Heir          |
| deploys       |           | adds heirs    |            | decrypts own  |
| estate +      |   ---->   | with encrypted|   ---->    | allocation    |
| token         |           | amounts       |            | and claims    |
+---------------+           +---------------+            +---------------+
                                    |
                                    v
                            +---------------+
                            | FHE encrypts  |
                            | each amount   |
                            | separately    |
                            +---------------+
```

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| InheritanceToken | [0xAA08392dCe7F8048a7Fe98AD99Db426A55572Fb7](https://sepolia.etherscan.io/address/0xAA08392dCe7F8048a7Fe98AD99Db426A55572Fb7) |
| InheritanceDistribution | [0x83Aa168738009905576b0D42Eb94e2841825A318](https://sepolia.etherscan.io/address/0x83Aa168738009905576b0D42Eb94e2841825A318) |

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Deploy to Sepolia
npm run deploy:sepolia

# Run frontend
cd frontend && npm install && npm run dev
```

## Tech Stack

- Solidity 0.8.24 + Zama FHEVM v0.9
- Hardhat
- React + Vite + TypeScript
- @zama-fhe/relayer-sdk

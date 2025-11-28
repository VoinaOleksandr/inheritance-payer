# Inheritance Distribution Frontend

A React-based frontend for the Private Inheritance Distribution Platform built on Zama Protocol FHEVM.

## Prerequisites

- Node.js 18+
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH for gas fees
- Deployed smart contracts (token and distribution)

## Installation

```bash
npm install
```

## Configuration

1. Copy the environment example file:
```bash
cp .env.example .env
```

2. Set your deployed contract addresses in `.env`:
```bash
VITE_TOKEN_ADDRESS=0x...      # ConfidentialToken contract address
VITE_DISTRIBUTION_ADDRESS=0x... # InheritanceDistribution contract address
```

## Running the App

### Development
```bash
npm run dev
```
Opens at http://localhost:5173

### Production Build
```bash
npm run build
npm run preview
```

## How to Use

### For Executors

1. **Connect Wallet**: Click "Connect Wallet" and approve the connection in MetaMask. The app will prompt you to switch to Sepolia if needed.

2. **Setup Estate** (first time):
   - Click "Mint Tokens" to create initial token supply
   - Click "Setup Operator" to authorize the distribution contract
   - Click "Deposit Tokens" to fund the estate

3. **Add Heirs**:
   - Enter the heir's wallet address
   - Enter the allocation amount (will be encrypted)
   - Click "Add Heir"
   - Repeat for each heir

4. **Manage Estate**:
   - View all heirs and their encrypted allocations
   - Click on a heir to decrypt and view their allocation
   - Remove heirs if needed before finalizing

5. **Finalize Estate**:
   - Once all heirs are added, click "Finalize Estate"
   - This locks the estate and allows heirs to claim

### For Heirs

1. **Connect Wallet**: Connect with the wallet address the executor registered.

2. **View Your Allocation**:
   - Click "Decrypt Allocation" to reveal your inheritance amount
   - Sign the EIP-712 message in your wallet to authorize decryption

3. **Claim Inheritance**:
   - Once the estate is finalized, the "Claim" button becomes available
   - Click "Claim" to receive your allocation
   - Confirm the transaction in your wallet

### Privacy Features

- Heirs can only see their own allocation
- Heirs cannot see other heirs' allocations or even know who they are
- Executor can view all allocations for oversight
- All allocation amounts are encrypted on-chain using FHE

## Wallet Setup

1. Install [MetaMask](https://metamask.io/)
2. Add Sepolia testnet (the app will prompt automatically)
3. Get Sepolia ETH from a [faucet](https://sepoliafaucet.com/)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Wrong network" | Click the network switch prompt or manually switch to Sepolia in MetaMask |
| "Not authorized" | Your address is not registered as executor or heir |
| Decryption fails | Ensure you sign the EIP-712 message; try disconnecting and reconnecting |
| Transaction fails | Check you have enough Sepolia ETH for gas |
| FHEVM not initializing | Refresh the page; ensure wallet is connected |

## Architecture

```
src/
├── App.tsx              # Main app with role-based routing
├── core/
│   └── fhevm.ts         # FHEVM SDK initialization
├── hooks/
│   ├── useWallet.ts     # Wallet connection & chain management
│   ├── useFhevm.ts      # FHEVM state management
│   ├── useEncrypt.ts    # Encryption operations
│   ├── useDecrypt.ts    # Decryption with EIP-712 signatures
│   └── useInheritance.ts # Contract interactions
└── components/
    ├── ConnectWallet.tsx    # Wallet connection UI
    ├── ExecutorDashboard.tsx # Executor management view
    ├── HeirDashboard.tsx    # Heir view (own allocation only)
    ├── AddHeirForm.tsx      # Add heir form
    ├── AllocationCard.tsx   # Allocation display
    └── ClaimButton.tsx      # Claim inheritance button
```
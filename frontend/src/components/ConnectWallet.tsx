import { Wallet, AlertCircle } from "lucide-react";
import "./ConnectWallet.css";

interface ConnectWalletProps {
  onConnect: () => void;
  isConnecting: boolean;
  error: string | null;
}

export function ConnectWallet({ onConnect, isConnecting, error }: ConnectWalletProps) {
  return (
    <div className="connect-wallet">
      <div className="connect-wallet-content">
        <div className="connect-wallet-icon">
          <Wallet size={48} />
        </div>
        <h1>Private Inheritance Distribution</h1>
        <p className="connect-wallet-description">
          Secure estate distribution where each heir sees only their own allocation.
        </p>

        {error && (
          <div className="error-message flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          className="btn btn-primary btn-lg"
          onClick={onConnect}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>

        <p className="connect-wallet-note">
          Connect with MetaMask on Sepolia testnet
        </p>
      </div>
    </div>
  );
}

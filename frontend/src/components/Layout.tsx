import { ReactNode } from "react";
import { Shield } from "lucide-react";
import "./Layout.css";

interface LayoutProps {
  children: ReactNode;
  address?: string;
  onDisconnect?: () => void;
}

export function Layout({ children, address, onDisconnect }: LayoutProps) {
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <div className="layout">
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <Shield size={24} />
            <span>Inheritance</span>
          </div>
          {address && (
            <div className="header-right">
              <span className="address-short">{shortAddress}</span>
              <button className="btn btn-secondary btn-sm" onClick={onDisconnect}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <p className="text-muted text-center">
            Private inheritance distribution powered by FHE
          </p>
        </div>
      </footer>
    </div>
  );
}

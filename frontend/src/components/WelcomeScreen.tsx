import { Plus, Shield, Lock, Users } from "lucide-react";

interface WelcomeScreenProps {
  hasEstates: boolean;
  onCreate: () => void;
}

export function WelcomeScreen({ hasEstates, onCreate }: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">
          <Shield size={48} />
        </div>
        <h1>Private Inheritance Distribution</h1>
        <p className="welcome-description">
          Distribute assets to heirs with complete privacy. Each heir can only see their own allocation,
          preventing family disputes over inheritance comparisons.
        </p>

        {hasEstates ? (
          <div className="welcome-prompt">
            <p>Select an estate from the sidebar to view details, or create a new one.</p>
          </div>
        ) : (
          <div className="welcome-prompt">
            <p>Get started by creating your first estate.</p>
            <button className="btn btn-primary btn-lg" onClick={onCreate}>
              <Plus size={20} />
              Create Your First Estate
            </button>
          </div>
        )}

        <div className="features-grid">
          <div className="feature-card">
            <Lock size={24} />
            <h3>Private Allocations</h3>
            <p>Heir amounts are encrypted using FHE technology. Each heir can only view their own share.</p>
          </div>
          <div className="feature-card">
            <Users size={24} />
            <h3>Executor Oversight</h3>
            <p>As executor, you have full visibility of all allocations for legal compliance.</p>
          </div>
          <div className="feature-card">
            <Shield size={24} />
            <h3>On-Chain Audit</h3>
            <p>Immutable record of all distributions on the blockchain for transparency.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

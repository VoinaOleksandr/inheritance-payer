import { useState, useEffect } from "react";
import { Lock, RefreshCw, Coins, Settings } from "lucide-react";
import { EstateStatus } from "./EstateStatus";
import { AllocationCard } from "./AllocationCard";
import { AddHeirForm } from "./AddHeirForm";
import { LoadingState } from "./LoadingState";
import type { EstateInfo } from "../hooks";
import "./ExecutorDashboard.css";

interface HeirData {
  address: string;
  allocation: bigint | null;
  claimed: boolean;
}

interface ExecutorDashboardProps {
  estateInfo: EstateInfo;
  heirs: string[];
  isLoading: boolean;
  onAddHeir: (address: string, allocation: bigint) => Promise<void>;
  onRemoveHeir: (address: string) => Promise<void>;
  onFinalize: () => Promise<void>;
  onMintTokens: (amount: bigint) => Promise<void>;
  onSetupOperator: () => Promise<void>;
  onDepositTokens: (amount: bigint) => Promise<void>;
  onGetHeirAllocation: (address: string) => Promise<bigint | null>;
  onCheckClaimed: (address: string) => Promise<boolean>;
}

export function ExecutorDashboard({
  estateInfo,
  heirs,
  isLoading,
  onAddHeir,
  onRemoveHeir,
  onFinalize,
  onMintTokens,
  onSetupOperator,
  onDepositTokens,
  onGetHeirAllocation,
  onCheckClaimed,
}: ExecutorDashboardProps) {
  const [heirData, setHeirData] = useState<Map<string, HeirData>>(new Map());
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [mintAmount, setMintAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Load heir data
  useEffect(() => {
    const loadHeirData = async () => {
      const data = new Map<string, HeirData>();
      for (const addr of heirs) {
        const claimed = await onCheckClaimed(addr);
        data.set(addr, {
          address: addr,
          allocation: null,
          claimed,
        });
      }
      setHeirData(data);
    };

    if (heirs.length > 0) {
      loadHeirData();
    }
  }, [heirs, onCheckClaimed]);

  const handleDecryptAllocation = async (address: string) => {
    const allocation = await onGetHeirAllocation(address);
    setHeirData((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(address);
      if (existing) {
        updated.set(address, { ...existing, allocation });
      }
      return updated;
    });
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      await onFinalize();
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleMint = async () => {
    const amount = parseFloat(mintAmount);
    if (isNaN(amount) || amount <= 0) return;
    setIsSettingUp(true);
    try {
      await onMintTokens(BigInt(Math.floor(amount * 1_000_000)));
      setMintAmount("");
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSetupOperator = async () => {
    setIsSettingUp(true);
    try {
      await onSetupOperator();
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    setIsSettingUp(true);
    try {
      await onDepositTokens(BigInt(Math.floor(amount * 1_000_000)));
      setDepositAmount("");
    } finally {
      setIsSettingUp(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading estate..." />;
  }

  return (
    <div className="executor-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Estate Management</h1>
          <p className="text-secondary">
            Manage heirs and allocations for the inheritance distribution.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setShowSetup(!showSetup)}
        >
          <Settings size={16} />
          Setup
        </button>
      </div>

      {showSetup && (
        <div className="setup-section card">
          <h3>Token Setup</h3>
          <p className="text-muted mb-4">Mint tokens and deposit them into the distribution contract.</p>

          <div className="setup-grid">
            <div className="setup-item">
              <label>Mint Tokens</label>
              <div className="setup-input-group">
                <input
                  type="number"
                  placeholder="Amount"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  disabled={isSettingUp}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleMint}
                  disabled={isSettingUp || !mintAmount}
                >
                  <Coins size={14} />
                  Mint
                </button>
              </div>
            </div>

            <div className="setup-item">
              <label>Setup Operator</label>
              <button
                className="btn btn-secondary w-full"
                onClick={handleSetupOperator}
                disabled={isSettingUp}
              >
                Enable Distribution Contract
              </button>
            </div>

            <div className="setup-item">
              <label>Deposit to Contract</label>
              <div className="setup-input-group">
                <input
                  type="number"
                  placeholder="Amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  disabled={isSettingUp}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleDeposit}
                  disabled={isSettingUp || !depositAmount}
                >
                  Deposit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EstateStatus estate={estateInfo} heirCount={heirs.length} />

      <div className="dashboard-content">
        <div className="heirs-section">
          <div className="section-header">
            <h2>Heirs ({heirs.length})</h2>
            {!estateInfo.finalized && heirs.length > 0 && (
              <button
                className="btn btn-primary"
                onClick={handleFinalize}
                disabled={isFinalizing}
              >
                {isFinalizing ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Finalize Estate
                  </>
                )}
              </button>
            )}
          </div>

          {heirs.length === 0 ? (
            <div className="empty-state">
              <p>No heirs added yet. Add your first heir to begin.</p>
            </div>
          ) : (
            <div className="heirs-grid">
              {heirs.map((addr) => {
                const data = heirData.get(addr);
                return (
                  <AllocationCard
                    key={addr}
                    address={addr}
                    allocation={data?.allocation ?? null}
                    claimed={data?.claimed ?? false}
                    onDecrypt={() => handleDecryptAllocation(addr)}
                    showActions={!estateInfo.finalized}
                    onRemove={() => onRemoveHeir(addr)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {!estateInfo.finalized && (
          <div className="add-heir-section">
            <AddHeirForm onAddHeir={onAddHeir} isLoading={isLoading} />
          </div>
        )}
      </div>
    </div>
  );
}

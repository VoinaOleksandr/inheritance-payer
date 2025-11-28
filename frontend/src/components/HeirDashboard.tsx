import { useState } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { EstateStatus } from "./EstateStatus";
import { ClaimButton } from "./ClaimButton";
import { LoadingState } from "./LoadingState";
import type { EstateInfo } from "../hooks";
import "./HeirDashboard.css";

interface HeirDashboardProps {
  estateInfo: EstateInfo;
  heirCount: number;
  myAllocation: bigint | null;
  hasClaimed: boolean;
  isLoading: boolean;
  onDecryptAllocation: () => Promise<void>;
  onClaim: () => Promise<void>;
}

export function HeirDashboard({
  estateInfo,
  heirCount,
  myAllocation,
  hasClaimed,
  isLoading,
  onDecryptAllocation,
  onClaim,
}: HeirDashboardProps) {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleDecrypt = async () => {
    setIsDecrypting(true);
    try {
      await onDecryptAllocation();
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await onClaim();
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading your inheritance..." />;
  }

  return (
    <div className="heir-dashboard">
      <div className="dashboard-header">
        <h1>Your Inheritance</h1>
        <p className="text-secondary">
          View and claim your private allocation from the estate.
        </p>
      </div>

      <EstateStatus estate={estateInfo} heirCount={heirCount} />

      <div className="heir-allocation-section">
        {myAllocation === null && !hasClaimed ? (
          <div className="decrypt-prompt">
            <div className="decrypt-prompt-content">
              <h3>Your allocation is encrypted</h3>
              <p>
                Click below to securely decrypt and view your inheritance amount.
                Only you can see this value.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleDecrypt}
                disabled={isDecrypting}
              >
                {isDecrypting ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    View My Allocation
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <ClaimButton
            allocation={myAllocation}
            hasClaimed={hasClaimed}
            canClaim={estateInfo.finalized && !hasClaimed}
            isLoading={isClaiming}
            onClaim={handleClaim}
          />
        )}
      </div>

      <div className="privacy-notice">
        <p>
          Your allocation amount is encrypted and only visible to you.
          Other heirs cannot see your inheritance.
        </p>
      </div>
    </div>
  );
}

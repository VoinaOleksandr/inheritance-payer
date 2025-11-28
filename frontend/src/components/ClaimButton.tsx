import { Gift, CheckCircle, Loader } from "lucide-react";
import "./ClaimButton.css";

interface ClaimButtonProps {
  allocation: bigint | null;
  hasClaimed: boolean;
  canClaim: boolean;
  isLoading: boolean;
  onClaim: () => void;
}

export function ClaimButton({
  allocation,
  hasClaimed,
  canClaim,
  isLoading,
  onClaim,
}: ClaimButtonProps) {
  const formattedAllocation = allocation !== null
    ? (Number(allocation) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })
    : "---";

  if (hasClaimed) {
    return (
      <div className="claim-container claimed">
        <div className="claim-icon success">
          <CheckCircle size={32} />
        </div>
        <div className="claim-content">
          <h3>Inheritance Claimed</h3>
          <p>You have successfully claimed your allocation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="claim-container">
      <div className="claim-amount-display">
        <span className="claim-label">Your Inheritance</span>
        <span className="claim-amount">{formattedAllocation}</span>
        <span className="claim-token">INHERIT</span>
      </div>

      <button
        className="btn btn-success btn-lg claim-btn"
        onClick={onClaim}
        disabled={!canClaim || isLoading || allocation === null}
      >
        {isLoading ? (
          <>
            <Loader size={20} className="spin" />
            Claiming...
          </>
        ) : (
          <>
            <Gift size={20} />
            Claim Inheritance
          </>
        )}
      </button>

      {!canClaim && (
        <p className="claim-note">
          The estate must be finalized before you can claim.
        </p>
      )}
    </div>
  );
}

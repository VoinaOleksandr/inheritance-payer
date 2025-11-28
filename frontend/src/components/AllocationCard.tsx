import { Eye, CheckCircle, Clock } from "lucide-react";
import "./AllocationCard.css";

interface AllocationCardProps {
  address: string;
  allocation: bigint | null;
  claimed: boolean;
  isLoading?: boolean;
  onDecrypt?: () => void;
  showActions?: boolean;
  onRemove?: () => void;
}

export function AllocationCard({
  address,
  allocation,
  claimed,
  isLoading,
  onDecrypt,
  showActions,
  onRemove,
}: AllocationCardProps) {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const formattedAllocation = allocation !== null
    ? (Number(allocation) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })
    : null;

  return (
    <div className={`allocation-card ${claimed ? "claimed" : ""}`}>
      <div className="allocation-card-header">
        <span className="address-short">{shortAddress}</span>
        {claimed ? (
          <span className="badge badge-success">
            <CheckCircle size={12} />
            Claimed
          </span>
        ) : (
          <span className="badge badge-warning">
            <Clock size={12} />
            Pending
          </span>
        )}
      </div>

      <div className="allocation-card-body">
        {isLoading ? (
          <div className="skeleton allocation-skeleton" />
        ) : allocation !== null ? (
          <div className="allocation-amount">
            <span className="amount">{formattedAllocation}</span>
            <span className="amount-label">INHERIT</span>
          </div>
        ) : (
          <button
            className="btn btn-secondary btn-sm decrypt-btn"
            onClick={onDecrypt}
          >
            <Eye size={14} />
            Reveal Amount
          </button>
        )}
      </div>

      {showActions && !claimed && onRemove && (
        <div className="allocation-card-actions">
          <button className="btn btn-danger btn-sm" onClick={onRemove}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

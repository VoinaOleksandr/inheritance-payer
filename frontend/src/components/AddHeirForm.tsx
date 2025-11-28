import { useState } from "react";
import { UserPlus, AlertCircle } from "lucide-react";
import "./AddHeirForm.css";

interface AddHeirFormProps {
  onAddHeir: (address: string, allocation: bigint) => Promise<void>;
  isLoading: boolean;
}

export function AddHeirForm({ onAddHeir, isLoading }: AddHeirFormProps) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address || !address.startsWith("0x") || address.length !== 42) {
      setError("Please enter a valid Ethereum address");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert to token units (6 decimals)
      const allocationBigInt = BigInt(Math.floor(amountNum * 1_000_000));
      await onAddHeir(address, allocationBigInt);
      setAddress("");
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add heir");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card add-heir-form">
      <div className="card-header">
        <h3 className="card-title">Add Heir</h3>
        <p className="card-description">Add a beneficiary with an encrypted allocation</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="heir-address">Heir Address</label>
          <input
            id="heir-address"
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isLoading || isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="allocation">Allocation Amount</label>
          <div className="input-with-suffix">
            <input
              id="allocation"
              type="number"
              placeholder="0.00"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading || isSubmitting}
            />
            <span className="input-suffix">INHERIT</span>
          </div>
        </div>

        {error && (
          <div className="error-message flex items-center gap-2 mb-4">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isLoading || isSubmitting}
        >
          <UserPlus size={16} />
          {isSubmitting ? "Adding Heir..." : "Add Heir"}
        </button>
      </form>
    </div>
  );
}

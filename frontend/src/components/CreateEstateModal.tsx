import { useState } from "react";
import { X, Plus, Loader2 } from "lucide-react";

interface CreateEstateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<number>;
}

export function CreateEstateModal({ isOpen, onClose, onCreate }: CreateEstateModalProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Estate name is required");
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      await onCreate(name.trim());
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create estate");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName("");
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Estate</h2>
          <button
            className="btn-icon"
            onClick={handleClose}
            disabled={isCreating}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="estate-name">Estate Name</label>
              <input
                id="estate-name"
                type="text"
                placeholder="e.g., Family Trust 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                autoFocus
              />
              <p className="form-hint">
                Choose a descriptive name for this inheritance distribution.
              </p>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating || !name.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Estate
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

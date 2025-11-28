import { Plus, Briefcase, User } from "lucide-react";
import { EstateCard } from "./EstateCard";
import type { EstateListItem } from "../types";

interface EstateSelectorProps {
  executorEstates: EstateListItem[];
  heirEstates: EstateListItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
}

export function EstateSelector({
  executorEstates,
  heirEstates,
  selectedId,
  onSelect,
  onCreate,
}: EstateSelectorProps) {
  const hasEstates = executorEstates.length > 0 || heirEstates.length > 0;

  return (
    <div className="estate-selector">
      <div className="estate-selector-header">
        <h2>Estates</h2>
        <button className="btn btn-primary btn-sm" onClick={onCreate}>
          <Plus size={16} />
          New
        </button>
      </div>

      <div className="estate-selector-content">
        {executorEstates.length > 0 && (
          <div className="estate-group">
            <h3 className="estate-group-label">
              <Briefcase size={14} />
              Managing
            </h3>
            <div className="estate-list">
              {executorEstates.map((estate) => (
                <EstateCard
                  key={estate.id}
                  estate={estate}
                  isSelected={selectedId === estate.id}
                  onClick={() => onSelect(estate.id)}
                />
              ))}
            </div>
          </div>
        )}

        {heirEstates.length > 0 && (
          <div className="estate-group">
            <h3 className="estate-group-label">
              <User size={14} />
              Beneficiary
            </h3>
            <div className="estate-list">
              {heirEstates.map((estate) => (
                <EstateCard
                  key={estate.id}
                  estate={estate}
                  isSelected={selectedId === estate.id}
                  onClick={() => onSelect(estate.id)}
                />
              ))}
            </div>
          </div>
        )}

        {!hasEstates && (
          <div className="empty-state">
            <p>No estates found.</p>
            <p className="text-muted">Create your first estate to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

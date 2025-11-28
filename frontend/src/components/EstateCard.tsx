import { Briefcase, User, Lock, Unlock } from "lucide-react";
import type { EstateListItem } from "../types";

interface EstateCardProps {
  estate: EstateListItem;
  isSelected: boolean;
  onClick: () => void;
}

export function EstateCard({ estate, isSelected, onClick }: EstateCardProps) {
  return (
    <button
      className={`estate-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="estate-card-header">
        <span className="estate-name">{estate.name}</span>
        <span className={`badge ${estate.role === "executor" ? "badge-executor" : "badge-heir"}`}>
          {estate.role === "executor" ? (
            <>
              <Briefcase size={12} />
              Executor
            </>
          ) : (
            <>
              <User size={12} />
              Heir
            </>
          )}
        </span>
      </div>
      <div className="estate-card-footer">
        <span className={`status ${estate.finalized ? "finalized" : "open"}`}>
          {estate.finalized ? (
            <>
              <Lock size={12} />
              Finalized
            </>
          ) : (
            <>
              <Unlock size={12} />
              Open
            </>
          )}
        </span>
        <span className="estate-id">#{estate.id}</span>
      </div>
    </button>
  );
}

import { Clock, CheckCircle, Users, Lock } from "lucide-react";
import type { EstateInfo } from "../hooks";
import "./EstateStatus.css";

interface EstateStatusProps {
  estate: EstateInfo;
  heirCount: number;
}

export function EstateStatus({ estate, heirCount }: EstateStatusProps) {
  const createdDate = new Date(estate.createdAt * 1000).toLocaleDateString();

  return (
    <div className="estate-status">
      <div className="estate-status-grid">
        <div className="estate-stat">
          <div className="estate-stat-icon">
            <Clock size={20} />
          </div>
          <div className="estate-stat-content">
            <span className="estate-stat-label">Created</span>
            <span className="estate-stat-value">{createdDate}</span>
          </div>
        </div>

        <div className="estate-stat">
          <div className="estate-stat-icon">
            <Users size={20} />
          </div>
          <div className="estate-stat-content">
            <span className="estate-stat-label">Heirs</span>
            <span className="estate-stat-value">{heirCount}</span>
          </div>
        </div>

        <div className="estate-stat">
          <div className={`estate-stat-icon ${estate.finalized ? "success" : "warning"}`}>
            {estate.finalized ? <Lock size={20} /> : <CheckCircle size={20} />}
          </div>
          <div className="estate-stat-content">
            <span className="estate-stat-label">Status</span>
            <span className={`estate-stat-value ${estate.finalized ? "text-success" : "text-warning"}`}>
              {estate.finalized ? "Finalized" : "Open"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

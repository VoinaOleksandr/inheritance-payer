import { Loader } from "lucide-react";
import "./LoadingState.css";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <Loader size={32} className="spin" />
      <p>{message}</p>
    </div>
  );
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="loading-skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            width: `${Math.max(40, Math.random() * 60 + 40)}%`,
            height: "20px",
          }}
        />
      ))}
    </div>
  );
}

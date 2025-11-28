import { useState, useCallback } from "react";
import { initializeFheInstance, getFheInstance } from "../core/fhevm";

export type FhevmStatus = "idle" | "loading" | "ready" | "error";

export function useFhevm() {
  const [status, setStatus] = useState<FhevmStatus>(
    getFheInstance() ? "ready" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (status === "loading" || status === "ready") return;

    setStatus("loading");
    setError(null);

    try {
      await initializeFheInstance();
      setStatus("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("error");
    }
  }, [status]);

  return {
    status,
    error,
    initialize,
    isInitialized: status === "ready",
    isLoading: status === "loading",
  };
}

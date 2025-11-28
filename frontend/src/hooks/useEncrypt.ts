import { useState, useCallback } from "react";
import { getFheInstance } from "../core/fhevm";

interface EncryptedInput {
  handles: Uint8Array[];
  inputProof: Uint8Array;
}

export function useEncrypt() {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encrypt64 = useCallback(async (
    contractAddress: string,
    userAddress: string,
    value: bigint
  ): Promise<EncryptedInput | null> => {
    const instance = getFheInstance();
    if (!instance) {
      setError("FHEVM not initialized");
      return null;
    }

    setIsEncrypting(true);
    setError(null);

    try {
      const input = instance.createEncryptedInput(contractAddress, userAddress);
      input.add64(value);
      const encrypted = await input.encrypt();
      return encrypted as EncryptedInput;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsEncrypting(false);
    }
  }, []);

  const encryptMultiple64 = useCallback(async (
    contractAddress: string,
    userAddress: string,
    values: bigint[]
  ): Promise<EncryptedInput | null> => {
    const instance = getFheInstance();
    if (!instance) {
      setError("FHEVM not initialized");
      return null;
    }

    setIsEncrypting(true);
    setError(null);

    try {
      const input = instance.createEncryptedInput(contractAddress, userAddress);
      for (const value of values) {
        input.add64(value);
      }
      const encrypted = await input.encrypt();
      return encrypted as EncryptedInput;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsEncrypting(false);
    }
  }, []);

  return {
    encrypt64,
    encryptMultiple64,
    isEncrypting,
    error,
  };
}

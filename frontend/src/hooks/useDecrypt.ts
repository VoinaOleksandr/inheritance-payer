import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { getFheInstance } from "../core/fhevm";

interface DecryptHandle {
  handle: string;
  contractAddress: string;
}

export function useDecrypt() {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decrypt = useCallback(async (
    handles: DecryptHandle[],
    signer: ethers.Signer,
    userAddress: string,
    contractAddresses: string[]
  ): Promise<Map<string, bigint>> => {
    const instance = getFheInstance();
    if (!instance) {
      setError("FHEVM not initialized");
      return new Map();
    }

    setIsDecrypting(true);
    setError(null);

    try {
      const keypair = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 7;

      const eip712Message = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );

      const signature = await signer.signTypedData(
        eip712Message.domain,
        eip712Message.types,
        eip712Message.message
      );

      const results = await instance.userDecrypt(
        handles,
        keypair.privateKey,
        keypair.publicKey,
        signature,
        contractAddresses,
        userAddress,
        startTimestamp,
        durationDays
      );

      return new Map(Object.entries(results).map(([k, v]) => [k, BigInt(v as string)]));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return new Map();
    } finally {
      setIsDecrypting(false);
    }
  }, []);

  return {
    decrypt,
    isDecrypting,
    error,
  };
}

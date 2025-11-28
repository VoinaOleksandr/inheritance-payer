import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useEncrypt } from "./useEncrypt";
import { useDecrypt } from "./useDecrypt";

const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;
const DISTRIBUTION_ADDRESS = import.meta.env.VITE_DISTRIBUTION_ADDRESS;

// ABIs (minimal interfaces)
const TOKEN_ABI = [
  "function owner() view returns (address)",
  "function mintPlaintext(address to, uint64 amount)",
  "function mint(address to, bytes32 encryptedAmount, bytes calldata inputProof)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "function setOperator(address operator, uint48 until)",
  "function isOperator(address holder, address spender) view returns (bool)",
  "function confidentialTransfer(address to, bytes32 encryptedAmount, bytes calldata inputProof) returns (bytes32)",
  "function confidentialTransferAndCall(address to, bytes32 encryptedAmount, bytes calldata inputProof, bytes calldata data) returns (bytes32)",
];

const DISTRIBUTION_ABI = [
  "function executor() view returns (address)",
  "function token() view returns (address)",
  "function createdAt() view returns (uint256)",
  "function finalized() view returns (bool)",
  "function active() view returns (bool)",
  "function heirs(uint256) view returns (address)",
  "function isHeir(address) view returns (bool)",
  "function claimed(address) view returns (bool)",
  "function addHeir(address heir, bytes32 encryptedAllocation, bytes calldata inputProof)",
  "function removeHeir(address heir)",
  "function finalizeEstate()",
  "function getMyAllocation() view returns (bytes32)",
  "function getAllocation(address heir) view returns (bytes32)",
  "function claimAllocation()",
  "function getHeirs() view returns (address[])",
  "function getHeirCount() view returns (uint256)",
  "function getEstateInfo() view returns (address, address, uint256, bool, bool)",
  "function getContractBalance() view returns (bytes32)",
  "function getTotalAllocated() view returns (bytes32)",
  "function hasClaimed(address heir) view returns (bool)",
];

export interface EstateInfo {
  executor: string;
  token: string;
  createdAt: number;
  finalized: boolean;
  active: boolean;
}

export interface HeirInfo {
  address: string;
  allocation: bigint | null;
  claimed: boolean;
}

export function useInheritance(signer: ethers.Signer | null, address: string) {
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
  const [distributionContract, setDistributionContract] = useState<ethers.Contract | null>(null);
  const [estateInfo, setEstateInfo] = useState<EstateInfo | null>(null);
  const [isExecutor, setIsExecutor] = useState(false);
  const [isHeir, setIsHeir] = useState(false);
  const [heirs, setHeirs] = useState<string[]>([]);
  const [myAllocation, setMyAllocation] = useState<bigint | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { encrypt64, isEncrypting } = useEncrypt();
  const { decrypt, isDecrypting } = useDecrypt();

  // Initialize contracts
  useEffect(() => {
    if (!signer || !TOKEN_ADDRESS || !DISTRIBUTION_ADDRESS) return;

    const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
    const distribution = new ethers.Contract(DISTRIBUTION_ADDRESS, DISTRIBUTION_ABI, signer);

    setTokenContract(token);
    setDistributionContract(distribution);
  }, [signer]);

  // Load estate info
  const loadEstateInfo = useCallback(async () => {
    if (!distributionContract || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const info = await distributionContract.getEstateInfo();
      const estate: EstateInfo = {
        executor: info[0],
        token: info[1],
        createdAt: Number(info[2]),
        finalized: info[3],
        active: info[4],
      };
      setEstateInfo(estate);

      // Check if current user is executor
      setIsExecutor(estate.executor.toLowerCase() === address.toLowerCase());

      // Check if current user is heir
      const heirStatus = await distributionContract.isHeir(address);
      setIsHeir(heirStatus);

      // Load heirs list
      const heirsList = await distributionContract.getHeirs();
      setHeirs(heirsList);

      // If heir, check claim status
      if (heirStatus) {
        const claimed = await distributionContract.hasClaimed(address);
        setHasClaimed(claimed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load estate info");
    } finally {
      setIsLoading(false);
    }
  }, [distributionContract, address]);

  // Load on contract change
  useEffect(() => {
    loadEstateInfo();
  }, [loadEstateInfo]);

  // Decrypt allocation
  const decryptMyAllocation = useCallback(async () => {
    if (!distributionContract || !signer || !address || !isHeir) return;

    try {
      const handle = await distributionContract.getMyAllocation();
      if (!handle || handle === ethers.ZeroHash) {
        setMyAllocation(BigInt(0));
        return;
      }

      const results = await decrypt(
        [{ handle: handle.toString(), contractAddress: DISTRIBUTION_ADDRESS }],
        signer,
        address,
        [DISTRIBUTION_ADDRESS]
      );

      const value = results.get(handle.toString());
      setMyAllocation(value ?? BigInt(0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decrypt allocation");
    }
  }, [distributionContract, signer, address, isHeir, decrypt]);

  // Executor: Mint tokens
  const mintTokens = useCallback(async (amount: bigint) => {
    if (!tokenContract || !address) throw new Error("Not connected");

    const tx = await tokenContract.mintPlaintext(address, amount);
    await tx.wait();
    return tx;
  }, [tokenContract, address]);

  // Executor: Set distribution contract as operator
  const setDistributionAsOperator = useCallback(async () => {
    if (!tokenContract) throw new Error("Not connected");

    // Set operator for 365 days
    const until = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    const tx = await tokenContract.setOperator(DISTRIBUTION_ADDRESS, until);
    await tx.wait();
    return tx;
  }, [tokenContract]);

  // Executor: Deposit tokens to distribution contract
  const depositTokens = useCallback(async (amount: bigint) => {
    if (!tokenContract || !address) throw new Error("Not connected");

    const encrypted = await encrypt64(TOKEN_ADDRESS, address, amount);
    if (!encrypted) throw new Error("Failed to encrypt amount");

    const tx = await tokenContract.confidentialTransferAndCall(
      DISTRIBUTION_ADDRESS,
      encrypted.handles[0],
      encrypted.inputProof,
      "0x"
    );
    await tx.wait();
    return tx;
  }, [tokenContract, address, encrypt64]);

  // Executor: Add heir
  const addHeir = useCallback(async (heirAddress: string, allocation: bigint) => {
    if (!distributionContract || !address) throw new Error("Not connected");

    const encrypted = await encrypt64(DISTRIBUTION_ADDRESS, address, allocation);
    if (!encrypted) throw new Error("Failed to encrypt allocation");

    const tx = await distributionContract.addHeir(
      heirAddress,
      encrypted.handles[0],
      encrypted.inputProof
    );
    await tx.wait();
    await loadEstateInfo();
    return tx;
  }, [distributionContract, address, encrypt64, loadEstateInfo]);

  // Executor: Remove heir
  const removeHeir = useCallback(async (heirAddress: string) => {
    if (!distributionContract) throw new Error("Not connected");

    const tx = await distributionContract.removeHeir(heirAddress);
    await tx.wait();
    await loadEstateInfo();
    return tx;
  }, [distributionContract, loadEstateInfo]);

  // Executor: Finalize estate
  const finalizeEstate = useCallback(async () => {
    if (!distributionContract) throw new Error("Not connected");

    const tx = await distributionContract.finalizeEstate();
    await tx.wait();
    await loadEstateInfo();
    return tx;
  }, [distributionContract, loadEstateInfo]);

  // Heir: Claim allocation
  const claimAllocation = useCallback(async () => {
    if (!distributionContract) throw new Error("Not connected");

    const tx = await distributionContract.claimAllocation();
    await tx.wait();
    setHasClaimed(true);
    await loadEstateInfo();
    return tx;
  }, [distributionContract, loadEstateInfo]);

  // Executor: Get heir allocation
  const getHeirAllocation = useCallback(async (heirAddress: string): Promise<bigint | null> => {
    if (!distributionContract || !signer || !address) return null;

    try {
      const handle = await distributionContract.getAllocation(heirAddress);
      if (!handle || handle === ethers.ZeroHash) return BigInt(0);

      const results = await decrypt(
        [{ handle: handle.toString(), contractAddress: DISTRIBUTION_ADDRESS }],
        signer,
        address,
        [DISTRIBUTION_ADDRESS]
      );

      return results.get(handle.toString()) ?? null;
    } catch {
      return null;
    }
  }, [distributionContract, signer, address, decrypt]);

  return {
    // State
    estateInfo,
    isExecutor,
    isHeir,
    heirs,
    myAllocation,
    hasClaimed,
    isLoading: isLoading || isEncrypting || isDecrypting,
    error,

    // Actions
    loadEstateInfo,
    decryptMyAllocation,
    mintTokens,
    setDistributionAsOperator,
    depositTokens,
    addHeir,
    removeHeir,
    finalizeEstate,
    claimAllocation,
    getHeirAllocation,

    // Contract addresses
    tokenAddress: TOKEN_ADDRESS,
    distributionAddress: DISTRIBUTION_ADDRESS,
  };
}

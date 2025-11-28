import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useEncrypt } from "./useEncrypt";
import { useDecrypt } from "./useDecrypt";
import type { EstateInfo, EstateListItem } from "../types";

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
  // Estate lifecycle
  "function createEstate(string name) returns (uint256)",
  "function nextEstateId() view returns (uint256)",
  "function token() view returns (address)",

  // Estate queries
  "function getEstateInfo(uint256 estateId) view returns (address, uint256, bool, bool, string)",
  "function getMyExecutorEstates() view returns (uint256[])",
  "function getMyHeirEstates() view returns (uint256[])",

  // Heir management
  "function addHeir(uint256 estateId, address heir, bytes32 encryptedAllocation, bytes calldata inputProof)",
  "function removeHeir(uint256 estateId, address heir)",
  "function getHeirs(uint256 estateId) view returns (address[])",
  "function getHeirCount(uint256 estateId) view returns (uint256)",
  "function isHeirOf(uint256 estateId, address heir) view returns (bool)",

  // Allocation queries
  "function getMyAllocation(uint256 estateId) view returns (bytes32)",
  "function getAllocation(uint256 estateId, address heir) view returns (bytes32)",
  "function getContractBalance(uint256 estateId) view returns (bytes32)",
  "function getTotalAllocated(uint256 estateId) view returns (bytes32)",

  // Finalization and claiming
  "function finalizeEstate(uint256 estateId)",
  "function claimAllocation(uint256 estateId)",
  "function hasClaimed(uint256 estateId, address heir) view returns (bool)",

  // Events
  "event EstateCreated(uint256 indexed estateId, address indexed executor, string name)",
];

export function useInheritance(signer: ethers.Signer | null, address: string) {
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
  const [distributionContract, setDistributionContract] = useState<ethers.Contract | null>(null);

  // Multi-estate state
  const [myExecutorEstates, setMyExecutorEstates] = useState<EstateListItem[]>([]);
  const [myHeirEstates, setMyHeirEstates] = useState<EstateListItem[]>([]);

  // Selected estate context
  const [selectedEstateId, setSelectedEstateId] = useState<number | null>(null);
  const [currentEstate, setCurrentEstate] = useState<EstateInfo | null>(null);
  const [currentRole, setCurrentRole] = useState<'executor' | 'heir' | null>(null);

  // Estate-specific data
  const [heirs, setHeirs] = useState<string[]>([]);
  const [myAllocation, setMyAllocation] = useState<bigint | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);

  // Loading/error state
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

  // Load user's estates (both as executor and heir)
  const loadMyEstates = useCallback(async () => {
    if (!distributionContract || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get estate IDs
      const executorIds: bigint[] = await distributionContract.getMyExecutorEstates();
      const heirIds: bigint[] = await distributionContract.getMyHeirEstates();

      // Load estate info for executor estates
      const executorEstates: EstateListItem[] = await Promise.all(
        executorIds.map(async (id) => {
          const info = await distributionContract.getEstateInfo(id);
          return {
            id: Number(id),
            name: info[4] || `Estate #${id}`,
            role: 'executor' as const,
            finalized: info[2],
            active: info[3],
          };
        })
      );

      // Load estate info for heir estates
      const heirEstates: EstateListItem[] = await Promise.all(
        heirIds.map(async (id) => {
          const info = await distributionContract.getEstateInfo(id);
          return {
            id: Number(id),
            name: info[4] || `Estate #${id}`,
            role: 'heir' as const,
            finalized: info[2],
            active: info[3],
          };
        })
      );

      setMyExecutorEstates(executorEstates.filter(e => e.active));
      setMyHeirEstates(heirEstates.filter(e => e.active));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load estates");
    } finally {
      setIsLoading(false);
    }
  }, [distributionContract, address]);

  // Load estates on contract initialization
  useEffect(() => {
    loadMyEstates();
  }, [loadMyEstates]);

  // Load specific estate data
  const loadEstateData = useCallback(async (estateId: number) => {
    if (!distributionContract || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const info = await distributionContract.getEstateInfo(estateId);
      const estate: EstateInfo = {
        id: estateId,
        executor: info[0],
        createdAt: Number(info[1]),
        finalized: info[2],
        active: info[3],
        name: info[4] || `Estate #${estateId}`,
      };
      setCurrentEstate(estate);

      // Determine role
      const isExecutor = estate.executor.toLowerCase() === address.toLowerCase();
      const isHeir = await distributionContract.isHeirOf(estateId, address);
      setCurrentRole(isExecutor ? 'executor' : (isHeir ? 'heir' : null));

      // Load heirs
      const heirsList = await distributionContract.getHeirs(estateId);
      setHeirs(heirsList);

      // If heir, check claim status
      if (isHeir) {
        const claimed = await distributionContract.hasClaimed(estateId, address);
        setHasClaimed(claimed);
      } else {
        setHasClaimed(false);
      }

      // Reset allocation when switching estates
      setMyAllocation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load estate");
    } finally {
      setIsLoading(false);
    }
  }, [distributionContract, address]);

  // Select an estate
  const selectEstate = useCallback((estateId: number | null) => {
    setSelectedEstateId(estateId);
    setCurrentEstate(null);
    setCurrentRole(null);
    setHeirs([]);
    setMyAllocation(null);
    setHasClaimed(false);
    setError(null);

    if (estateId !== null) {
      loadEstateData(estateId);
    }
  }, [loadEstateData]);

  // Create new estate
  const createEstate = useCallback(async (name: string): Promise<number> => {
    if (!distributionContract) throw new Error("Not connected");

    const tx = await distributionContract.createEstate(name);
    const receipt = await tx.wait();

    // Parse event to get estate ID
    let estateId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = distributionContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === "EstateCreated") {
          estateId = Number(parsed.args[0]);
          break;
        }
      } catch {
        // Skip logs that don't match our ABI
      }
    }

    await loadMyEstates();
    return estateId;
  }, [distributionContract, loadMyEstates]);

  // Decrypt my allocation for current estate
  const decryptMyAllocation = useCallback(async () => {
    if (!distributionContract || !signer || !address || selectedEstateId === null) return;

    try {
      const handle = await distributionContract.getMyAllocation(selectedEstateId);
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

      setMyAllocation(results.get(handle.toString()) ?? BigInt(0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decrypt allocation");
    }
  }, [distributionContract, signer, address, selectedEstateId, decrypt]);

  // Executor: Get heir allocation
  const getHeirAllocation = useCallback(async (heirAddress: string): Promise<bigint | null> => {
    if (!distributionContract || !signer || !address || selectedEstateId === null) return null;

    try {
      const handle = await distributionContract.getAllocation(selectedEstateId, heirAddress);
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
  }, [distributionContract, signer, address, selectedEstateId, decrypt]);

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

    const until = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    const tx = await tokenContract.setOperator(DISTRIBUTION_ADDRESS, until);
    await tx.wait();
    return tx;
  }, [tokenContract]);

  // Executor: Deposit tokens to distribution contract for a specific estate
  const depositTokens = useCallback(async (amount: bigint) => {
    if (!tokenContract || !address || selectedEstateId === null) throw new Error("Not connected or no estate selected");

    const encrypted = await encrypt64(TOKEN_ADDRESS, address, amount);
    if (!encrypted) throw new Error("Failed to encrypt amount");

    // Encode estate ID for routing
    const estateIdData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [selectedEstateId]);

    const tx = await tokenContract.confidentialTransferAndCall(
      DISTRIBUTION_ADDRESS,
      encrypted.handles[0],
      encrypted.inputProof,
      estateIdData
    );
    await tx.wait();
    return tx;
  }, [tokenContract, address, selectedEstateId, encrypt64]);

  // Executor: Add heir to current estate
  const addHeir = useCallback(async (heirAddress: string, allocation: bigint) => {
    if (!distributionContract || !address || selectedEstateId === null) throw new Error("No estate selected");

    const encrypted = await encrypt64(DISTRIBUTION_ADDRESS, address, allocation);
    if (!encrypted) throw new Error("Failed to encrypt allocation");

    const tx = await distributionContract.addHeir(
      selectedEstateId,
      heirAddress,
      encrypted.handles[0],
      encrypted.inputProof
    );
    await tx.wait();
    await loadEstateData(selectedEstateId);
    return tx;
  }, [distributionContract, address, selectedEstateId, encrypt64, loadEstateData]);

  // Executor: Remove heir from current estate
  const removeHeir = useCallback(async (heirAddress: string) => {
    if (!distributionContract || selectedEstateId === null) throw new Error("No estate selected");

    const tx = await distributionContract.removeHeir(selectedEstateId, heirAddress);
    await tx.wait();
    await loadEstateData(selectedEstateId);
    return tx;
  }, [distributionContract, selectedEstateId, loadEstateData]);

  // Executor: Finalize current estate
  const finalizeEstate = useCallback(async () => {
    if (!distributionContract || selectedEstateId === null) throw new Error("No estate selected");

    const tx = await distributionContract.finalizeEstate(selectedEstateId);
    await tx.wait();
    await loadEstateData(selectedEstateId);
    await loadMyEstates();
    return tx;
  }, [distributionContract, selectedEstateId, loadEstateData, loadMyEstates]);

  // Heir: Claim allocation from current estate
  const claimAllocation = useCallback(async () => {
    if (!distributionContract || selectedEstateId === null) throw new Error("No estate selected");

    const tx = await distributionContract.claimAllocation(selectedEstateId);
    await tx.wait();
    setHasClaimed(true);
    await loadEstateData(selectedEstateId);
    return tx;
  }, [distributionContract, selectedEstateId, loadEstateData]);

  // Check if heir has claimed from current estate
  const checkHeirClaimed = useCallback(async (heirAddress: string): Promise<boolean> => {
    if (!distributionContract || selectedEstateId === null) return false;

    try {
      return await distributionContract.hasClaimed(selectedEstateId, heirAddress);
    } catch {
      return false;
    }
  }, [distributionContract, selectedEstateId]);

  return {
    // Multi-estate state
    myExecutorEstates,
    myHeirEstates,
    selectedEstateId,
    currentEstate,
    currentRole,

    // Estate-specific data
    heirs,
    myAllocation,
    hasClaimed,

    // Loading/error
    isLoading: isLoading || isEncrypting || isDecrypting,
    error,

    // Estate management
    loadMyEstates,
    selectEstate,
    createEstate,

    // Estate operations
    addHeir,
    removeHeir,
    finalizeEstate,
    claimAllocation,
    decryptMyAllocation,
    getHeirAllocation,
    checkHeirClaimed,

    // Token operations
    mintTokens,
    setDistributionAsOperator,
    depositTokens,

    // Contract addresses
    tokenAddress: TOKEN_ADDRESS,
    distributionAddress: DISTRIBUTION_ADDRESS,
  };
}

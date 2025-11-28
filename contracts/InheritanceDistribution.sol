// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "./interfaces/IERC7984.sol";
import {IERC7984Receiver} from "./interfaces/IERC7984Receiver.sol";

/**
 * @title InheritanceDistribution
 * @notice Multi-estate private inheritance distribution where heirs only see their own allocations
 * @dev Uses FHE to encrypt allocation amounts, preventing heirs from seeing siblings' shares
 */
contract InheritanceDistribution is IERC7984Receiver, ZamaEthereumConfig {
    // Global state
    uint256 public nextEstateId;
    IERC7984 public token;

    // Estate struct
    struct Estate {
        address executor;
        uint256 createdAt;
        bool finalized;
        bool active;
        string name;
    }

    // Core mappings (estateId as primary key)
    mapping(uint256 => Estate) public estates;
    mapping(uint256 => address[]) private estateHeirs;
    mapping(uint256 => mapping(address => bool)) public isHeirOf;
    mapping(uint256 => mapping(address => euint64)) private allocations;
    mapping(uint256 => mapping(address => bool)) public claimed;
    mapping(uint256 => euint64) private estateBalances;
    mapping(uint256 => euint64) private totalAllocated;

    // Index mappings for efficient queries
    mapping(address => uint256[]) private executorEstates;
    mapping(address => uint256[]) private heirEstates;

    // Events
    event EstateCreated(uint256 indexed estateId, address indexed executor, string name);
    event HeirAdded(uint256 indexed estateId, address indexed heir);
    event HeirRemoved(uint256 indexed estateId, address indexed heir);
    event EstateFinalized(uint256 indexed estateId);
    event AllocationClaimed(uint256 indexed estateId, address indexed heir);
    event TokensDeposited(uint256 indexed estateId, address indexed from);

    // Errors
    error OnlyExecutor();
    error EstateAlreadyFinalized();
    error EstateNotFinalized();
    error EstateNotActive();
    error EstateNotFound();
    error AlreadyHeir();
    error NotHeir();
    error AlreadyClaimed();
    error ZeroAddress();
    error InvalidToken();
    error MissingEstateId();

    // Modifiers
    modifier onlyEstateExecutor(uint256 estateId) {
        if (msg.sender != estates[estateId].executor) revert OnlyExecutor();
        _;
    }

    modifier notFinalized(uint256 estateId) {
        if (estates[estateId].finalized) revert EstateAlreadyFinalized();
        _;
    }

    modifier isEstateFinalized(uint256 estateId) {
        if (!estates[estateId].finalized) revert EstateNotFinalized();
        _;
    }

    modifier estateActive(uint256 estateId) {
        if (!estates[estateId].active) revert EstateNotActive();
        _;
    }

    modifier estateExists(uint256 estateId) {
        if (estates[estateId].executor == address(0)) revert EstateNotFound();
        _;
    }

    /**
     * @notice Initialize the contract with a token
     * @param _token Address of the ERC-7984 token to distribute
     */
    constructor(address _token) {
        if (_token == address(0)) revert ZeroAddress();
        token = IERC7984(_token);
    }

    /**
     * @notice Create a new inheritance distribution estate
     * @param name Human-readable name for the estate
     * @return estateId The ID of the newly created estate
     */
    function createEstate(string calldata name) external returns (uint256 estateId) {
        estateId = nextEstateId++;

        estates[estateId] = Estate({
            executor: msg.sender,
            createdAt: block.timestamp,
            finalized: false,
            active: true,
            name: name
        });

        // Initialize encrypted balances
        estateBalances[estateId] = FHE.asEuint64(0);
        totalAllocated[estateId] = FHE.asEuint64(0);

        FHE.allowThis(estateBalances[estateId]);
        FHE.allow(estateBalances[estateId], msg.sender);
        FHE.allowThis(totalAllocated[estateId]);
        FHE.allow(totalAllocated[estateId], msg.sender);

        // Track in executor's estates
        executorEstates[msg.sender].push(estateId);

        emit EstateCreated(estateId, msg.sender, name);
    }

    /**
     * @notice Handle incoming ERC-7984 token transfers
     * @dev The data parameter must contain the estateId to route the deposit
     */
    function onERC7984Received(
        address,
        address from,
        address,
        euint64 amount,
        bytes calldata data
    ) external override returns (bytes4) {
        if (msg.sender != address(token)) revert InvalidToken();
        if (data.length < 32) revert MissingEstateId();

        // Decode estate ID from data
        uint256 estateId = abi.decode(data, (uint256));
        if (estates[estateId].executor == address(0)) revert EstateNotFound();

        // Add to estate balance
        estateBalances[estateId] = FHE.add(estateBalances[estateId], amount);
        FHE.allowThis(estateBalances[estateId]);
        FHE.allow(estateBalances[estateId], estates[estateId].executor);

        emit TokensDeposited(estateId, from);
        return IERC7984Receiver.onERC7984Received.selector;
    }

    /**
     * @notice Add an heir with an encrypted allocation
     * @param estateId The estate to add the heir to
     * @param heir Address of the heir
     * @param encryptedAllocation Encrypted allocation amount
     * @param inputProof Proof for the encrypted input
     */
    function addHeir(
        uint256 estateId,
        address heir,
        externalEuint64 encryptedAllocation,
        bytes calldata inputProof
    ) external onlyEstateExecutor(estateId) notFinalized(estateId) estateActive(estateId) {
        if (heir == address(0)) revert ZeroAddress();
        if (isHeirOf[estateId][heir]) revert AlreadyHeir();

        euint64 allocation = FHE.fromExternal(encryptedAllocation, inputProof);

        // Store allocation
        allocations[estateId][heir] = allocation;
        isHeirOf[estateId][heir] = true;
        estateHeirs[estateId].push(heir);

        // Update total allocated
        totalAllocated[estateId] = FHE.add(totalAllocated[estateId], allocation);

        // Set ACL permissions
        FHE.allowThis(allocation);
        FHE.allow(allocation, heir);
        FHE.allow(allocation, estates[estateId].executor);

        FHE.allowThis(totalAllocated[estateId]);
        FHE.allow(totalAllocated[estateId], estates[estateId].executor);

        // Track in heir's estates
        heirEstates[heir].push(estateId);

        emit HeirAdded(estateId, heir);
    }

    /**
     * @notice Remove an heir (only before finalization)
     * @param estateId The estate to remove the heir from
     * @param heir Address of the heir to remove
     */
    function removeHeir(
        uint256 estateId,
        address heir
    ) external onlyEstateExecutor(estateId) notFinalized(estateId) estateActive(estateId) {
        if (!isHeirOf[estateId][heir]) revert NotHeir();

        // Subtract from total allocated
        totalAllocated[estateId] = FHE.sub(totalAllocated[estateId], allocations[estateId][heir]);
        FHE.allowThis(totalAllocated[estateId]);
        FHE.allow(totalAllocated[estateId], estates[estateId].executor);

        // Clear allocation
        allocations[estateId][heir] = FHE.asEuint64(0);
        isHeirOf[estateId][heir] = false;

        // Remove from heirs array
        address[] storage heirs = estateHeirs[estateId];
        for (uint256 i = 0; i < heirs.length; i++) {
            if (heirs[i] == heir) {
                heirs[i] = heirs[heirs.length - 1];
                heirs.pop();
                break;
            }
        }

        // Remove from heir's estates index
        _removeFromArray(heirEstates[heir], estateId);

        emit HeirRemoved(estateId, heir);
    }

    /**
     * @notice Finalize an estate (locks all allocations)
     * @param estateId The estate to finalize
     */
    function finalizeEstate(
        uint256 estateId
    ) external onlyEstateExecutor(estateId) notFinalized(estateId) estateActive(estateId) {
        estates[estateId].finalized = true;
        emit EstateFinalized(estateId);
    }

    /**
     * @notice Get the caller's allocation for a specific estate
     * @param estateId The estate to query
     * @return The encrypted allocation amount
     */
    function getMyAllocation(uint256 estateId) external view estateExists(estateId) returns (euint64) {
        if (!isHeirOf[estateId][msg.sender]) revert NotHeir();
        return allocations[estateId][msg.sender];
    }

    /**
     * @notice Get a specific heir's allocation (executor only)
     * @param estateId The estate to query
     * @param heir Address of the heir
     * @return The encrypted allocation amount
     */
    function getAllocation(
        uint256 estateId,
        address heir
    ) external view onlyEstateExecutor(estateId) returns (euint64) {
        return allocations[estateId][heir];
    }

    /**
     * @notice Claim inheritance allocation from a specific estate
     * @param estateId The estate to claim from
     */
    function claimAllocation(
        uint256 estateId
    ) external isEstateFinalized(estateId) estateActive(estateId) {
        if (!isHeirOf[estateId][msg.sender]) revert NotHeir();
        if (claimed[estateId][msg.sender]) revert AlreadyClaimed();

        euint64 amount = allocations[estateId][msg.sender];
        claimed[estateId][msg.sender] = true;

        token.confidentialTransferFrom(address(this), msg.sender, amount);

        emit AllocationClaimed(estateId, msg.sender);
    }

    /**
     * @notice Get all heir addresses for an estate
     * @param estateId The estate to query
     * @return Array of heir addresses
     */
    function getHeirs(uint256 estateId) external view returns (address[] memory) {
        return estateHeirs[estateId];
    }

    /**
     * @notice Get the number of heirs for an estate
     * @param estateId The estate to query
     * @return Number of heirs
     */
    function getHeirCount(uint256 estateId) external view returns (uint256) {
        return estateHeirs[estateId].length;
    }

    /**
     * @notice Get estate information
     * @param estateId The estate to query
     */
    function getEstateInfo(uint256 estateId) external view returns (
        address _executor,
        uint256 _createdAt,
        bool _finalized,
        bool _active,
        string memory _name
    ) {
        Estate storage estate = estates[estateId];
        return (estate.executor, estate.createdAt, estate.finalized, estate.active, estate.name);
    }

    /**
     * @notice Get estates where caller is executor
     * @return Array of estate IDs
     */
    function getMyExecutorEstates() external view returns (uint256[] memory) {
        return executorEstates[msg.sender];
    }

    /**
     * @notice Get estates where caller is heir
     * @return Array of estate IDs
     */
    function getMyHeirEstates() external view returns (uint256[] memory) {
        return heirEstates[msg.sender];
    }

    /**
     * @notice Get contract's token balance for an estate (executor only)
     * @param estateId The estate to query
     * @return The encrypted balance
     */
    function getContractBalance(
        uint256 estateId
    ) external view onlyEstateExecutor(estateId) returns (euint64) {
        return estateBalances[estateId];
    }

    /**
     * @notice Get total allocated amount for an estate (executor only)
     * @param estateId The estate to query
     * @return The encrypted total allocated
     */
    function getTotalAllocated(
        uint256 estateId
    ) external view onlyEstateExecutor(estateId) returns (euint64) {
        return totalAllocated[estateId];
    }

    /**
     * @notice Check if an heir has claimed from an estate
     * @param estateId The estate to query
     * @param heir Address to check
     * @return Whether the heir has claimed
     */
    function hasClaimed(uint256 estateId, address heir) external view returns (bool) {
        return claimed[estateId][heir];
    }

    /**
     * @notice Internal helper to remove a value from an array
     */
    function _removeFromArray(uint256[] storage arr, uint256 value) internal {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == value) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                break;
            }
        }
    }
}

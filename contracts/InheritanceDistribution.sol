// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "./interfaces/IERC7984.sol";
import {IERC7984Receiver} from "./interfaces/IERC7984Receiver.sol";

/**
 * @title InheritanceDistribution
 * @notice Private inheritance distribution where heirs only see their own allocations
 * @dev Uses FHE to encrypt allocation amounts, preventing heirs from seeing siblings' shares
 */
contract InheritanceDistribution is IERC7984Receiver, ZamaEthereumConfig {
    // Estate information
    address public executor;
    IERC7984 public token;
    uint256 public createdAt;
    bool public finalized;
    bool public active;

    // Heir data
    address[] public heirs;
    mapping(address => bool) public isHeir;
    mapping(address => euint64) private allocations;
    mapping(address => bool) public claimed;

    // Contract's token balance (encrypted)
    euint64 private contractBalance;
    euint64 private totalAllocated;

    // Events
    event EstateCreated(address indexed executor, address indexed token);
    event HeirAdded(address indexed heir);
    event HeirRemoved(address indexed heir);
    event EstateFinalized();
    event AllocationClaimed(address indexed heir);
    event TokensDeposited(address indexed from);

    // Errors
    error OnlyExecutor();
    error EstateAlreadyFinalized();
    error EstateNotFinalized();
    error EstateNotActive();
    error AlreadyHeir();
    error NotHeir();
    error AlreadyClaimed();
    error ZeroAddress();
    error InvalidToken();

    modifier onlyExecutor() {
        if (msg.sender != executor) revert OnlyExecutor();
        _;
    }

    modifier notFinalized() {
        if (finalized) revert EstateAlreadyFinalized();
        _;
    }

    modifier isEstateFinalized() {
        if (!finalized) revert EstateNotFinalized();
        _;
    }

    modifier estateActive() {
        if (!active) revert EstateNotActive();
        _;
    }

    /**
     * @notice Create a new inheritance distribution estate
     * @param _token Address of the ERC-7984 token to distribute
     */
    constructor(address _token) {
        if (_token == address(0)) revert ZeroAddress();

        executor = msg.sender;
        token = IERC7984(_token);
        createdAt = block.timestamp;
        active = true;

        // Initialize encrypted balances to zero
        contractBalance = FHE.asEuint64(0);
        totalAllocated = FHE.asEuint64(0);

        FHE.allowThis(contractBalance);
        FHE.allow(contractBalance, executor);
        FHE.allowThis(totalAllocated);
        FHE.allow(totalAllocated, executor);

        emit EstateCreated(executor, _token);
    }

    /**
     * @notice Handle incoming ERC-7984 token transfers
     */
    function onERC7984Received(
        address,
        address from,
        address,
        euint64 amount,
        bytes calldata
    ) external override returns (bytes4) {
        if (msg.sender != address(token)) revert InvalidToken();

        // Add to contract balance
        contractBalance = FHE.add(contractBalance, amount);
        FHE.allowThis(contractBalance);
        FHE.allow(contractBalance, executor);

        emit TokensDeposited(from);
        return IERC7984Receiver.onERC7984Received.selector;
    }

    /**
     * @notice Add an heir with an encrypted allocation
     * @param heir Address of the heir
     * @param encryptedAllocation Encrypted allocation amount
     * @param inputProof Proof for the encrypted input
     */
    function addHeir(
        address heir,
        externalEuint64 encryptedAllocation,
        bytes calldata inputProof
    ) external onlyExecutor notFinalized estateActive {
        if (heir == address(0)) revert ZeroAddress();
        if (isHeir[heir]) revert AlreadyHeir();

        euint64 allocation = FHE.fromExternal(encryptedAllocation, inputProof);

        // Store allocation
        allocations[heir] = allocation;
        isHeir[heir] = true;
        heirs.push(heir);

        // Update total allocated
        totalAllocated = FHE.add(totalAllocated, allocation);

        // Set ACL permissions
        // Contract needs access for transfers
        FHE.allowThis(allocation);
        // Heir can only see their own allocation
        FHE.allow(allocation, heir);
        // Executor can see all allocations
        FHE.allow(allocation, executor);

        // Update total allocated permissions
        FHE.allowThis(totalAllocated);
        FHE.allow(totalAllocated, executor);

        emit HeirAdded(heir);
    }

    /**
     * @notice Remove an heir (only before finalization)
     * @param heir Address of the heir to remove
     */
    function removeHeir(address heir) external onlyExecutor notFinalized estateActive {
        if (!isHeir[heir]) revert NotHeir();

        // Subtract from total allocated
        totalAllocated = FHE.sub(totalAllocated, allocations[heir]);
        FHE.allowThis(totalAllocated);
        FHE.allow(totalAllocated, executor);

        // Clear allocation
        allocations[heir] = FHE.asEuint64(0);
        isHeir[heir] = false;

        // Remove from heirs array
        for (uint256 i = 0; i < heirs.length; i++) {
            if (heirs[i] == heir) {
                heirs[i] = heirs[heirs.length - 1];
                heirs.pop();
                break;
            }
        }

        emit HeirRemoved(heir);
    }

    /**
     * @notice Finalize the estate (locks all allocations)
     */
    function finalizeEstate() external onlyExecutor notFinalized estateActive {
        finalized = true;
        emit EstateFinalized();
    }

    /**
     * @notice Get the caller's allocation (for heirs)
     * @return The encrypted allocation amount
     */
    function getMyAllocation() external view returns (euint64) {
        if (!isHeir[msg.sender]) revert NotHeir();
        return allocations[msg.sender];
    }

    /**
     * @notice Get a specific heir's allocation (executor only)
     * @param heir Address of the heir
     * @return The encrypted allocation amount
     */
    function getAllocation(address heir) external view onlyExecutor returns (euint64) {
        return allocations[heir];
    }

    /**
     * @notice Claim inheritance allocation (for heirs, after finalization)
     */
    function claimAllocation() external isEstateFinalized estateActive {
        if (!isHeir[msg.sender]) revert NotHeir();
        if (claimed[msg.sender]) revert AlreadyClaimed();

        euint64 amount = allocations[msg.sender];
        claimed[msg.sender] = true;

        // Transfer tokens from contract to heir
        // The contract must be set as an operator for itself on the token
        token.confidentialTransferFrom(address(this), msg.sender, amount);

        emit AllocationClaimed(msg.sender);
    }

    /**
     * @notice Get all heir addresses (public - addresses visible)
     * @return Array of heir addresses
     */
    function getHeirs() external view returns (address[] memory) {
        return heirs;
    }

    /**
     * @notice Get the number of heirs
     * @return Number of heirs
     */
    function getHeirCount() external view returns (uint256) {
        return heirs.length;
    }

    /**
     * @notice Get estate information
     * @return _executor The executor address
     * @return _token The token address
     * @return _createdAt Creation timestamp
     * @return _finalized Whether the estate is finalized
     * @return _active Whether the estate is active
     */
    function getEstateInfo() external view returns (
        address _executor,
        address _token,
        uint256 _createdAt,
        bool _finalized,
        bool _active
    ) {
        return (executor, address(token), createdAt, finalized, active);
    }

    /**
     * @notice Get contract's token balance (executor only)
     * @return The encrypted balance
     */
    function getContractBalance() external view onlyExecutor returns (euint64) {
        return contractBalance;
    }

    /**
     * @notice Get total allocated amount (executor only)
     * @return The encrypted total allocated
     */
    function getTotalAllocated() external view onlyExecutor returns (euint64) {
        return totalAllocated;
    }

    /**
     * @notice Check if an heir has claimed
     * @param heir Address to check
     * @return Whether the heir has claimed
     */
    function hasClaimed(address heir) external view returns (bool) {
        return claimed[heir];
    }
}

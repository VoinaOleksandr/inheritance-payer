// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ERC7984} from "./ERC7984.sol";

/**
 * @title InheritanceToken
 * @notice ERC-7984 confidential token for private inheritance distribution
 * @dev Extends custom ERC7984 with owner-controlled minting
 */
contract InheritanceToken is ERC7984 {
    address public owner;

    error OnlyOwner();

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor() ERC7984("Inheritance Token", "INHERIT") {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @notice Mint tokens to an address (owner only)
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount to mint
     * @param inputProof Proof for the encrypted input
     */
    function mint(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        _mint(to, amount);
    }

    /**
     * @notice Mint tokens with a plaintext amount (owner only, for initial setup)
     * @param to Recipient address
     * @param amount Plaintext amount to mint
     */
    function mintPlaintext(address to, uint64 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        euint64 encryptedAmount = FHE.asEuint64(amount);
        _mint(to, encryptedAmount);
    }

    /**
     * @notice Burn tokens from caller's balance
     * @param encryptedAmount Encrypted amount to burn
     * @param inputProof Proof for the encrypted input
     */
    function burn(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        _burn(msg.sender, amount);
    }

    /**
     * @notice Transfer ownership to a new address
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Get token decimals (6 for confidential tokens)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

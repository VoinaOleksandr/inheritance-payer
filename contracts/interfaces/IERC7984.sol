// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title IERC7984
 * @notice Interface for ERC-7984 Confidential Token Standard
 * @dev Enables private token transfers with encrypted balances using FHE
 */
interface IERC7984 {
    /**
     * @notice Get the confidential balance of an account
     * @param account The address to query
     * @return The encrypted balance
     */
    function confidentialBalanceOf(address account) external view returns (euint64);

    /**
     * @notice Transfer tokens confidentially
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount to transfer
     * @param inputProof Proof for the encrypted input
     * @return transferred The encrypted amount transferred
     */
    function confidentialTransfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (euint64 transferred);

    /**
     * @notice Transfer tokens from one address to another (requires operator approval)
     * @param from Sender address
     * @param to Recipient address
     * @param amount Encrypted amount to transfer
     * @return transferred The encrypted amount transferred
     */
    function confidentialTransferFrom(
        address from,
        address to,
        euint64 amount
    ) external returns (euint64 transferred);

    /**
     * @notice Set an operator with approval until a specific timestamp
     * @param operator The address to approve as operator
     * @param until Timestamp until which the approval is valid
     */
    function setOperator(address operator, uint48 until) external;

    /**
     * @notice Check if an address is an approved operator for a holder
     * @param holder The token holder address
     * @param spender The potential operator address
     * @return Whether the spender is an approved operator
     */
    function isOperator(address holder, address spender) external view returns (bool);

    /**
     * @notice Get the token name
     * @return The token name
     */
    function name() external view returns (string memory);

    /**
     * @notice Get the token symbol
     * @return The token symbol
     */
    function symbol() external view returns (string memory);

    /**
     * @notice Get the token decimals
     * @return The number of decimals
     */
    function decimals() external view returns (uint8);

    // Events
    event ConfidentialTransfer(address indexed from, address indexed to);
    event OperatorSet(address indexed holder, address indexed operator, uint48 until);
}

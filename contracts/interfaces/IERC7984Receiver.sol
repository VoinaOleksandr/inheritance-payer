// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title IERC7984Receiver
 * @notice Interface for contracts that want to receive ERC-7984 confidential tokens
 */
interface IERC7984Receiver {
    /**
     * @notice Handle the receipt of ERC-7984 confidential tokens
     * @param operator The address which initiated the transfer
     * @param from The address which previously owned the tokens
     * @param tokenAddress The address of the token contract
     * @param amount The encrypted amount of tokens transferred
     * @param data Additional data with no specified format
     * @return bytes4 `IERC7984Receiver.onERC7984Received.selector` if transfer is allowed
     */
    function onERC7984Received(
        address operator,
        address from,
        address tokenAddress,
        euint64 amount,
        bytes calldata data
    ) external returns (bytes4);
}

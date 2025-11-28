// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "./interfaces/IERC7984.sol";
import {IERC7984Receiver} from "./interfaces/IERC7984Receiver.sol";

/**
 * @title ERC7984
 * @notice Base implementation of ERC-7984 Confidential Token Standard
 * @dev Uses FHE for encrypted balances and transfers
 */
abstract contract ERC7984 is IERC7984, ZamaEthereumConfig {
    string private _name;
    string private _symbol;

    // Encrypted balances
    mapping(address => euint64) private _balances;

    // Operator approvals: holder => operator => expiration timestamp
    mapping(address => mapping(address => uint48)) private _operators;

    // Errors
    error InsufficientBalance();
    error NotOperator();
    error ZeroAddress();
    error TransferToNonReceiver();

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @notice Get the token name
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @notice Get the token symbol
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @notice Get the token decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    /**
     * @notice Get the confidential balance of an account
     */
    function confidentialBalanceOf(address account) public view virtual override returns (euint64) {
        return _balances[account];
    }

    /**
     * @notice Set an operator with approval until a specific timestamp
     */
    function setOperator(address operator, uint48 until) external virtual override {
        if (operator == address(0)) revert ZeroAddress();
        _operators[msg.sender][operator] = until;
        emit OperatorSet(msg.sender, operator, until);
    }

    /**
     * @notice Check if an address is an approved operator for a holder
     */
    function isOperator(address holder, address spender) public view virtual override returns (bool) {
        if (holder == spender) return true;
        return _operators[holder][spender] > block.timestamp;
    }

    /**
     * @notice Transfer tokens confidentially
     */
    function confidentialTransfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external virtual override returns (euint64 transferred) {
        if (to == address(0)) revert ZeroAddress();

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        _transfer(msg.sender, to, amount);
        return amount;
    }

    /**
     * @notice Transfer tokens from one address to another (requires operator approval)
     */
    function confidentialTransferFrom(
        address from,
        address to,
        euint64 amount
    ) external virtual override returns (euint64 transferred) {
        if (to == address(0)) revert ZeroAddress();
        if (!isOperator(from, msg.sender)) revert NotOperator();

        _transfer(from, to, amount);
        return amount;
    }

    /**
     * @notice Internal transfer function
     */
    function _transfer(address from, address to, euint64 amount) internal virtual {
        // Initialize balances if needed
        if (!FHE.isInitialized(_balances[from])) {
            _balances[from] = FHE.asEuint64(0);
            FHE.allowThis(_balances[from]);
            FHE.allow(_balances[from], from);
        }
        if (!FHE.isInitialized(_balances[to])) {
            _balances[to] = FHE.asEuint64(0);
            FHE.allowThis(_balances[to]);
            FHE.allow(_balances[to], to);
        }

        // Subtract from sender
        _balances[from] = FHE.sub(_balances[from], amount);
        FHE.allowThis(_balances[from]);
        FHE.allow(_balances[from], from);

        // Add to recipient
        _balances[to] = FHE.add(_balances[to], amount);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);

        emit ConfidentialTransfer(from, to);

        // Check if recipient is a contract and call receiver hook
        if (_isContract(to)) {
            _checkOnERC7984Received(msg.sender, from, to, amount, "");
        }
    }

    /**
     * @notice Internal mint function
     */
    function _mint(address to, euint64 amount) internal virtual {
        if (to == address(0)) revert ZeroAddress();

        // Initialize balance if needed
        if (!FHE.isInitialized(_balances[to])) {
            _balances[to] = FHE.asEuint64(0);
            FHE.allowThis(_balances[to]);
            FHE.allow(_balances[to], to);
        }

        // Add to recipient
        _balances[to] = FHE.add(_balances[to], amount);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);

        emit ConfidentialTransfer(address(0), to);
    }

    /**
     * @notice Internal burn function
     */
    function _burn(address from, euint64 amount) internal virtual {
        if (from == address(0)) revert ZeroAddress();

        // Initialize balance if needed
        if (!FHE.isInitialized(_balances[from])) {
            _balances[from] = FHE.asEuint64(0);
            FHE.allowThis(_balances[from]);
            FHE.allow(_balances[from], from);
        }

        // Subtract from holder
        _balances[from] = FHE.sub(_balances[from], amount);
        FHE.allowThis(_balances[from]);
        FHE.allow(_balances[from], from);

        emit ConfidentialTransfer(from, address(0));
    }

    /**
     * @notice Check if address is a contract
     */
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    /**
     * @notice Call onERC7984Received on recipient contract
     */
    function _checkOnERC7984Received(
        address operator,
        address from,
        address to,
        euint64 amount,
        bytes memory data
    ) internal {
        try IERC7984Receiver(to).onERC7984Received(operator, from, address(this), amount, data) returns (bytes4 retval) {
            if (retval != IERC7984Receiver.onERC7984Received.selector) {
                revert TransferToNonReceiver();
            }
        } catch {
            revert TransferToNonReceiver();
        }
    }
}

//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

// Use openzeppelin for security
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * MemeVault contract for depositing meme coins and routing to highest yield vaults
 * @author ETHOnline 2025
 */
contract MemeVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State Variables
    address public immutable owner;

    // Mapping of token => total deposited
    mapping(address => uint256) public totalDeposits;

    // User deposits: user => token => amount
    mapping(address => mapping(address => uint256)) public userDeposits;

    // Events
    event Deposit(address indexed user, address indexed token, uint256 amount, string chain, uint256 timestamp);
    event YieldRouted(address indexed user, address indexed token, uint256 amount, string vault, uint256 apy, string intentId);

    // Constructor
    constructor(address _owner) {
        owner = _owner;
    }

    /**
     * Deposit meme coins into the vault
     * @param token The ERC20 token address (e.g., PEPE)
     * @param amount Amount to deposit
     * @param chain Target chain for routing (e.g., "Base")
     */
    function deposit(address token, uint256 amount, string memory chain) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token");

        // Transfer tokens from user to contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Update state
        totalDeposits[token] += amount;
        userDeposits[msg.sender][token] += amount;

        // Emit deposit event
        emit Deposit(msg.sender, token, amount, chain, block.timestamp);

        // Simulate AI routing (in real impl, this would be off-chain)
        _simulateYieldRouting(msg.sender, token, amount, chain);
    }

    /**
     * Simulate yield routing (mock for MVP)
     * In production, this would integrate with Avail intents
     */
    function _simulateYieldRouting(address user, address token, uint256 amount, string memory chain) internal {
        // Mock APY based on chain
        uint256 apy;
        string memory vault;
        if (keccak256(abi.encodePacked(chain)) == keccak256(abi.encodePacked("Base"))) {
            apy = 1200; // 12%
            vault = "BaseMoonwell";
        } else {
            apy = 800; // 8%
            vault = "SepoliaMock";
        }

        string memory intentId = string(abi.encodePacked("intent-", user, "-", token, "-", amount));

        // Emit routing event
        emit YieldRouted(user, token, amount, vault, apy, intentId);
    }

    /**
     * Withdraw deposited tokens (for testing)
     * @param token The token to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external nonReentrant {
        require(userDeposits[msg.sender][token] >= amount, "Insufficient balance");

        // Update state
        userDeposits[msg.sender][token] -= amount;
        totalDeposits[token] -= amount;

        // Transfer back
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /**
     * Get user deposit balance
     */
    function getUserDeposit(address user, address token) external view returns (uint256) {
        return userDeposits[user][token];
    }

    /**
     * Function that allows the owner to withdraw ETH (for gas refunds)
     */
    function withdrawETH() public {
        require(msg.sender == owner, "Not the Owner");
        (bool success, ) = owner.call{ value: address(this).balance }("");
        require(success, "Failed to send Ether");
    }

    /**
     * Receive ETH
     */
    receive() external payable {}
}

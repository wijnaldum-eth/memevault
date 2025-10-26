//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Mock ERC20 token for testing MemeVault
 */
contract MockMemeToken is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    // Mint more tokens for testing
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

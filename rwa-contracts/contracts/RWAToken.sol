// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RWAToken
 * @dev Standard ERC20 token for the RWA Platform Ecosystem.
 * Used for platform rewards, fees, and fractionalized land asset interactions.
 */
contract RWAToken is ERC20, ERC20Burnable, Ownable {
    
    constructor() ERC20("RWA Unified Token", "RWA") {
        // Mint initial supply of 10 billion RWA tokens (assuming 18 decimals)
        _mint(msg.sender, 10_000_000_000 * 10**decimals());
    }

    // 1 POL = 10,000 RWA tokens (example rate)
    uint256 public constant RATE = 10_000;

    /**
     * @dev Function to mint tokens. Restricted to contract owner.
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Purchase RWA tokens with native POL. Pure swapping logic on-chain.
     */
    function buyTokens() public payable {
        require(msg.value > 0, "Amount must be greater than zero");
        uint256 rwaAmount = msg.value * RATE;
        _mint(msg.sender, rwaAmount);
    }
}

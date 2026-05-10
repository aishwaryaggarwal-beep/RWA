// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RWASwap
 * @dev Simple contract to allow users to swap POL (native) for RWA tokens at a fixed rate.
 * The contract must be funded with RWA tokens by the owner first.
 */
contract RWASwap is Ownable {
    
    IERC20 public rwaToken;
    
    // Number of RWA tokens per 1 POL (e.g., 10000 means 1 POL = 10000 RWA)
    uint256 public swapRate = 10000;

    event TokensSwapped(address indexed buyer, uint256 polAmount, uint256 rwaAmount);
    event TokensSold(address indexed seller, uint256 rwaAmount, uint256 polAmount);

    constructor(address _rwaTokenAddress) {
        require(_rwaTokenAddress != address(0), "Invalid token address");
        rwaToken = IERC20(_rwaTokenAddress);
    }

    /**
     * @dev Buy RWA tokens using native POL.
     */
    function swapPOLforRWA() public payable {
        require(msg.value > 0, "Must send POL to swap");
        
        uint256 rwaAmount = msg.value * swapRate;
        
        require(rwaToken.balanceOf(address(this)) >= rwaAmount, "Insufficient RWA tokens in contract");
        
        bool success = rwaToken.transfer(msg.sender, rwaAmount);
        require(success, "RWA Transfer failed");

        emit TokensSwapped(msg.sender, msg.value, rwaAmount);
    }

    /**
     * @dev Convert RWA back into native POL.
     * User must approve the RWA tokens for the contract first.
     */
    function sellRWAforPOL(uint256 _rwaAmount) public {
        require(_rwaAmount > 0, "Amount must be greater than zero");
        require(rwaToken.balanceOf(msg.sender) >= _rwaAmount, "Insufficient RWA balance");

        // Calculate POL amount to return
        uint256 polAmount = _rwaAmount / swapRate;
        require(address(this).balance >= polAmount, "Insufficient POL in contract pool");

        // Take RWA tokens from user
        bool transferFromSuccess = rwaToken.transferFrom(msg.sender, address(this), _rwaAmount);
        require(transferFromSuccess, "RWA TransferFrom failed (Check allowance)");

        // Send POL back (Native Transfer)
        (bool success, ) = payable(msg.sender).call{value: polAmount}("");
        require(success, "POL payout failed");

        emit TokensSold(msg.sender, _rwaAmount, polAmount);
    }

    /**
     * @dev Update the swap rate.
     */
    function setSwapRate(uint256 _newRate) public onlyOwner {
        swapRate = _newRate;
    }

    /**
     * @dev Withdraw native POL from the contract.
     */
    function withdrawPOL() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Withdraw unsold RWA tokens.
     */
    function withdrawRWA(uint256 _amount) public onlyOwner {
        require(rwaToken.balanceOf(address(this)) >= _amount, "Insufficient RWA balance");
        rwaToken.transfer(owner(), _amount);
    }

    // Allow receiving POL
    receive() external payable {
        swapPOLforRWA();
    }
}

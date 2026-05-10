// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ILandVerifier {
    function getLandStatus(uint256 _landId) external view returns (bool isVerified, uint256 approvals, uint256 rejections);
}

/**
 * @title RWAMarketplace
 * @dev The central marketplace where Verified Land is sold by sellers, 
 * and bought by buyers using the RWAToken ecosystem currency.
 */
contract RWAMarketplace is Ownable, ReentrancyGuard {
    IERC1155 public landToken;
    IERC20 public rwaToken;
    ILandVerifier public verifier;

    struct Listing {
        address seller;
        uint256 pricePerFraction; // Cost in RWA Tokens
        uint256 availableFractions;
        bool isActive;
    }

    // Mapping from LandToken ID to its Market Listing
    mapping(uint256 => Listing) public listings;

    event LandListed(uint256 indexed tokenId, address indexed seller, uint256 fractions, uint256 pricePerFraction);
    event FractionsPurchased(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 amountPaid);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);

    constructor(address _landToken, address _rwaToken, address _verifier) {
        require(_landToken != address(0) && _rwaToken != address(0) && _verifier != address(0), "Invalid addresses");
        landToken = IERC1155(_landToken);
        rwaToken = IERC20(_rwaToken);
        verifier = ILandVerifier(_verifier);
    }

    /**
     * @dev Step 1: Used by sellers to list their tokens for sale.
     * The land must be VERIFIED in the LandVerifier contract first!
     * The seller must also call setApprovalForAll() on the LandToken contract to this Marketplace.
     */
    function listLand(uint256 tokenId, uint256 landId, uint256 fractions, uint256 pricePerFraction) external {
        // 1. Verify that the land passed Validator Oracle consensus
        (bool isVerified, , ) = verifier.getLandStatus(landId);
        require(isVerified, "ERROR: Land is not verified by validators yet");

        // 2. Assure seller has the required fractions minted & in their wallet
        require(landToken.balanceOf(msg.sender, tokenId) >= fractions, "Insufficient LandToken balance");

        // 3. Ensure contract is granted permission to move tokens upon purchase
        require(landToken.isApprovedForAll(msg.sender, address(this)), "Marketplace must be approved in LandToken first");

        listings[tokenId] = Listing({
            seller: msg.sender,
            pricePerFraction: pricePerFraction,
            availableFractions: fractions,
            isActive: true
        });

        emit LandListed(tokenId, msg.sender, fractions, pricePerFraction);
    }

    /**
     * @dev Step 2: Used by buyers to purchase land fractions.
     * The buyer must call approve() on the RWAToken contract to this Marketplace first.
     */
    function buyFractions(uint256 tokenId, uint256 amountToBuy) external nonReentrant {
        Listing storage listing = listings[tokenId];
        
        require(listing.isActive, "Listing is not active");
        require(listing.availableFractions >= amountToBuy, "Not enough fractions available");
        require(msg.sender != listing.seller, "Seller cannot buy their own land fractions");

        uint256 totalCostRWA = amountToBuy * listing.pricePerFraction;

        // 1. Ensure the buyer gave us permission to spend their RWA Tokens
        require(rwaToken.allowance(msg.sender, address(this)) >= totalCostRWA, "Marketplace allowance not set for RWA token");

        // Update listing
        listing.availableFractions -= amountToBuy;
        if (listing.availableFractions == 0) {
            listing.isActive = false;
        }

        // 2. Payment: Transfer RWA Tokens from Buyer -> Seller
        bool paymentSuccess = rwaToken.transferFrom(msg.sender, listing.seller, totalCostRWA);
        require(paymentSuccess, "RWA Token transfer failed");

        // 3. Asset Transfer: Transfer LandTokens (ERC1155) from Seller -> Buyer
        landToken.safeTransferFrom(listing.seller, msg.sender, tokenId, amountToBuy, "");

        emit FractionsPurchased(tokenId, msg.sender, listing.seller, amountToBuy);
    }

    /**
     * @dev Seller can cancel their listing anytime.
     */
    function cancelListing(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        require(msg.sender == listing.seller, "Only seller can cancel");
        require(listing.isActive, "Listing already inactive");

        listing.isActive = false;
        listing.availableFractions = 0;

        emit ListingCancelled(tokenId, msg.sender);
    }
}

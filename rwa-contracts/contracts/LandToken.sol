// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LandToken is ERC1155, Ownable {

    uint256 public currentTokenId;

    struct Land {
        uint256 tokenId;
        string metadataURI;
        uint256 totalSupply;
    }

    mapping(uint256 => Land) public lands;

    constructor() ERC1155("") {} // ✅ FIXED

    function mintLand(
        address owner,
        uint256 totalSupply,
        string memory metadataURI
    ) public onlyOwner returns (uint256) {

        currentTokenId++;

        uint256 tokenId = currentTokenId;

        lands[tokenId] = Land(tokenId, metadataURI, totalSupply);

        _mint(owner, tokenId, totalSupply, "");

        return tokenId;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return lands[tokenId].metadataURI;
    }
}
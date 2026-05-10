// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LandVerifier
 * @dev Multi-signature governance contract for validating Real World Assets (Real Estate).
 *      This contract mirrors the off-chain consensus engine, bringing immutable proof
 *      of validator approval onto the Polygon blockchain.
 */
contract LandVerifier {
    
    address public owner;
    
    struct LandAsset {
        uint256 id;
        string title;
        address sellerWallet;
        bool isVerified;
        uint256 approveCount;
        uint256 rejectCount;
        string metadataURI; // Points to IPFS JSON with precise location and details
    }
    
    mapping(address => bool) public isValidator;
    uint256 public totalValidators;
    
    // landId => LandAsset
    mapping(uint256 => LandAsset) public lands;
    
    // landId => (validatorAddress => bool(HasVoted))
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ValidatorAdded(address validator);
    event ValidatorRemoved(address validator);
    event LandRegistered(uint256 indexed landId, string title, address indexed sellerWallet);
    event VoteCast(uint256 indexed landId, address indexed validator, bool isApprove);
    event LandVerified(uint256 indexed landId);
    event LandRejected(uint256 indexed landId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyValidator() {
        require(isValidator[msg.sender], "Only registered validators can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
        isValidator[msg.sender] = true; // Owner is the initial validator
        totalValidators = 1;
    }

    /**
     * @dev Add a new auditor/validator to the oracle network.
     */
    function addValidator(address _validator) external onlyOwner {
        require(!isValidator[_validator], "Address is already a validator");
        isValidator[_validator] = true;
        totalValidators++;
        emit ValidatorAdded(_validator);
    }

    /**
     * @dev Remove a validator from the network.
     */
    function removeValidator(address _validator) external onlyOwner {
        require(isValidator[_validator], "Address is not a validator");
        isValidator[_validator] = false;
        totalValidators--;
        emit ValidatorRemoved(_validator);
    }

    /**
     * @dev Called by the backend when a seller initiates a listing.
     *      Logs the intent on-chain pending validator consensus.
     */
    function registerLand(uint256 _landId, string memory _title, address _sellerWallet, string memory _metadataURI) external onlyValidator {
        require(lands[_landId].sellerWallet == address(0), "Land already registered");
        
        lands[_landId] = LandAsset({
            id: _landId,
            title: _title,
            sellerWallet: _sellerWallet,
            isVerified: false,
            approveCount: 0,
            rejectCount: 0,
            metadataURI: _metadataURI
        });
        
        emit LandRegistered(_landId, _title, _sellerWallet);
    }

    /**
     * @dev Validators cast their vote here. Employs >50% majority logic.
     */
    function voteOnLand(uint256 _landId, bool _approve) external onlyValidator {
        require(lands[_landId].sellerWallet != address(0), "Land does not exist");
        require(!lands[_landId].isVerified, "Land is already verified");
        require(!hasVoted[_landId][msg.sender], "Validator has already voted on this land");

        hasVoted[_landId][msg.sender] = true;

        if (_approve) {
            lands[_landId].approveCount++;
        } else {
            lands[_landId].rejectCount++;
        }

        emit VoteCast(_landId, msg.sender, _approve);

        // Strict majority threshold (> 50%)
        // Using integer division, if total=1, required=1. if total=2, required=2. if total=3, required=2.
        uint256 requiredConsensus = (totalValidators / 2) + 1;

        if (lands[_landId].approveCount >= requiredConsensus) {
            lands[_landId].isVerified = true;
            emit LandVerified(_landId);
        } else if (lands[_landId].rejectCount >= requiredConsensus) {
            emit LandRejected(_landId);
        }
    }

    /**
     * @dev Fetch land status. Used by the Buy Marketplace to verify authenticity on-chain.
     */
    function getLandStatus(uint256 _landId) external view returns (bool isVerified, uint256 approvals, uint256 rejections) {
        LandAsset memory land = lands[_landId];
        return (land.isVerified, land.approveCount, land.rejectCount);
    }
}

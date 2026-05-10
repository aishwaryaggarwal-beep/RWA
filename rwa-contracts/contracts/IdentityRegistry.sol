// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentityRegistry
 * @dev Professional On-Chain Identity Proof for RWA Platform
 */
contract IdentityRegistry is Ownable {
    
    struct Identity {
        bool isVerified;
        uint256 verificationDate;
        string forensicProof; // Cryptographic signature from Auditor
    }

    mapping(address => Identity) public identities;
    mapping(address => bool) public auditors;

    event IdentityVerified(address indexed user, address indexed auditor, string forensicProof);
    event IdentityRevoked(address indexed user);
    event AuditorAdded(address indexed auditor);
    event AuditorRemoved(address indexed auditor);

    constructor() {
        auditors[msg.sender] = true;
    }

    modifier onlyAuditor() {
        require(auditors[msg.sender], "Caller is not an authorized auditor");
        _;
    }

    function addAuditor(address _auditor) external onlyOwner {
        auditors[_auditor] = true;
        emit AuditorAdded(_auditor);
    }

    function removeAuditor(address _auditor) external onlyOwner {
        auditors[_auditor] = false;
        emit AuditorRemoved(_auditor);
    }

    /**
     * @dev Register a forensic identity proof on-chain
     */
    function verifyUser(address _user, string calldata _forensicProof) external onlyAuditor {
        identities[_user] = Identity({
            isVerified: true,
            verificationDate: block.timestamp,
            forensicProof: _forensicProof
        });
        emit IdentityVerified(_user, msg.sender, _forensicProof);
    }

    /**
     * @dev Revoke verification if fraud is detected
     */
    function revokeIdentity(address _user) external onlyAuditor {
        identities[_user].isVerified = false;
        emit IdentityRevoked(_user);
    }

    /**
     * @dev Check if a user is verified on-chain
     */
    function isVerified(address _user) external view returns (bool) {
        return identities[_user].isVerified;
    }
}

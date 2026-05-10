// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RWAGovernance
 * @dev On-Chain Governance for Fractional Property Owners
 */
contract RWAGovernance is Ownable {
    
    IERC1155 public landToken;

    enum ProposalStatus { ACTIVE, PASSED, FAILED, EXECUTED }

    struct Proposal {
        uint256 id;
        uint256 landId; // The Token ID in LandToken contract
        string title;
        string description;
        uint256 deadline;
        uint256 forVotes;
        uint256 againstVotes;
        ProposalStatus status;
        mapping(address => bool) hasVoted;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    event ProposalCreated(uint256 indexed proposalId, uint256 indexed landId, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);

    constructor(address _landToken) {
        landToken = IERC1155(_landToken);
    }

    /**
     * @dev Create a new governance proposal for a specific property
     * Requirements: Proposer must own at least 1 fraction
     */
    function createProposal(
        uint256 _landId, 
        string calldata _title, 
        string calldata _description,
        uint256 _durationDays
    ) external {
        require(landToken.balanceOf(msg.sender, _landId) > 0, "Only fractional owners can propose");
        
        proposalCount++;
        Proposal storage p = proposals[proposalCount];
        p.id = proposalCount;
        p.landId = _landId;
        p.title = _title;
        p.description = _description;
        p.deadline = block.timestamp + (_durationDays * 1 days);
        p.status = ProposalStatus.ACTIVE;

        emit ProposalCreated(proposalCount, _landId, _title);
    }

    /**
     * @dev Cast an on-chain vote using fractional weight
     */
    function vote(uint256 _proposalId, bool _support) external {
        Proposal storage p = proposals[_proposalId];
        require(block.timestamp < p.deadline, "Voting has ended");
        require(!p.hasVoted[msg.sender], "Already voted");

        uint256 weight = landToken.balanceOf(msg.sender, p.landId);
        require(weight > 0, "No voting power for this asset");

        if (_support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }

        p.hasVoted[msg.sender] = true;
        emit VoteCast(_proposalId, msg.sender, _support, weight);
    }

    /**
     * @dev Finalize the proposal outcome
     */
    function finalizeProposal(uint256 _proposalId) external {
        Proposal storage p = proposals[_proposalId];
        require(block.timestamp >= p.deadline, "Voting period still active");
        require(p.status == ProposalStatus.ACTIVE, "Already finalized");

        if (p.forVotes > p.againstVotes) {
            p.status = ProposalStatus.PASSED;
        } else {
            p.status = ProposalStatus.FAILED;
        }
    }
}

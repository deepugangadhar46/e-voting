// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    // Mapping of candidate ID => Candidate
    mapping(uint256 => Candidate) public candidates;

    // Mapping of wallet address => bool (has voted)
    mapping(address => bool) public voters;

    // Array purely to keep track of candidate IDs
    uint256[] private candidateIds;
    
    uint256 public candidatesCount;
    
    address public admin;

    // Event triggered when a vote is cast
    event VotedEvent(uint256 indexed candidateId, address indexed voter);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addCandidate(string memory _name) public onlyAdmin {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
        candidateIds.push(candidatesCount);
    }

    function castVote(uint256 _candidateId) public {
        // Require that they haven't voted before
        require(!voters[msg.sender], "You have already voted.");

        // Require a valid candidate
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID.");

        // Record that voter has voted
        voters[msg.sender] = true;

        // Update candidate vote count
        candidates[_candidateId].voteCount++;

        // Trigger voted event
        emit VotedEvent(_candidateId, msg.sender);
    }
    
    function getCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidatesCount);
        for(uint256 i = 1; i <= candidatesCount; i++) {
            allCandidates[i-1] = candidates[i];
        }
        return allCandidates;
    }
}

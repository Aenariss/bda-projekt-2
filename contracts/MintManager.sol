/**
 * Author: Vojtech Fiala <xfiala61>
 */

// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;


// https://dev.to/willkre/create-deploy-an-erc-20-token-in-15-minutes-truffle-openzeppelin-goerli-33lb
// https://www.openzeppelin.com/contracts
contract MintManager {

    event TMAXProposalEvent(uint256 TMAXProposalCounter, address proposedBy, uint256 newTMAX);
    event TMAXChangeEvent(address proposedBy, uint256 newTMAX);

    struct TMAXProposal {
        address proposer;
        uint256 newTMAX;
        mapping(address => bool) votes;
        uint256 approvals;
    }

    mapping(uint256 => TMAXProposal) public pendingTMAXProposals;
    uint256 TMAXProposalCounter;
    uint256 private _TMAX; // limit how much a minter can mint per day

    constructor(uint256 TMAX_val, uint256 decimals) {
        _TMAX = TMAX_val * 10 ** decimals;
    }

    modifier didntVoteAlreadyTMAX(uint256 proposalId) {
        TMAXProposal storage p = pendingTMAXProposals[proposalId];
        if (p.votes[msg.sender]) {
            revert("Already voted!");
        }
        _;
    }

    /* Get how much has minted minted today */
    function TMAX() public view returns (uint256) {
        return _TMAX;
    }

    function voteForTMAX(uint256 proposalId, uint256 threshold) public
        didntVoteAlreadyTMAX(proposalId)
        returns (uint256)
    {
        TMAXProposal storage proposal = pendingTMAXProposals[proposalId];

        proposal.votes[msg.sender] = true;
        proposal.approvals++;

        // if enough approvals, change it and delete the proposal
        if (proposal.approvals >= threshold) {
            _TMAX = proposal.newTMAX;
            emit TMAXChangeEvent(proposal.proposer, proposal.newTMAX);
            delete pendingTMAXProposals[proposalId];
        }
        return _TMAX;
    }

     /* Set the new TMAX after majority consensus */
    function changeTMAX(uint256 newTMAX, uint256 threshold) public returns (uint256)
    {

        TMAXProposalCounter += 1;

        TMAXProposal storage proposal = pendingTMAXProposals[TMAXProposalCounter];
        proposal.proposer = msg.sender;
        proposal.newTMAX = newTMAX;
        proposal.votes[msg.sender] = true;
        proposal.approvals = 1;

        // Emit event
        emit TMAXProposalEvent(TMAXProposalCounter, msg.sender, newTMAX);

        // Only in case it already reached the threshold (only 1 minter)
        if (proposal.approvals >= threshold) {
            _TMAX = proposal.newTMAX;
            emit TMAXChangeEvent(proposal.proposer, proposal.newTMAX);
            delete pendingTMAXProposals[TMAXProposalCounter];
        }

        return _TMAX;
    }

}
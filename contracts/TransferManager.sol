/**
 * BDA Project 2 TransferManager used to amange restrAdmins and transferlimit
 * Author: Vojtech Fiala
 */

// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;


/* Serves to fulfill the management of mintingAdmins by consensus */
// https://dev.to/willkre/create-deploy-an-erc-20-token-in-15-minutes-truffle-openzeppelin-goerli-33lb
// https://www.openzeppelin.com/contracts
contract TransferManager {

    event restrAdminProposalEvent(uint256 proposalCounter, address proposedBy, address userToChange, bool flag);
    event restrAdminAdd(address proposedBy, address userToChange);
    event restrAdminRemove(address proposedBy, address userToChange);

    event limitChangeProposal(uint256 proposalCounter, address proposedBy, address userToChange, uint256 newLimit);
    event limitChangeEvent(address proposedBy, address userToChange, uint256 newLimit);

    struct dailyLimitChange {
        address proposedBy;
        address userToChange;
        uint256 newLimit;
        mapping(address => bool) votes;
        uint256 approvals;
    }

    struct restrAdminProposal {
        bool flag;
        address proposedBy;
        address userToChange;
        mapping(address => bool) votes;
        uint256 approvals;
    }

    mapping(uint256 => dailyLimitChange) internal dailyLimitChanges;
    mapping(uint256 => restrAdminProposal) internal restrAdminProposals;

    uint256[] public dailyLimitChangeIds;
    uint256[] public restrAdminProposalIds;

    uint256 private _TRANSFERLIMIT;

    uint256 dailyLimitProposalCounter;
    uint256 restrAdminProposalCounter;


    mapping(address => uint256) internal dailyLimit;
    mapping(address => mapping(uint256 => uint256)) internal dailySpendings;

    /*/
    modifier didntVoteDaily(uint256 proposalId) {
        dailyLimitChange storage p = dailyLimitChanges[proposalId];
        if (p.votes[msg.sender]) {
            revert("Already voted!");
        }
        _;
    }

    modifier didntVoteAlreadyNewRestr(uint256 proposalId) {
        restrAdminProposal storage p = restrAdminProposals[proposalId];
        if (p.votes[msg.sender]) {
            revert("Already voted!");
        }
        _;
    }
    */

    modifier didntVoteAlreadyTransfer(uint256 proposalId, mapping(address => bool) storage votes) {
        if (votes[msg.sender]) {
            revert("Already voted!");
        }
        _;
    }

    constructor(uint256 TRANSFERLIMITValue) {
        _TRANSFERLIMIT = TRANSFERLIMITValue * 10**18;
    }

    function TRANSFERLIMIT(address user) public view returns (uint256) {
        if (dailyLimit[user] > 0) {
            return dailyLimit[user];
        }
        else {
            return _TRANSFERLIMIT;
        }
    }

    /* Get restr proposals */
    function getRestrProposals() public view returns (uint256[] memory) {
        return restrAdminProposalIds;
    }

    /* Vote for changing daily limit of user in proposal */
    function voteDailyLimitChange(uint256 proposalId, uint256 threshold) internal
        didntVoteAlreadyTransfer(proposalId, dailyLimitChanges[proposalId].votes)
    {
        dailyLimitChange storage proposal = dailyLimitChanges[proposalId];

        if (proposal.approvals == 0) {
            revert("This vote is over or never happened to begin with!");
        }

        proposal.votes[msg.sender] = true;
        proposal.approvals++;

        // if enough approvals, change it and delete the proposal
        if (proposal.approvals >= threshold) {
            emit limitChangeEvent(proposal.proposedBy, proposal.userToChange, proposal.newLimit);

            // Delete proposal ID from existing IDs
            for (uint256 i = 0; i < dailyLimitChangeIds.length; i++) {
                if (dailyLimitChangeIds[i] == proposalId) {
                    // Replace the element to delete with the last element
                    dailyLimitChangeIds[i] = dailyLimitChangeIds[dailyLimitChangeIds.length - 1];
                    // Remove the last element
                    dailyLimitChangeIds.pop();
                    break;
                }
            }
            delete dailyLimitChanges[proposalId];
            dailyLimit[proposal.userToChange] = proposal.newLimit;
        }
    }

    /* Vote for changing daily limit of user in proposal */
    function voteNewRestrAdmin(uint256 proposalId, uint256 threshold) internal
        didntVoteAlreadyTransfer(proposalId, restrAdminProposals[proposalId].votes) returns (restrAdminProposal storage)
    {
        restrAdminProposal storage proposal = restrAdminProposals[proposalId];

        if (proposal.approvals == 0) {
            revert("This vote is over or never happened to begin with!");
        }

        proposal.votes[msg.sender] = true;
        proposal.approvals++;

        // if enough approvals, change it and delete the proposal
        if (proposal.approvals >= threshold) {

            if (proposal.flag) {
                emit restrAdminAdd(proposal.proposedBy, proposal.userToChange);
            }
            else {
                emit restrAdminRemove(proposal.proposedBy, proposal.userToChange);
            }

            // Delete proposal ID from existing IDs
            for (uint256 i = 0; i < restrAdminProposalIds.length; i++) {
                if (restrAdminProposalIds[i] == proposalId) {
                    // Replace the element to delete with the last element
                    restrAdminProposalIds[i] = restrAdminProposalIds[restrAdminProposalIds.length - 1];
                    // Remove the last element
                    restrAdminProposalIds.pop();
                    break;
                }
            }
            delete restrAdminProposals[proposalId];
            return proposal;
        }
        return proposal;
    }

    /* Function to change given user's daily limit */
    function setDailyLimitForUser(address user, uint256 limit, uint256 threshold) internal {

        dailyLimitProposalCounter += 1;

        dailyLimitChange storage proposal = dailyLimitChanges[dailyLimitProposalCounter];
        proposal.proposedBy = msg.sender;
        proposal.userToChange = user;
        proposal.votes[msg.sender] = true;
        proposal.approvals = 1;
        proposal.newLimit = limit;

        // Emit event
        emit limitChangeProposal(dailyLimitProposalCounter, msg.sender, user, limit);

        dailyLimitChangeIds.push(dailyLimitProposalCounter);

        // Only in case it already reached the threshold (only 1 minter)
        if (proposal.approvals >= threshold) {
            emit limitChangeEvent(proposal.proposedBy, proposal.userToChange, proposal.newLimit);

            // Delete proposal ID from existing IDs
            for (uint256 i = 0; i < dailyLimitChangeIds.length; i++) {
                if (dailyLimitChangeIds[i] == dailyLimitProposalCounter) {
                    // Replace the element to delete with the last element
                    dailyLimitChangeIds[i] = dailyLimitChangeIds[dailyLimitChangeIds.length - 1];
                    // Remove the last element
                    dailyLimitChangeIds.pop();
                    break;
                }
            }
            dailyLimit[user] = limit;
        }
    }

    /* Function to change given user's role */
    function setRestrAdmin(address user, uint256 threshold, bool flag) internal returns (bool) {

        restrAdminProposalCounter += 1;

        restrAdminProposal storage proposal = restrAdminProposals[restrAdminProposalCounter];
        proposal.proposedBy = msg.sender;
        proposal.userToChange = user;
        proposal.flag = flag;
        proposal.votes[msg.sender] = true;
        proposal.approvals = 1;

        // Emit event
        emit restrAdminProposalEvent(restrAdminProposalCounter, proposal.proposedBy, proposal.userToChange, flag);
        
        restrAdminProposalIds.push(restrAdminProposalCounter);

        // Only in case it already reached the threshold (only 1 minter)
        if (proposal.approvals >= threshold) {
            // True
            if (proposal.flag) {
                emit restrAdminAdd(proposal.proposedBy, proposal.userToChange);
            }
            else {
                emit restrAdminRemove(proposal.proposedBy, proposal.userToChange);
            }

            // Delete proposal ID from existing IDs
            for (uint256 i = 0; i < restrAdminProposalIds.length; i++) {
                if (restrAdminProposalIds[i] == restrAdminProposalCounter) {
                    // Replace the element to delete with the last element
                    restrAdminProposalIds[i] = restrAdminProposalIds[restrAdminProposalIds.length - 1];
                    // Remove the last element
                    restrAdminProposalIds.pop();
                    break;
                }
            }
            delete restrAdminProposals[restrAdminProposalCounter];
            return true;

        }
        return false;
    }

    /* Get how much has minted minted today */
    function sentToday(address user) public view returns (uint256) {
        uint256 day = block.timestamp / (1 days);
        return dailySpendings[user][day];
    }
}

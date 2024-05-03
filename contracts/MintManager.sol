/**
 * Author: Vojtech Fiala <xfiala61>
 */

// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;


/* Serves to fulfill the management of mintingAdmins by consensus */
// https://dev.to/willkre/create-deploy-an-erc-20-token-in-15-minutes-truffle-openzeppelin-goerli-33lb
// https://www.openzeppelin.com/contracts
contract MintManager {

    event TMAXProposalEvent(uint256 TMAXProposalCounter, address proposedBy, uint256 newTMAX);
    event TMAXChangeEvent(address proposedBy, uint256 newTMAX);

    event mintLimitOverrideProposal(uint256 mintProposalCounter, address proposedBy, uint256 toMint);
    event mintLimitOverride(address proposedBy, uint256 toMint);

    event minterProposalEvent(uint256 minterProposalCounter, address proposedBy, address newMinter, bool flag);
    event minterRemovalEvent(address proposedBy, address removedMinter);
    event minterAcceptanceEvent(address proposedBy, address newMinter);

    mapping(address => mapping(uint256 => uint256)) internal _mintedToday; // how much a minter has already minted today

    struct TMAXProposal {
        address proposer;
        uint256 newTMAX;
        mapping(address => bool) votes;
        uint256 approvals;
    }

    struct mintOverrideProposal {
        address proposer;
        address mintAddress;
        uint256 toMint;
        mapping(address => bool) votes;
        uint256 approvals;
    }

    struct minterProposal {
        bool flag;
        address proposer;
        address newMinter;
        mapping(address => bool) votes;
        uint256 approvals;
    }

    mapping(uint256 => TMAXProposal) public pendingTMAXProposals;
    mapping(uint256 => mintOverrideProposal) public mintOverrideProposals;
    mapping(uint256 => minterProposal) public minterProposals;

    uint256[] public pendingTMAXProposalsIds;
    uint256[] public mintOverrideProposalsIds;
    uint256[] public minterProposalsIds;
    
    uint256 TMAXProposalCounter;
    uint256 mintProposalCounter;
    uint256 minterProposalCounter;
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

    modifier didntVoteAlreadyMint(uint256 proposalId) {
        mintOverrideProposal storage p = mintOverrideProposals[proposalId];
        if (p.votes[msg.sender]) {
            revert("Already voted!");
        }
        _;
    }

    modifier didntVoteAlreadyMinter(uint256 proposalId) {
        minterProposal storage p = minterProposals[proposalId];
        if (p.votes[msg.sender]) {
            revert("Already voted!");
        }
        _;
    }

    /* Get how much has minted minted today */
    function TMAX() public view returns (uint256) {
        return _TMAX;
    }

    /* Get how much has minted minted today */
    function getMinterProposals() public view returns (uint256[] memory) {
        return minterProposalsIds;
    }

    /* Get how much has minted minted today */
    function votedMinter(uint256 id) public view returns (bool) {
        return minterProposals[id].votes[msg.sender];
    }

    function voteForTMAX(uint256 proposalId, uint256 threshold) internal
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

            // Delete proposal ID from existing IDs
            for (uint256 i = 0; i < pendingTMAXProposalsIds.length; i++) {
                if (pendingTMAXProposalsIds[i] == proposalId) {
                    // Replace the element to delete with the last element
                    pendingTMAXProposalsIds[i] = pendingTMAXProposalsIds[pendingTMAXProposalsIds.length - 1];
                    // Remove the last element
                    pendingTMAXProposalsIds.pop();
                    break;
                }
            }

            delete pendingTMAXProposals[proposalId];
        }
        return _TMAX;
    }

    /* Vote for onetime exceeded mint proposal. Return true or false if it succeeded */
    function voteForMint(uint256 proposalId, uint256 threshold) internal
        didntVoteAlreadyMint(proposalId)
        returns (mintOverrideProposal storage)
    {
        mintOverrideProposal storage proposal = mintOverrideProposals[proposalId];

        proposal.votes[msg.sender] = true;
        proposal.approvals++;

        // if enough approvals, change it and delete the proposal
        if (proposal.approvals >= threshold) {
            emit mintLimitOverride(proposal.proposer, proposal.toMint);

            // Delete proposal ID from existing IDs
            for (uint256 i = 0; i < mintOverrideProposalsIds.length; i++) {
                if (mintOverrideProposalsIds[i] == proposalId) {
                    // Replace the element to delete with the last element
                    mintOverrideProposalsIds[i] = mintOverrideProposalsIds[mintOverrideProposalsIds.length - 1];
                    // Remove the last element
                    mintOverrideProposalsIds.pop();
                    break;
                }
            }

            delete mintOverrideProposals[proposalId];
            return proposal;
        }
        return proposal;
    }

    function voteForMinter(uint256 proposalId, uint256 threshold) internal
        didntVoteAlreadyMinter(proposalId)
        returns (minterProposal storage)
    {
        minterProposal storage proposal = minterProposals[proposalId];

        proposal.votes[msg.sender] = true;
        proposal.approvals++;

        // if enough approvals, change it and delete the proposal
        if (proposal.approvals >= threshold) {
            if (proposal.flag) {
                emit minterAcceptanceEvent(proposal.proposer, proposal.newMinter);
            }
            else {
                emit minterRemovalEvent(proposal.proposer, proposal.newMinter);
            }

            // Delete proposal ID from existing IDs
            for (uint256 i = 0; i < minterProposalsIds.length; i++) {
                if (minterProposalsIds[i] == proposalId) {
                    // Replace the element to delete with the last element
                    minterProposalsIds[i] = minterProposalsIds[minterProposalsIds.length - 1];
                    // Remove the last element
                    minterProposalsIds.pop();
                    break;
                }
            }
            delete minterProposals[proposalId];
        }
        return proposal;
    }

     /* Create proposal for changing status of user to a minter or remove it  - true = add, false = remove */
    function proposeMinter(address account, uint256 threshold, bool flag) internal returns (bool)
    {

        minterProposalCounter += 1;

        minterProposal storage proposal = minterProposals[minterProposalCounter];
        proposal.proposer = msg.sender;
        proposal.flag = flag;
        proposal.newMinter = account;
        proposal.votes[msg.sender] = true;
        proposal.approvals = 1;

        // Emit event
        emit minterProposalEvent(minterProposalCounter, proposal.proposer, proposal.newMinter, flag);
        
        minterProposalsIds.push(minterProposalCounter);

        // Only in case it already reached the threshold (only 1 minter)
        if (proposal.approvals >= threshold) {
            // True
            if (proposal.flag) {
                emit minterAcceptanceEvent(proposal.proposer, proposal.newMinter);
            }
            else {
                emit minterRemovalEvent(proposal.proposer, proposal.newMinter);
            }

            // Delete proposal ID from existing IDs
            for (uint256 i = 0; i < minterProposalsIds.length; i++) {
                if (minterProposalsIds[i] == minterProposalCounter) {
                    // Replace the element to delete with the last element
                    minterProposalsIds[i] = minterProposalsIds[minterProposalsIds.length - 1];
                    // Remove the last element
                    minterProposalsIds.pop();
                    break;
                }
            }
            delete minterProposals[TMAXProposalCounter];
            
            return true;

        }

        return false;
    }

    /* Create proposal for exceeded minting */
    function proposeMint(uint256 toMint, address account, uint256 threshold) internal returns (bool)
    {

        mintProposalCounter += 1;

        mintOverrideProposal storage proposal = mintOverrideProposals[mintProposalCounter];
        proposal.proposer = msg.sender;
        proposal.toMint = toMint;
        proposal.votes[msg.sender] = true;
        proposal.approvals = 1;
        proposal.mintAddress = account;

        // Emit event
        emit mintLimitOverrideProposal(mintProposalCounter, msg.sender, toMint);

        mintOverrideProposalsIds.push(mintProposalCounter);

        // Only in case it already reached the threshold (only 1 minter)
        if (proposal.approvals >= threshold) {
            emit mintLimitOverride(msg.sender, toMint);

            // Delete proposal ID from existing IDs
            for (uint256 i = 0; i < mintOverrideProposalsIds.length; i++) {
                if (mintOverrideProposalsIds[i] == mintProposalCounter) {
                    // Replace the element to delete with the last element
                    mintOverrideProposalsIds[i] = mintOverrideProposalsIds[mintOverrideProposalsIds.length - 1];
                    // Remove the last element
                    mintOverrideProposalsIds.pop();
                    break;
                }
            }

            delete mintOverrideProposals[mintProposalCounter];
            return true;
        }

        return false;
    }

     /* Set the new TMAX after majority consensus */
    function proposeTMAX(uint256 newTMAX, uint256 threshold) internal returns (uint256)
    {

        TMAXProposalCounter += 1;

        TMAXProposal storage proposal = pendingTMAXProposals[TMAXProposalCounter];
        proposal.proposer = msg.sender;
        proposal.newTMAX = newTMAX;
        proposal.votes[msg.sender] = true;
        proposal.approvals = 1;

        // Emit event
        emit TMAXProposalEvent(TMAXProposalCounter, msg.sender, newTMAX);

        pendingTMAXProposalsIds.push(TMAXProposalCounter);

        // Only in case it already reached the threshold (only 1 minter)
        if (proposal.approvals >= threshold) {
            _TMAX = proposal.newTMAX;
            emit TMAXChangeEvent(proposal.proposer, proposal.newTMAX);

            // Delete proposal ID from existing IDs
            for (uint256 i = 0; i < pendingTMAXProposalsIds.length; i++) {
                if (pendingTMAXProposalsIds[i] == TMAXProposalCounter) {
                    // Replace the element to delete with the last element
                    pendingTMAXProposalsIds[i] = pendingTMAXProposalsIds[pendingTMAXProposalsIds.length - 1];
                    // Remove the last element
                    pendingTMAXProposalsIds.pop();
                    break;
                }
            }

            delete pendingTMAXProposals[TMAXProposalCounter];
        }

        return _TMAX;
    }

    /* Get how much has minted minted today */
    function mintedToday(address user) public view returns (uint256) {
        uint256 day = block.timestamp / 1 days;
        return _mintedToday[user][day];
    }
}

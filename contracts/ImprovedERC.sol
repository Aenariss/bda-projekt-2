/**
 * BDA Project 2 ImprovedERC
 * Author: Vojtech Fiala
 * The main contract that is interacted with. Inspired by DEMO exercise
 */


// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./MintManager.sol";
import "./TransferManager.sol";


// https://dev.to/willkre/create-deploy-an-erc-20-token-in-15-minutes-truffle-openzeppelin-goerli-33lb
// https://www.openzeppelin.com/contracts
contract ImprovedERC is ERC20, AccessControl, MintManager, TransferManager  {

    uint256 private _totalSupplyCap;
    uint256 private consensusThreshold;
    uint256 private consensusThresholdRestr;
    address[] public mintAdmins;
    address[] public restrAdmins;
    bytes32 private constant _mintingAdmin = keccak256("mintingAdmin");
    bytes32 private constant _restrAdmin = keccak256("restrAdmin");

    event Mint(address proposedBy, address addr, uint256 value);
    
    constructor(string memory name, string memory symbol, uint256 totalSupply, uint256 TMAX_val, uint256 TRANSFERLIMIT) ERC20(name, symbol) MintManager(TMAX_val, decimals()) TransferManager(TRANSFERLIMIT) {

        require(totalSupply > 0, "Initial supply has to be greater than 0");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(_mintingAdmin, msg.sender);
        _grantRole(_restrAdmin, msg.sender);

        mintAdmins.push(msg.sender);
        restrAdmins.push(msg.sender);
        consensusThresholdRestr = (restrAdmins.length / 2) + 1;
        consensusThreshold = (mintAdmins.length / 2) + 1;

        _totalSupplyCap = totalSupply * 10 ** decimals(); // hard cap the number of tokens
        mint(msg.sender, TMAX() / 2); // give half the total amount to the account
    }

    function getRolesOfUser(address user) public view returns (bool[] memory) {

        bool[] memory roles = new bool[](2);
        roles[0] = hasRole(_mintingAdmin, user);
        roles[1] = hasRole(_restrAdmin, user);
        return roles;
    }
    

    /* Modifier to ensure the total token cap is not exceeded */
    modifier doesntExceedTotalCap(address from, address to, uint256 value) {

        // If this was a minting process
        if (from == address(0)) {
            uint256 current_total = totalSupply();
            if (current_total + value > _totalSupplyCap ) {
                revert("This would go over the total supply!");
            }
        }
        _;
    }

    /* Get the total supply cap */
    function getTotalSupplyCap() public view returns (uint256 totalSupplyCap) {
        return _totalSupplyCap;
    }

      /* Get users with mintADmin roles */
    function getMintAdmins() public view returns (address[] memory) {
        // optimization
        address[] memory result = new address[](mintAdmins.length);
        for (uint i = 0; i < mintAdmins.length; i++) {
            result[i] = mintAdmins[i];
        }
        return result;
    }

      /* Get users with restrAdmin roles */
    function getRestrAdmins() public view returns (address[] memory) {
        address[] memory result = new address[](restrAdmins.length);
        for (uint i = 0; i < restrAdmins.length; i++) {
            result[i] = restrAdmins[i];
        }
        return result;
    }


    /* Set the new TMAX after majority consensus */
    function newTMAXProposal(uint256 newTMAX) public 
        onlyRole(_mintingAdmin)
    {
        proposeTMAX(newTMAX, consensusThreshold);
        
    }

    function voteForTMAX(uint256 proposalId) public 
        onlyRole(_mintingAdmin)
    {
        voteForTMAX(proposalId, consensusThreshold);
    }

    function transfer(address to, uint256 value) public override returns (bool)
    {
        uint256 day = block.timestamp / (1 days);

        if (dailySpendings[msg.sender][day] + value > TRANSFERLIMIT(msg.sender)) {
            revert("You mustn't cross the TRANSFERLIMIT!");
        }

        dailySpendings[msg.sender][day] += value;

        return super.transfer(to, value);
    }

    /**
     * @dev Transfers a `value` amount of tokens from `from` to `to`. Never changes the total supply value. Doesn't allow sending tokens to 0x0. 
     * Ensures the values from and to are not 0 to disallow changing the total supply of tokens. Then calls the parent class method
     */
    function _update(address from, address to, uint256 value) internal override 
        doesntExceedTotalCap(from, to, value)
    {
        // cant burn tokens
        if (to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }

        super._update(from, to, value);
    }

    /**
     * @dev custom mint function - needs to be mintingAdmin role to access.
     * Minter mustnt excceed the TMAX value of minted per day
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     */
    function mint(address account, uint256 value) public 
        onlyRole(_mintingAdmin)
    {   
        require(value > 0, "Can't mint zero");

        uint256 day = block.timestamp / (1 days);

        if (_mintedToday[msg.sender][day] + value > TMAX()) {
            // Create request for one time minting increase
            bool passed = proposeMint(value, account, consensusThreshold);
            if (passed) {
                // Dont increase mintedToday limit, this was special
                _mintedToday[msg.sender][day] += value;
                _mint(account, value);
                emit Mint(msg.sender, account, value);
            }
        }
        else {
            _mintedToday[msg.sender][day] += value;

            _mint(account, value);
            emit Mint(msg.sender, account, value);
        }
    }

    /* In this special case, user's limit isn't increased */
    function voteMintIncrease(uint256 proposalId) public 
        onlyRole(_mintingAdmin)
    {
        mintOverrideProposal storage passed = voteForMint(proposalId, consensusThreshold);

        if (passed.approvals >= consensusThreshold) {
            _mint(passed.mintAddress, passed.toMint);
            emit Mint(passed.proposer, passed.mintAddress, passed.toMint);
        }
    }

    /* Method to appoint a new minting admin 
     * Flag indicates whether its adding a minter or removing a minter
     */
    function newMinterProposal(address minter, bool flag) public 
        onlyRole(_mintingAdmin)
    {   
        // adding
        if (flag) {
            if (hasRole(_mintingAdmin, minter)) {
                revert("The user is already a mintAdmin!");
            }
        }
        //removing
        else {
            if (!hasRole(_mintingAdmin, minter)) {
                revert("The user isn't a mintAdmin!");
            }
        }

        bool pass = proposeMinter(minter, consensusThreshold, flag);

        if (pass) {
            // appointing
            if (flag) {
                mintAdmins.push(minter);
                consensusThreshold = (mintAdmins.length / 2) + 1;
                _grantRole(_mintingAdmin, minter);
            }
            else {
                // Delete minter from mintAdmins
                for (uint256 i = 0; i < mintAdmins.length; i++) {
                    if (mintAdmins[i] == minter) {
                        // Replace the element to delete with the last element
                        mintAdmins[i] = mintAdmins[mintAdmins.length - 1];
                        // Remove the last element
                        mintAdmins.pop();
                        break;
                    }
                }
                consensusThreshold = (mintAdmins.length / 2) + 1;
                _revokeRole(_mintingAdmin, minter);
            }
        }
    }

    /* Method to vote for the appointment of a new minting admin */
    function voteForMinter(uint256 proposalId) public 
        onlyRole(_mintingAdmin)
    {
        minterProposal storage proposal = voteForMinter(proposalId, consensusThreshold);

        if (proposal.flag) {
            if (hasRole(_mintingAdmin, proposal.newMinter)) {
                revert("The user is already a mintAdmin!");
            }
        }
        else {
            if (!hasRole(_mintingAdmin, proposal.newMinter)) {
                revert("The user isn't a mintAdmin!");
            }
        }
        // vote is over
        if (proposal.approvals >= consensusThreshold) {
            if (proposal.flag) {
                mintAdmins.push(proposal.newMinter);
                consensusThreshold = (mintAdmins.length / 2) + 1;
                _grantRole(_mintingAdmin, proposal.newMinter);
            }
            else {
                // Delete minter from mintAdmins
                for (uint256 i = 0; i < mintAdmins.length; i++) {
                    if (mintAdmins[i] == proposal.newMinter) {
                        // Replace the element to delete with the last element
                        mintAdmins[i] = mintAdmins[mintAdmins.length - 1];
                        // Remove the last element
                        mintAdmins.pop();
                        break;
                    }
                }
                consensusThreshold = (mintAdmins.length / 2) + 1;
                _revokeRole(_mintingAdmin, proposal.newMinter);
            }
        }
    }

    function voteDailyLimit(uint256 proposalId) public 
        onlyRole(_restrAdmin)
    {
        voteDailyLimitChange(proposalId, consensusThresholdRestr);
    }

    function changeDailyLimit(address user, uint256 limit) public 
        onlyRole(_restrAdmin)
    {
        setDailyLimitForUser(user, limit, consensusThresholdRestr);
    }

    function voteForRestrAdmin(uint256 proposalId) public 
        onlyRole(_restrAdmin)
    {
        restrAdminProposal storage proposal = voteNewRestrAdmin(proposalId, consensusThresholdRestr);
        
        // vote is over
        if (proposal.approvals >= consensusThresholdRestr) {
            if (proposal.flag) {
                restrAdmins.push(proposal.userToChange);
                consensusThresholdRestr = (restrAdmins.length / 2) + 1;
                _grantRole(_restrAdmin, proposal.userToChange);
            }
            else {
                // Delete restriction admin from restrAdmins
                for (uint256 i = 0; i < restrAdmins.length; i++) {
                    if (restrAdmins[i] == proposal.userToChange) {
                        // Replace the element to delete with the last element
                        restrAdmins[i] = restrAdmins[restrAdmins.length - 1];
                        // Remove the last element
                        restrAdmins.pop();
                        break;
                    }
                }
                consensusThresholdRestr = (restrAdmins.length / 2) + 1;
                _revokeRole(_restrAdmin, proposal.userToChange);
            }
        }
    }

    function newRestrAdmin(address user, bool flag) public
        onlyRole(_restrAdmin)
    {

        // adding
        if (flag) {
            if (hasRole(_restrAdmin, user)) {
                revert("The user is already a mintAdmin!");
            }
        }
        //removing
        else {
            if (!hasRole(_restrAdmin, user)) {
                revert("The user isn't a mintAdmin!");
            }
        }

        bool pass = setRestrAdmin(user, consensusThresholdRestr, flag);

        if (pass) {
            // appointing
            if (flag) {
                restrAdmins.push(user);
                consensusThresholdRestr = (restrAdmins.length / 2) + 1;
                _grantRole(_restrAdmin, user);
            }
            else {
                // Delete user from restrAdmins
                for (uint256 i = 0; i < restrAdmins.length; i++) {
                    if (restrAdmins[i] == user) {
                        // Replace the element to delete with the last element
                        restrAdmins[i] = restrAdmins[restrAdmins.length - 1];
                        // Remove the last element
                        restrAdmins.pop();
                        break;
                    }
                }
                consensusThresholdRestr = (restrAdmins.length / 2) + 1;
                _revokeRole(_restrAdmin, user);
            }

        }
    }
    
}

/**
 * BDA Project 2 Tests
 * Very much inspired by the DEMO exercise
 * Author: Vojtech Fiala
 */

var ImprovedERC = artifacts.require("ImprovedERC");
var conf = require("../config/erc_config.js");
var Web3 = require('web3');
var W3 = new Web3();
const BN = web3.utils.BN;

const GAS_PRICE = 20000000000; // in Wei


async function ethBalanceOf(contract, account) {
    const balance = await contract.balanceOf(account);
    const balanceInEth = W3.utils.fromWei(balance.toString(), 'ether')
    return balanceInEth;
}

function convertBNToEth(amount) {
    return W3.utils.fromWei(amount.toString(), 'ether')
}

contract(' TEST SUITE 1 [ Basic functionality of token ]', function(accounts) {

    const sender = accounts[0]
    const decimals = 18

    // Requirement 1 -- Capping the total supply of tokens. Can be set in config/erc_config.js
    it("Total available supply (that will never be crossed, even after minting) matches config", async() => {
        var contract = await ImprovedERC.deployed();

        var totalSupply = await contract.getTotalSupplyCap();
        assert( W3.utils.fromWei(totalSupply.toString()) == conf.SUPPLY_CAP)
        console.log("Total Supply is:", W3.utils.fromWei(totalSupply.toString()))

        // Mint more than the cap (2x+1 as much) -- this should create mintOVerrideProposal
        const mintAmount = BigInt(((conf.TMAX / 2) + 1) * 10**decimals);
        var receipt = await contract.mint(sender, mintAmount, {from: sender});
        console.log('Gas used:', receipt.receipt.gasUsed);

        // Since there's only 1 admin for now, lets check the proposal was made and approved
        assert(isEventInLogs("mintLimitOverrideProposal", receipt.receipt.logs));
        assert(isEventInLogs("mintLimitOverride", receipt.receipt.logs));

    }); 

    // Check you can send tokens
    it("Token balance of addr 1-9 is 100", async() => {
        var contract = await ImprovedERC.deployed()
        for (const account of accounts) {
            if (account == sender) {
                continue;
            }

            // ionitial balance of account is 0
            const balanceInEth = await ethBalanceOf(contract, account);
            assert.equal(balanceInEth, 0);

            // send 100 ether tokens to each address
            var receipt = await contract.transfer(account, W3.utils.toBN(1 * 10**decimals), {from: sender});
            console.log('Gas used:', receipt.receipt.gasUsed);

            assert(isEventInLogs("Transfer", receipt.receipt.logs));

            const newBalanceInEth = await ethBalanceOf(contract, account);
            assert.equal(newBalanceInEth, 1);

            console.log('Balance of:',account, "was:", balanceInEth, "is:", newBalanceInEth);
        }
    });
    
    // Check you cannot send tokens you dont have
    it("Cannot send tokens you don't have", async() => {
        var contract = await ImprovedERC.deployed();

        var test_acc = accounts[3];
        var test_acc_2 = accounts[4];

        var curr_bal = await contract.balanceOf(test_acc);

        try {
            var receipt = await contract.transfer(test_acc_2, curr_bal+1, {from: test_acc});
            console.log('Gas used:', receipt.receipt.gasUsed);
            assert(!isEventInLogs("Transfer", receipt.receipt.logs));
        }
        catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            // Reverted
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    });

    // Check mintingAdmin can mint new tokens and other roles can't.
    it("Can only mint if admin", async() => {
        var contract = await ImprovedERC.deployed();

        var minter = sender;
        var not_minter = accounts[4];

        var mint_amount =  W3.utils.toBN(1 * 10**decimals);

        
        var balInEth = await ethBalanceOf(contract, minter);
        var receipt = await contract.mint(minter, mint_amount, {from: minter});
        console.log('Gas used:', receipt.receipt.gasUsed);
        var newBalInEth = await ethBalanceOf(contract, minter);

        // Check admin can mint
        assert(parseInt(balInEth) + 1 == parseInt(newBalInEth));

        // Check other user cannot mint
        var balInEth = await ethBalanceOf(contract, not_minter);
        // Revert must happen
        try {
            var receipt = await contract.mint(minter, mint_amount, {from: not_minter});
            console.log('Gas used:', receipt.receipt.gasUsed);
        }
        catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            // Reverted
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
        var newBalInEth = await ethBalanceOf(contract, not_minter);

        assert(balInEth == newBalInEth);
    });

    // Can not exceed the TMAX value
    it("Can not exceed TMAX value", async() => {
        var contract = await ImprovedERC.deployed();

        var minter = sender;

        var already_minted =  await contract.mintedToday(sender);

        var can_mint = await contract.TMAX();
        can_mint = can_mint - already_minted;

        console.log("Already minted:", convertBNToEth(already_minted), "can mint:", convertBNToEth(can_mint));

        /* Try to mint +1 the mintable limit */
        try {
            var receipt = await contract.mint(minter, BigInt((1000 * 10**decimals)), {from: minter});
            console.log('Gas used:', receipt.receipt.gasUsed);
        }
        catch (error) {

            console.log("Exceeded TMAX! Success");
            const revertFound = error.message.search('revert') >= 0;
            // Reverted
            assert(revertFound, `Expected "revert", got ${error} instead`);

        }
    });

    // Changing TMAX 
    it("Change TMAX, only minters can -- only 1 admin", async() => {
        var contract = await ImprovedERC.deployed();

        var minter = sender;
        var not_minter = accounts[4];


        var old_tmax = await contract.TMAX();

        var eth_limit = convertBNToEth(old_tmax)
        var receipt = await contract.newTMAXProposal(BigInt((parseInt(eth_limit)+1000) * 10**decimals), {from: minter})
        console.log('Gas used:', receipt.receipt.gasUsed);
        var new_tmax = await contract.TMAX();

        // There has to be proposal and change events ucz only 1 admin
        assert(isEventInLogs("TMAXProposalEvent", receipt.receipt.logs));
        assert(isEventInLogs("TMAXChangeEvent", receipt.receipt.logs));
        
        console.log("Old TMAX:", convertBNToEth(old_tmax), "New TMAX:", convertBNToEth(new_tmax));

        /* Try to change tmax when not minter */
        try {
            var receipt = await contract.newTMAXProposal(BigInt((eth_limit+2000) * 10**decimals), {from: not_minter});
            console.log('Gas used:', receipt.receipt.gasUsed);
        }
        catch (error) {

            console.log("Non-minter tried to change TMAX! Success");
            const revertFound = error.message.search('revert') >= 0;
            // Reverted
            assert(revertFound, `Expected "revert", got ${error} instead`);

        }
    });

    // Add 2 new users as minters and test you need them to agree
    it("Add new Minter admins", async() => {
        var contract = await ImprovedERC.deployed();

        var minter_original = sender;
        var not_minter_1 = accounts[4];
        var not_minter_2 = accounts[5];

        var receipt = await contract.newMinterProposal(not_minter_1, true, {from: minter_original});
        console.log('Gas used:', receipt.receipt.gasUsed);

        assert(isEventInLogs("minterProposalEvent", receipt.receipt.logs));
        assert(isEventInLogs("minterAcceptanceEvent", receipt.receipt.logs));

        var receipt = await contract.newMinterProposal(not_minter_2, true, {from: minter_original});
        console.log('Gas used:', receipt.receipt.gasUsed);
        assert(isEventInLogs("minterProposalEvent", receipt.receipt.logs));
        assert(!isEventInLogs("minterAcceptanceEvent", receipt.receipt.logs)); // cant be accepted yet

        // get existing proposals
        var pendingMinters = await contract.getMinterProposals();

        // It will be important to later check if he voted already
        var receipt = await contract.voteForMinter(pendingMinters[0], {from: not_minter_1});
        console.log('Gas used:', receipt.receipt.gasUsed);

        assert(isEventInLogs("minterAcceptanceEvent", receipt.receipt.logs));
    });

    // Check transfer limit
    it("Transfer limit changes", async() => {
        var contract = await ImprovedERC.deployed();

        var transfer_admin = sender;
        var not_transfer_admin_1 = accounts[4];
        var not_transfer_admin_2 = accounts[5];

        // Try to send more than the transferlimit

        try {
            var receipt = await contract.transfer(not_transfer_admin_1, W3.utils.toBN(500 * 10**decimals), {from: transfer_admin});
            console.log('Gas used:', receipt.receipt.gasUsed);
        }
        catch (error) {
            console.log("Tried to send over TRANSFERLIMIT! Success");
            const revertFound = error.message.search('revert') >= 0;
            // Reverted
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }


        // Try to make another user transfer admin
        var receipt = await contract.newRestrAdmin(not_transfer_admin_1, true, {from: transfer_admin});
        console.log('Gas used:', receipt.receipt.gasUsed);

        assert(isEventInLogs("restrAdminProposalEvent", receipt.receipt.logs));
        assert(isEventInLogs("restrAdminAdd", receipt.receipt.logs));

        var receipt = await contract.newRestrAdmin(not_transfer_admin_2, true, {from: transfer_admin});
        console.log('Gas used:', receipt.receipt.gasUsed);
        assert(isEventInLogs("restrAdminProposalEvent", receipt.receipt.logs));
        assert(!isEventInLogs("restrAdminAdd", receipt.receipt.logs)); // cant be accepted yet

        // get existing proposals
        var pendingRestrAdmins = await contract.getRestrProposals();

        // It will be important to later check if he voted already
        var receipt = await contract.voteForRestrAdmin(pendingRestrAdmins[0], {from: not_transfer_admin_1});
        console.log('Gas used:', receipt.receipt.gasUsed);

        assert(isEventInLogs("restrAdminAdd", receipt.receipt.logs));
    });

    it("Replay vote doesn't work", async() => {
        var contract = await ImprovedERC.deployed();
        var transfer_admin = sender;
        var not_transfer_admin = accounts[9];

        try {
            await contract.newRestrAdmin(not_transfer_admin, true, {from: transfer_admin});

            var pendingRestrAdmins = await contract.getRestrProposals();
            await contract.voteForRestrAdmin(pendingRestrAdmins[0], {from: transfer_admin});
            
        }
        catch (error) {
            console.log("Tried to replay voting for new Restr admin! Success");
            const revertFound = error.message.search('revert') >= 0;
            // Reverted
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }

    });
    
});


/// AUX Functions

function isEventInLogs(event, logs) {

    for (let i = 0; i < logs.length; i++) {
        if (logs[i].event !== undefined && logs[i].event == event) {
            return true;
        }
    }

    return false;
};


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
        assert( W3.utils.fromWei(totalSupply.toString()) == conf.INITIAL_SUPPLY)
        console.log("Total Supply is:", W3.utils.fromWei(totalSupply.toString()))

        // Mint more than the cap (2x+1 as much)
        try {
            const mintAmount = BigInt(((conf.INITIAL_SUPPLY / 2) + 1) * 10**decimals);
            var receipt = await contract.mint(sender, mintAmount, {from: sender});

            throw new Error("This should never happen");

        }
        catch (error) {
            console.log("Tried to go over the limit! Correctly caught!");
            const revertFound = error.message.search('revert') >= 0;
            // Reverted
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }

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
            var receipt = await contract.transfer(account, W3.utils.toBN(100 * 10**decimals), {from: sender});

            assert(isEventInLogs("Transfer", receipt.receipt.logs));

            const newBalanceInEth = await ethBalanceOf(contract, account);
            assert.equal(newBalanceInEth, 100);

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
        var newBalInEth = await ethBalanceOf(contract, minter);

        // Check admin can mint
        assert(parseInt(balInEth) + 1 == parseInt(newBalInEth));

        // Check other user cannot mint
        var balInEth = await ethBalanceOf(contract, not_minter);
        // Revert must happen
        try {
            var receipt = await contract.mint(minter, mint_amount, {from: not_minter});
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
        }
        catch (error) {

            console.log("Exceeded TMAX! Success");
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
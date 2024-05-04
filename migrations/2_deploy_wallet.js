/**
 * BDA Project 2 Deployment
 * Very much inspired by the DEMO exercise
 * Author: Vojtech Fiala
 */

var W3 = require('web3');
var ImprovedERC = artifacts.require("ImprovedERC");
var MintManager = artifacts.require("MintManager");
var TransferManager = artifacts.require("TransferManager");
var conf = require("../config/erc_config.js");

module.exports = function(deployer, network, accounts) {
    var owners = []


    if (network == "mainnet") {
        throw "Halt. Sanity check. Not ready for deployment to mainnet.";
    } else if (network == "sepolia" || network == "sepolia-fork") {
        owners.push("0xB5E59c1Aa9f67668bFE93cc29221414A526064F3")
        owners.push("0x3A9987e6fb8d08B56095BF267a9b39c2649d6F3f")
    } else { // development & test networks
    }

    console.log('Deploying MintManager to network', network);
    
    result = deployer.deploy(MintManager, conf.TMAX, conf.decimals ).then(() => {
        console.log('Deployed MintManager with address', MintManager.address);
        console.log("\t \\/== Default gas limit:", MintManager.class_defaults.gas);

        return deployer.deploy(TransferManager, conf.TRANSFERLIMIT).then(() => {
            console.log('Deployed TransferManager with address', TransferManager.address);
            console.log("\t \\/== Default gas limit:", ImprovedERC.class_defaults.gas);

            return deployer.deploy(ImprovedERC, "ImprovedERC", "IERC", conf.SUPPLY_CAP, conf.TMAX, conf.TRANSFERLIMIT).then(() => {
                console.log('Deployed ImprovedERC with address', ImprovedERC.address);
                console.log("\t \\/== Default gas limit:", ImprovedERC.class_defaults.gas);
            });
        });
    });
};

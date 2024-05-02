var W3 = require('web3');
var ImprovedERC = artifacts.require("ImprovedERC");
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

    console.log('Deploying ImprovedERC to network', network);
    
    result = deployer.deploy(ImprovedERC, "ImprovedERC", "IERC", conf.INITIAL_SUPPLY, conf.TMAX).then(() => {
        console.log('Deployed ImprovedERC with address', ImprovedERC.address);
        console.log("\t \\/== Default gas limit:", ImprovedERC.class_defaults.gas);
    });
};

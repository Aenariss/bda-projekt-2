/**
 * BDA Project 2 migration
 * Very much inspired by the DEMO exercise
 * Author: Vojtech Fiala
 */

const Migrations = artifacts.require("Migrations");

module.exports = function(deployer) {
    deployer.deploy(Migrations);
};

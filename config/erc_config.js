
var ImprovedERCConf = Object.freeze({
    SUPPLY_CAP: 5000, // Initial supply is this number multiplied by 10**18
    TMAX: 500, // Also multipled by 10**18
    decimals: 18, // Don;'t change this, matches ERC20
    TRANSFERLIMIT: 50 // How many tokens a user can sendd in one transaction
})

module.exports = ImprovedERCConf;
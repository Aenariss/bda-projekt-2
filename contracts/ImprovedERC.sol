// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


// https://dev.to/willkre/create-deploy-an-erc-20-token-in-15-minutes-truffle-openzeppelin-goerli-33lb
// https://www.openzeppelin.com/contracts
contract ImprovedERC is ERC20, AccessControl  {

    uint256 private _totalSupplyCap;
    uint256 private _TMAX; // limit how much a minter can mint per day
    bytes32 private constant _mintingAdmin = keccak256("mintingAdmin");

    mapping(address => uint256) private _mintedToday; // how much a minter has already minted today
    mapping(address => uint256) private _mintTime;
    
    constructor(string memory name, string memory symbol, uint256 totalSupply, uint256 TMAX_val) ERC20(name, symbol) {

        require(totalSupply > 0, "Initial supply has to be greater than 0");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(_mintingAdmin, msg.sender);

        _TMAX = TMAX_val * 10 ** decimals();
        _totalSupplyCap = totalSupply * 10 ** decimals(); // hard cap the number of tokens
        mint(msg.sender, _totalSupplyCap / 2); // give half the total amount to the account
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

    /* Modifier to check the minter has not exceeded his TMAX */
    modifier doesntExceedTmax(address account, uint256 value) {

        // The sender
        if (_mintedToday[msg.sender] + value > _TMAX) {
            revert("Exceeded daily minting limit");
        }
        _mintedToday[msg.sender] += value;
        _;
    }

    /* Get the total supply cap */
    function getTotalSupplyCap() public view returns (uint256 totalSupplyCap) {
        return _totalSupplyCap;
    }

    /* Get how much has minted minted today */
    function mintedToday(address user) public view returns (uint256) {
        return _mintedToday[user];
    }

    /* Get how much has minted minted today */
    function TMAX() public view returns (uint256) {
        return _TMAX;
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
        doesntExceedTmax(account, value)
    {   

        require(value > 0, "Can't mint zero");

        _mint(account, value);
    }

}

/**
 * Javascript part of the frontend
 * Author: Vojtech Fiala
 * I apologize in advance to anyone who has to read this code
 */

/* Some global variables */
var abiFile;
var contract;
var roles = [];
const ganacheProviderUrl = 'http://localhost:8545'; // Default ganache URL - change if neccessary
const web3 = new Web3(new Web3.providers.HttpProvider(ganacheProviderUrl));
const configFile = "./config/client_app_config.json";

/*********************
 * Utility functions *
 *                   * 
**********************/


/* Function to write out the result of the voting operration. Message disappears after N seconds */
function editForNSeconds(time, element_id, text, color="black") {

    const e = document.getElementById(element_id);
    e.style.color = color;
    e.innerHTML = text;

    function changeBack() {
        e.innerHTML = "";
        e.style.color = "black";
    }
    setTimeout(changeBack, time*1000); 
}

/* Function to pretty print a big number */
function formatBigNumber(number) {
    if (number < 0) {
        number = 0;
    }
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/format
    newWords = new Intl.NumberFormat("en-US").format(number);
    return newWords.replaceAll(',', ' ');
}

/* Function to return the deployed contract */
async function getContract() {
    const response = await fetch(abiFile);
    const json = await response.json();
    const contractABI = json.abi;
    const contractAddress = json.networks[Object.keys(json.networks)[Object.keys(json.networks).length - 1]].address;
    
    contract = new web3.eth.Contract(contractABI, contractAddress);
    return contract;
}

/**********************************
 * Functions to facilitate voting *
 *                                * 
**********************************/

/* Generic vote function which calls the given vote method, to be used in specific Votes */
async function genericVote(proposalId, resultElement, callback) {
    contract = await getContract();
    let sender = window.ethereum.selectedAddress;
    try {
        await callback(proposalId).send({ from: sender, gas: '6700000' });
        editForNSeconds(3, resultElement, "Successfully voted!", "green") // show the result
    }
    catch (error) {
        console.log(error)
        editForNSeconds(3, resultElement, "Couldn't vote! Voting again? Not an admin?", "red")
    }
}

/* Function to facilitate voting about TMAX Proposals */
async function voteProposalTMAX(proposalId, flag) {

    if (flag) {
        await genericVote(proposalId, "TmaxProposalResult", contract.methods.voteForTMAX);
    }
    else {
        await genericVote(proposalId, "TmaxProposalResult", contract.methods.voteMintIncrease);
    }

    lastTmaxBlock = 0;
    document.getElementById("TmaxProposalsList").innerHTML = "";  
    showProposals(0, "TmaxProposalsList", "<h2>TMAX pending proposals -- newest at the bottom (TMAX first, one-time overrides after):</h2>");
    await writeMintLimit();
}

/* Function to facilitate voting about Minter Proposals */
async function voteProposalMinter(proposalId) {
    await genericVote(proposalId, "MintProposalResult", contract.methods.voteForMinter);
    lastNewMinterBlock = 0;
    document.getElementById("newRestrAdminProposals").innerHTML = "";  
    document.getElementById("newMinterProposals").innerHTML = "";  
    showProposals(0, "newMinterProposals", "<h2>Proposals for new mintAdmins (newest at the bottom):</h2>");
    await writeAdmins();
    initialization();
}

/* Function to facilitate voting about RestrAdmin Proposals */
async function voteProposalRestrAdmin(proposalId) {
    await genericVote(proposalId, "RestrAdminProposalResult", contract.methods.voteForRestrAdmin);
    lastRestAdminBlock = 0;
    document.getElementById("newRestrAdminProposals").innerHTML = "";  
    document.getElementById("newMinterProposals").innerHTML = "";  
    showProposals(1, "newRestrAdminProposals", "<h2>Proposals for new restrAdmins (newest at the bottom):</h2>");
    await writeAdmins();
    initialization();
}

/* Function to facilitate voting about TRANSFERLIMIT Proposals */
async function voteProposalTransferLimit(proposalId) {
    await genericVote(proposalId, "changeTransferLimitResult", contract.methods.voteDailyLimit);
    lastTransferLimitChangeBlock = 0;
    document.getElementById("changeTransferLimitProposals").innerHTML = "";  
    showProposals(1, "changeTransferLimitProposals", "<h2>Proposals for TRANSFERLIMIT changes for individual users (newest at the bottom):</h2>");
    showTransferLimit();
}

/*********************************
 * Functions to submit proposals *
 *                               * 
**********************************/

/* Generic proposal handler that calls given callback */
async function genericHandler(event, resultElement, errorMsg, callback, correctMsg="Proposal submited! Wait a few seconds before it shows up") {
    event.preventDefault(); // doesnt work without this
    event.stopImmediatePropagation();
    contract = await getContract();
    let sender = window.ethereum.selectedAddress;

    try {
        await callback.send({ from: sender, gas: '6700000'  });
        editForNSeconds(3, resultElement, correctMsg, "green")
    }
    catch (error) {
        console.error(error)
        editForNSeconds(3, resultElement, errorMsg, "red")
    } 
}

/* Handler for TRANSFERLIMIT proposals */
async function handleTransferLimitProposal(event) {
    let user = document.getElementById("TransferLimitAddress").value;
    let limit = document.getElementById("TransferLimitAmount").value;
    await contract.methods.changeDailyLimit(user, limit); // I did this and it seems to fix the doubling

    await genericHandler(event, "changeTransferLimitResult", "Couldn't propose! Are you an admin?! Chceck console for details", contract.methods.changeDailyLimit(user, limit));
    lastTransferLimitChangeBlock = 0;
    document.getElementById("changeTransferLimitProposals").innerHTML = ""; 
    showProposals(1, "changeTransferLimitProposals", "<h2>Proposals for TRANSFERLIMIT changes for individual users (newest at the bottom):</h2>");
    showTransferLimit();
}

/* Handler for RestrAdmin proposals */
async function handleRestrAdminProposal(event) {
    let newMinter = document.getElementById("RestrAdminAddress").value;
    let flag = document.getElementById("RestrAdminFlag").value == '0' ? false : true;
    await contract.methods.newRestrAdmin(newMinter, flag); // I did this and it seems to fix the doubling

    await genericHandler(event, "RestrAdminProposalResult", "Couldn't propose! Are you an admin?! Check console for details", contract.methods.newRestrAdmin(newMinter, flag));
    lastRestAdminBlock = 0;
    document.getElementById("newRestrAdminProposals").innerHTML = "";  
    document.getElementById("newMinterProposals").innerHTML = "";  
    showProposals(1, "newRestrAdminProposals", "<h2>Proposals for new restrAdmins (newest at the bottom):</h2>");
    await writeAdmins();
    initialization();
}

/* Handler for TMAX proposals */
async function handleTMAXProposal(event) {
    let value = document.getElementById("TmaxProposalValue").value;
    await contract.methods.newTMAXProposal(value); // I did this and it seems to fix the doubling

    await genericHandler(event, "TmaxProposalResult", "Couldn't propose! Are you an admin?! Check console for details", contract.methods.newTMAXProposal(value));
    lastTmaxBlock = 0;
    document.getElementById("TmaxProposalsList").innerHTML = "";  
    showProposals(0, "TmaxProposalsList", "<h2>TMAX pending proposals -- newest at the bottom (TMAX first, one-time overrides after):</h2>");
    await writeMintLimit();
}

/* Handler for mintAdmin proposals */
async function handleMinterProposal(event) {
    let newMinter = document.getElementById("MinterAddress").value;
    let flag = document.getElementById("newMinterFlag").value == '0' ? false : true;
    await contract.methods.newMinterProposal(newMinter, flag); // I did this and it seems to fix the doubling

    await genericHandler(event, "MintProposalResult", "Couldn't propose! Are you an admin?! Check console for details", contract.methods.newMinterProposal(newMinter, flag));
    lastNewMinterBlock = 0;
    document.getElementById("newRestrAdminProposals").innerHTML = "";  
    document.getElementById("newMinterProposals").innerHTML = "";  
    showProposals(0, "newMinterProposals", "<h2>Proposals for new mintAdmins (newest at the bottom):</h2>");
    await writeAdmins();
    initialization();
}

/* Handler for send call */
async function handleSend(event) {
    let to = document.getElementById("addressToSend").value;
    let value = document.getElementById("amountToSend").value;
    await contract.methods.transfer(to, value); // I did this and it seems to fix the doubling

    await genericHandler(event, "sendResult", "Couldn't send! Check address, your transfer limit and your funds", contract.methods.transfer(to, value), "Successfully sent!");
    await getUserBalance();
    await showTransferLimit();
}

/* Handler for mint calls (or proposals if over the limit) */
async function handleMint(event) {
    let to = document.getElementById("addressToMint").value;
    let value = document.getElementById("amountToMint").value;
    await contract.methods.mint(to, value); // I did this and it seems to fix the doubling

    await genericHandler(event, "sendResult", "Couldn't mint! Check address or mint limit", contract.methods.mint(to, value), "Successfully minted!");
    await getUserBalance();
    await writeMintLimit();
}

/**********************************
 * Functions to write information *
 *                                * 
***********************************/

/* Function to write user's roles at the beggining of the page */
function writeRoles() {
    let rolesToWrite = "user";
    if (roles[0]) {
        if (rolesToWrite === "user")
            rolesToWrite = "";
        rolesToWrite += "mintAdmin";
    }
    if (roles[1]) {
        if (rolesToWrite === "user") {
            rolesToWrite = "";
            rolesToWrite += "restrAdmin";
        }
        else {
            rolesToWrite += ", restrAdmin";
        }
    }
    document.getElementById("userRoles").innerHTML = rolesToWrite;
}

/* Function to write both mint and restrAdmins (their addresses) */
async function writeAdmins() {
    contract = await getContract();

    let mintAdmins = await contract.methods.getMintAdmins().call();
    let restrAdmins = await contract.methods.getRestrAdmins().call();
    
    function writeMintAdmins() {
        const mintAdminsUl = document.getElementById("mintAdminAddresses");
        mintAdminsUl.innerHTML = "";

        for (let admin of mintAdmins) {
            let li = document.createElement("li");
            li.appendChild(document.createTextNode(admin));
            mintAdminsUl.appendChild(li);
        }
    }
    function writeRestrAdmins() {
        const restrAdminsUl = document.getElementById("restrAdminAddresses");
        restrAdminsUl.innerHTML = "";

        for (let admin of restrAdmins) {
            let li = document.createElement("li");
            li.appendChild(document.createTextNode(admin));
            restrAdminsUl.appendChild(li);
        }
    }
    writeMintAdmins();
    writeRestrAdmins();
}

/* Function to write logged user's token balance */
async function getUserBalance() {
    let sender = window.ethereum.selectedAddress;
    let tmp = await contract.methods.balanceOf(sender).call();
    var userFunds = formatBigNumber(tmp);
    document.getElementById("userFunds").innerHTML = userFunds;
}

/* Function to show the TRANSFERLIMIT for logged in user */
async function showTransferLimit() {
    let contract = await getContract();
    let sender = window.ethereum.selectedAddress;
    let already_transferd =  await contract.methods.sentToday(sender).call();

    let max_transfer = await contract.methods.TRANSFERLIMIT(sender).call();

    let can_send_today = BigNumber(max_transfer).minus(already_transferd)

    let tLimit = document.getElementById("userTransferLimit");
    tLimit.innerHTML = formatBigNumber(can_send_today);

    let tToday = document.getElementById("userSentToday");
    tToday.innerHTML = formatBigNumber(already_transferd);
}

/* Function to show TMAX and minted today. Also show tokens minted today */
async function writeMintLimit() {
    if (roles[0] == true) {// is mintAdmin
        let contract = await getContract();
        let sender = window.ethereum.selectedAddress;
        let mint_limit = await contract.methods.TMAX().call();
        let minted_today = await contract.methods.mintedToday(sender).call()

        let can_mint_today = BigNumber(mint_limit).minus(minted_today)
        const p = document.getElementById("mintLimit").innerHTML = "Can mint today until TMAX: <b>" + formatBigNumber(can_mint_today) + "</b> tokens <br>\
                                                                    TMAX itself is: <b>"  + formatBigNumber(mint_limit) + "</b> tokens <br>" +
                                                                    "Minted today: <b>" + formatBigNumber(minted_today) + "</b> tokens";
    }
}

/***************************
 * Functions to make forms *
 *                         * 
****************************/

/* Function to show form for minting tokens */
async function showMintForm() {
    if (roles[0] == true) {
        const e = document.getElementById("mintForm");
        e.innerHTML = "\
                        <h2>Mint tokens</h2>\
                        <form onSubmit='handleMint(event)'>\
                            <label for='addressToMint'>Address where to mint (must be valid):</label><br>\
                            <input type='text' id='addressToMint' name='addressToMint'><br>\
                            <label for='amountToMint'>Mint Amount:</label><br>\
                            <input type='text' id='amountToMint' name='amountToMint'>\
                            <input type='submit' value='Mint'>\
                        </form>\
                        ";                               
    }
    else {
        const e = document.getElementById("mintForm");
        e.innerHTML = ""
    }
}

/* Function to show form for proposing new tmax */
async function showTmaxProposalForm() {
    if (roles[0] == true) {
        const e = document.getElementById("TmaxProposalForm");
        e.innerHTML = "\
                        <h2>TMAX change Proposal form:</h2>\
                        <form onSubmit='handleTMAXProposal(event)'>\
                            <label for='TmaxProposalValue'>New TMAX value:</label><br>\
                            <input type='text' id='TmaxProposalValue' name='TmaxProposalValue'><br>\
                            <input type='submit' value='Propose'>\
                        </form>\
                        ";                      
    }
    else {
        const e = document.getElementById("TmaxProposalForm");
        e.innerHTML = ""
    }
}

/* Function to show form for proposing new mintAdmins */
async function showMinterProposalForm() {
    if (roles[0] == true) {
        const e = document.getElementById("newMinterForm");
        e.innerHTML = "\
                        <h2>Add/Remove mintAdmin:</h2>\
                        <form onSubmit='handleMinterProposal(event)'>\
                            <label for='MinterAddress'>User to change:</label><br>\
                            <input type='text' id='MinterAddress' name='MinterAddress'><br>\
                            <label for='newMinterFlag'>Change details:</label><br>\
                            <select name='newMinterFlag' id='newMinterFlag'>\
                            <option value='1'>Add as a new minter</option>\
                            <option value='0'>Remove from minters</option>\
                            </select>\
                            <input type='submit' value='Propose'>\
                        </form>\
                        ";                      
    }
    else {
        const e = document.getElementById("newMinterForm");
        e.innerHTML = ""
    }
}

/* Function to show form for proposing new restrAdmins */
async function showRestrAdminProposalForm() {
    if (roles[1] == true) {
        const e = document.getElementById("newRestrAdminForm");
        e.innerHTML = "\
                        <h2>Add/Remove restrAdmin:</h2>\
                        <form onSubmit='handleRestrAdminProposal(event)'>\
                            <label for='RestrAdminAddress'>User to change:</label><br>\
                            <input type='text' id='RestrAdminAddress' name='RestrAdminAddress'><br>\
                            <label for='RestrAdminFlag'>Change details:</label><br>\
                            <select name='RestrAdminFlag' id='RestrAdminFlag'>\
                            <option value='1'>Add as a restr admin</option>\
                            <option value='0'>Remove from restr admins</option>\
                            </select>\
                            <input type='submit' value='Propose'>\
                        </form>\
                        ";                      
    }
    else {
        const e = document.getElementById("newRestrAdminForm");
        e.innerHTML = ""
    }
}

/* Function to show form for changing the TRANSFERLIMIT */
async function showTransferLimitProposalForm() {
    if (roles[1] == true) {
        const e = document.getElementById("changeTransferLimitForm");
        e.innerHTML = "\
                        <h2>Change TRANSFERLIMIT of user:</h2>\
                        <form onSubmit='handleTransferLimitProposal(event)'>\
                            <label for='TransferLimitAddress'>User to change:</label><br>\
                            <input type='text' id='TransferLimitAddress' name='TransferLimitAddress'><br>\
                            <label for='TransferLimitAmount'>New Limit:</label><br>\
                            <input type='text' id='TransferLimitAmount' name='TransferLimitAmount'><br>\
                            <input type='submit' value='Propose'>\
                        </form>\
                        ";                      
    }
    else {
        const e = document.getElementById("changeTransferLimitForm");
        e.innerHTML = ""
    }
}

/*******************************
 * Functions to show proposals *
 *                             * 
*******************************/

/* Generic function to write out proposals */
function showProposals(role_index, elementId, headerString) {
    if (roles[role_index] == true) {
        const e = document.getElementById(elementId);
        e.innerHTML = headerString
    }
    else {
        const e = document.getElementById(elementId);
        e.innerHTML = ""
    }
}

/* Function to write proposals for changing TMAX and one-time mint limit */
async function showTmaxProposal(proposal, flag) {
    let newTmaxVal;
    proposedBy = proposal.returnValues.proposedBy;

    let id = '';

    if (flag) {
        id = proposal.returnValues.TMAXProposalCounter;
        newTmaxVal = proposal.returnValues.newTMAX;
    }
    else {
        id = proposal.returnValues.mintProposalCounter;
        newTmaxVal = proposal.returnValues.toMint;
    }

    let sender = window.ethereum.selectedAddress;

    let link = ''
    if (proposedBy.toLowerCase() != sender.toLowerCase()) {
        link = `<a href="#" onclick='voteProposalTMAX("${id}", "${flag}")'>Vote for this</a>`;
    }

    tmp_name = '';
    if (flag) {
        tmp_name = "Permanent TMAX Change Proposal! ";
    }
    else {
        tmp_name = "One-time TMAX bypass! ";
    }

    htmlString = "<ul> " + tmp_name + link +
                    "<li>Proposed By: " + proposedBy +
                    "</li>"

    if (flag) {
        htmlString += "<li>Proposed new TMAX: " + newTmaxVal + "</li>";
    }
    else {
        htmlString += "<li>Proposed amount: " + newTmaxVal + "</li>";
        htmlString += "<li>MintReceiver: " + proposal.returnValues.mintReceive + "</li>";
    }

    htmlString += "</ul>"
    const e = document.getElementById("TmaxProposalsList").innerHTML += htmlString;

}

/* Function to show proposals about adding/removing mintAdmins */
async function showMinterProposal(proposal) {
    newMinter = proposal.returnValues.newMinter;
    proposedBy = proposal.returnValues.proposedBy;
    minterProposalCounter = proposal.returnValues.minterProposalCounter;
    let sender = window.ethereum.selectedAddress;


    let flag = proposal.returnValues.flag == false ? "Remove the member " : "Accept the member "
    flag += "event"

    let link = ''
    if (proposedBy.toLowerCase() != sender.toLowerCase()) {
        link = `<a href="#" onclick='voteProposalMinter("${minterProposalCounter}")'>Vote for this</a>`;
    }

    htmlString = "<ul> " + flag + link +
                    "<li>Proposed By: " + proposedBy +
                    "</li>\
                    <li>User to change: " + newMinter +
                    "</li>\
                </ul>"
    const e = document.getElementById("newMinterProposals").innerHTML += htmlString;

}

/* Function to show proposals for adding/removing restrADmins */
async function showRestrAdminProposal(proposal) {
    userToChange = proposal.returnValues.userToChange;
    proposedBy = proposal.returnValues.proposedBy;
    proposalCounter = proposal.returnValues.proposalCounter;
    let sender = window.ethereum.selectedAddress;

    let flag = proposal.returnValues.flag == false ? "Remove the member " : "Accept the member "
    flag += "event"

    let link = ''
    if (proposedBy.toLowerCase() != sender.toLowerCase()) {
        link = `<a href="#" onclick='voteProposalRestrAdmin("${proposalCounter}")'>Vote for this</a>`;
    }

    htmlString = "<ul> " + flag + link +
                    "<li>Proposed By: " + proposedBy +
                    "</li>\
                    <li>User to change: " + userToChange +
                    "</li>\
                </ul>"
    const e = document.getElementById("newRestrAdminProposals").innerHTML += htmlString;

}

/* Function to show proposals for change of TransferLimit */
async function showTransferLimitProposal(proposal) {
    userToChange = proposal.returnValues.userToChange;
    proposedBy = proposal.returnValues.proposedBy;
    proposalCounter = proposal.returnValues.proposalCounter;
    newLimit = proposal.returnValues.newLimit;
    let sender = window.ethereum.selectedAddress;

    let link = ''
    if (proposedBy.toLowerCase() != sender.toLowerCase()) {
        link = `<a href="#" onclick='voteProposalTransferLimit("${proposalCounter}")'>Vote for this</a>`;
    }

    htmlString = "<ul> " + "Change TRANSFERLIMIT of user proposal " + link +
                    "<li>Proposed By: " + proposedBy +
                    "</li>\
                    <li>User to change: " + userToChange +
                    "</li>\
                    <li>New Limit: " + newLimit +
                    "</li>\
                </ul>"
    const e = document.getElementById("changeTransferLimitProposals").innerHTML += htmlString;

}

/*******************
 * Other functions *
 *                 * 
*******************/

/* Initialization function */
var initialization = async () => {
    const response = await fetch(configFile);
    const config = await response.json();
    if (window.ethereum) {
        const ethereum = window.ethereum;

        const accounts = await ethereum.request({ method: 'eth_accounts' });
        const selectedAddress = ethereum.selectedAddress;
        if (!selectedAddress) {
            await ethereum.enable();
        }
        abiFile = config.abiFilePath;
        
        contract = await getContract()
        roles = await contract.methods.getRolesOfUser(selectedAddress).call();

        if (roles.length != 2) {
            console.error("Couldn't load roles!");
        }
        else {
            writeRoles(roles);
        }

        // show data based on user's roles
        await getUserBalance();
        await writeAdmins();
        await showTransferLimit();
        await writeMintLimit();

        showMintForm();
        showTmaxProposalForm();
        showMinterProposalForm();
        showRestrAdminProposalForm();
        showTransferLimitProposalForm();
        

        showProposals(0, "TmaxProposalsList", "<h2>TMAX pending proposals -- newest at the bottom (TMAX first, one-time overrides after):</h2>");
        showProposals(0, "newMinterProposals", "<h2>Proposals for new mintAdmins (newest at the bottom):</h2>");
        showProposals(1, "newRestrAdminProposals", "<h2>Proposals for new restrAdmins (newest at the bottom):</h2>");
        showProposals(1, "changeTransferLimitProposals", "<h2>Proposals for TRANSFERLIMIT changes for individual users (newest at the bottom):</h2>");

    }
    else {
        // MetaMask is not installed
        console.error("Couldn't acess metamask wallet");
    }
}

/* Generic listener to listen to given event emission */
async function genericProposalListener(eventName, lastBlock, role_index, callback) {
    if (roles.length == 2) {
        if (roles[role_index] == true) {
            const newestBlock = await web3.eth.getBlockNumber();
            
            if (newestBlock > lastBlock) {
                let events = await contract.getPastEvents(eventName, {
                    fromBlock: lastBlock,
                    toBlock: newestBlock
                });

                // Process events
                events.forEach(event => {
                    callback(event);
                });
            }
            lastBlock = newestBlock;
        }
    }
    setTimeout(genericProposalListener, 3000, eventName, lastBlock, role_index, callback);
}

var lastTmaxBlock = 0;
var lastMintOverrideBlock = 0;
var lastNewMinterBlock = 0;
var lastRestAdminBlock = 0;
var lastTransferLimitChangeBlock = 0;

initialization();

setTimeout(genericProposalListener, 3000, "TMAXProposalEvent", lastTmaxBlock, 0, showTmaxProposal);
setTimeout(genericProposalListener, 3000, "mintLimitOverrideProposal", lastMintOverrideBlock, 0, showTmaxProposal);
setTimeout(genericProposalListener, 3000, "restrAdminProposalEvent", lastRestAdminBlock, 1, showRestrAdminProposal);
setTimeout(genericProposalListener, 3000, "limitChangeProposal", lastTransferLimitChangeBlock, 1, showTransferLimitProposal);
setTimeout(genericProposalListener, 3000, "minterProposalEvent", lastNewMinterBlock, 0, showMinterProposal);

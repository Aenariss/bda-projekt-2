var abiFile;
var contract;
var address;
var roles = [];
const ganacheProviderUrl = 'http://localhost:8545'; // Default Ganache URL
const web3 = new Web3(new Web3.providers.HttpProvider(ganacheProviderUrl));
const configFile = "./config/client_app_config.json";


function editForNSeconds(time, element_id, text, color="black") {

    const e = document.getElementById(element_id);
    let formerText = e.innerHTML;
    let formerColor = e.style.color;
    e.style.color = color;
    e.innerHTML = text;

    function changeBack() {
        e.innerHTML = formerText;
        e.style.color = formerColor;
    }

    setTimeout(changeBack, time*1000); 
}


async function handleSend(event) {

    event.preventDefault(); // doesnt work without this
    contract = await getContract();

    let to = document.getElementById("addressToSend").value;
    let value = document.getElementById("amountToSend").value;
    let sender = window.ethereum.selectedAddress;

    try {
        let receipt = await contract.methods.transfer(to, value).send({ from: sender, gas: '6700000' });

        editForNSeconds(3, "sendResult", "Successfully sent!", "green")
    }
    catch (error) {
        console.log(error)
        editForNSeconds(3, "sendResult", "Couldn't send! Check address, your transfer limit and your funds!", "red")
    }
    await getUserBalance();
    await showTransferLimit();
}

async function handleMint(event) {

    event.preventDefault(); // doesnt work without this
    contract = await getContract();

    let to = document.getElementById("addressToMint").value;
    let value = document.getElementById("amountToMint").value;
    let sender = window.ethereum.selectedAddress;

    try {
        let receipt = await contract.methods.mint(to, value).send({ from: sender, gas: '6700000' });

        editForNSeconds(3, "sendResult", "Successfully minted!", "green")
    }
    catch (error) {
        console.log(error)
        editForNSeconds(3, "sendResult", "Couldn't mint! Check address or mint limit!", "red")
    }
    await getUserBalance();
    await writeMintLimit();
}

async function getRoles() {
    contract = await getContract();

    let sender = window.ethereum.selectedAddress;
    roles = await contract.methods.getRolesOfUser(sender).call();

    return roles;
}

function formatBigNumber(number) {
    if (number < 0) {
        number = 0;
    }
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/format
    newWords = new Intl.NumberFormat("en-US").format(number);
    return newWords.replaceAll(',', ' ');
}

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

async function getUserBalance() {
    let tmp = await contract.methods.balanceOf(address).call();
    var userFunds = formatBigNumber(tmp);
    document.getElementById("userFunds").innerHTML = userFunds;
}

async function loadConfig() {
    const response = await fetch(configFile);
    const json = await response.json();

    return json;
}

async function getContract() {
    const response = await fetch(abiFile);
    const json = await response.json();
    const contractABI = json.abi;
    const contractAddress = json.networks[Object.keys(json.networks)[Object.keys(json.networks).length - 1]].address;
    
    contract = new web3.eth.Contract(contractABI, contractAddress);
    return contract;
}

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

async function writeMintLimit() {
    if (roles[0] == true) {// is mintAdmin
        let contract = await getContract();
        let sender = window.ethereum.selectedAddress;
        let mint_limit = await contract.methods.TMAX().call();
        let minted_today = await contract.methods.mintedToday(sender).call()

        let can_mint_today = BigNumber(mint_limit).minus(minted_today)
        const p = document.getElementById("mintLimit").innerHTML = "You can mint <b>" + formatBigNumber(can_mint_today) + "</b> more tokens today! You already minted <b>" + formatBigNumber(minted_today) + "</b> today!";
    }
}

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
}

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
}

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
}

function showTmaxProposals() {
    if (roles[0] == true) {
        const e = document.getElementById("TmaxProposalsList");
        e.innerHTML = "<h2>TMAX pending proposals (newest at the bottom):</h2>"
    }
}

function showMinterProposals() {
    if (roles[0] == true) {
        const e = document.getElementById("newMinterProposals");
        e.innerHTML = "<h2>Proposals for new mintAdmins (newest at the bottom):</h2>"
    }
}

async function showTmaxProposal(proposal, flag) {
    newTmaxVal = proposal.returnValues.newTMAX;
    proposedBy = proposal.returnValues.proposedBy;

    let id = '';

    try {
        id = proposal.returnValues.TMAXProposalCounter;
    }
    catch (error) {
        id = proposal.returnValues.mintProposalCounter;
    }

    let sender = window.ethereum.selectedAddress;

    let link = ''
    if (proposedBy.toLowerCase() != sender.toLowerCase()) {
        link = `<a href="#" onclick='voteProposalTMAX("${id}")'>Vote for this</a>`;
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
                    "</li>\
                    <li>Proposed new TMAX: " + newTmaxVal +
                    "</li>\
                </ul>"
    const e = document.getElementById("TmaxProposalsList").innerHTML += htmlString;

}

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

let main = async () => {
    var config = await loadConfig();
    if (window.ethereum) {
        const ethereum = window.ethereum;

        const accounts = await ethereum.request({ method: 'eth_accounts' });
        const selectedAddress = ethereum.selectedAddress;
        if (!selectedAddress) {
            await ethereum.enable();
        }
        address = selectedAddress;

        abiFile = config.abiFilePath;
        
        contract = await getContract()

        await getUserBalance();

        roles = await getRoles();

        if (roles.length != 2) {
            console.error("Couldn't load roles!");
        }
        else {
            writeRoles(roles);
        }

        await writeAdmins();
        await showTransferLimit();
        await writeMintLimit();
        await showMintForm();
        await showTmaxProposalForm();
        showTmaxProposals();
        showMinterProposals();
        showMinterProposalForm();

    }
    else {
        // MetaMask is not installed
        console.error("Couldn't acess metamask wallet");
    }
}

// Process past events and check for new ones
var lastTmaxBlock = 0;
async function listenForTMAXProposals() {
    if (roles.length == 2) {
        if (roles[0] == true) {
            const newestBlock = await web3.eth.getBlockNumber();
            
            if (newestBlock > lastTmaxBlock) {
                let events = await contract.getPastEvents('TMAXProposalEvent', {
                    fromBlock: lastTmaxBlock,
                    toBlock: newestBlock
                });

                // Process events
                events.forEach(event => {
                    showTmaxProposal(event, true);
                });

                events = await contract.getPastEvents('mintLimitOverrideProposal', {
                    fromBlock: lastTmaxBlock,
                    toBlock: newestBlock
                });

                // Process events
                events.forEach(event => {
                    showTmaxProposal(event, false);
                });
            }
            lastTmaxBlock = newestBlock;
        }
    }
}

// Process past events and check for new ones
var lastNewMinterBlock = 0;
async function listenForMintAdminProposals() {
    if (roles.length == 2) {
        if (roles[0] == true) {
            const newestBlock = await web3.eth.getBlockNumber();
            
            if (newestBlock > lastNewMinterBlock) {
                let events = await contract.getPastEvents('minterProposalEvent', {
                    fromBlock: lastNewMinterBlock,
                    toBlock: newestBlock
                });

                // Process events
                events.forEach(event => {
                    showMinterProposal(event);
                });
            }
            lastNewMinterBlock = newestBlock;
        }
    }
}

main();

setInterval(listenForTMAXProposals, 3000);
setInterval(listenForMintAdminProposals, 3000);

// restrAdmini stejne jako mintAdmini
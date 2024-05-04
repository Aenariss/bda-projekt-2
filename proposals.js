/**
 * BDA Project 2
 *  Author: Vojtech Fiala
 * A file with handlers for proposals and vote callbacks
 */

async function voteProposalTMAX(proposalId) {
    contract = await getContract();

    let sender = window.ethereum.selectedAddress;

    try {
        await contract.methods.voteForTMAX(proposalId).send({ from: sender, gas: '6700000' });

        editForNSeconds(3, "TmaxProposalResult", "Successfully voted!", "green")
    }
    catch (error) {
        console.log(error)
        editForNSeconds(3, "TmaxProposalResult", "Couldn't vote! Voting again? Not an admin?!", "red")
    }
    lastTmaxBlock = 0;
    document.getElementById("TmaxProposalsList").innerHTML = "";  
    showTmaxProposals();
    await writeMintLimit();
}

async function voteProposalMinter(proposalId) {
    contract = await getContract();

    let sender = window.ethereum.selectedAddress;

    try {
        await contract.methods.voteForMinter(proposalId).send({ from: sender, gas: '6700000' });

        editForNSeconds(3, "MintProposalResult", "Successfully voted!", "green")
    }
    catch (error) {
        console.log(error)
        editForNSeconds(3, "MintProposalResult", "Couldn't vote! Voting again? Not an admin?!", "red")
    }
    lastNewMinterBlock = 0;
    document.getElementById("newMinterProposals").innerHTML = "";  
    showMinterProposals();
    await writeAdmins();
}

async function handleTMAXProposal(event) {
    event.preventDefault(); // doesnt work without this
    contract = await getContract();
    let sender = window.ethereum.selectedAddress;

    let value = document.getElementById("TmaxProposalValue").value;
    
    try {
        await contract.methods.newTMAXProposal(value).send({ from: sender, gas: '6700000'  });

        editForNSeconds(3, "TmaxProposalResult", "Successfully proposed! Wait for a few seconds before it appears!", "green")
    }
    catch (error) {
        console.log(error)
        editForNSeconds(3, "TmaxProposalResult", "Couldn't propose! Are you an admin?!", "red")
    }
    // Remove all shjown proposals and wait until they show again
    lastTmaxBlock = 0;
    document.getElementById("TmaxProposalsList").innerHTML = "";  
    showTmaxProposals();
    await writeMintLimit();
}

async function handleMinterProposal(event) {
    event.preventDefault(); // doesnt work without this
    contract = await getContract();
    let sender = window.ethereum.selectedAddress;

    let newMinter = document.getElementById("MinterAddress").value;
    let flag = document.getElementById("newMinterFlag").value == '0' ? false : true;
    
    try {
        await contract.methods.newMinterProposal(newMinter, flag).send({ from: sender, gas: '6700000'  });

        editForNSeconds(3, "MintProposalResult", "Successfully proposed! Wait for a few seconds before it appears!", "green")
    }
    catch (error) {
        console.log(error)
        editForNSeconds(3, "MintProposalResult", "Couldn't propose! Are you an admin?! Maybe the user already is/isn't an admin", "red")
    } 
    // Remove all shjown proposals and wait until they show again
    lastNewMinterBlock = 0;
    document.getElementById("newMinterProposals").innerHTML = "";  
    showMinterProposals();
    await writeAdmins();
}

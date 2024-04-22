const ABI = [
    {
        inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
        name: "bridge",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "calculateFee",
        outputs: [{ internalType: "uint256", name: "feeAmount", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
];

import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

const claimButtonEl = document.querySelector(".claim-button");
const rewardAmountEl = document.querySelector(".reward-amount");
const vestingCalendarEl = document.querySelector(".content");
const select = document.querySelector("#bridgeType");

const inputBsc = document.querySelector("#inpBsc");
const inputEth = document.querySelector("#inpEth");

const feeEl = document.querySelector("#gasFee");

const bscTokenAddress = "0x0838A3E9512b18Ee66916064574a75D6ae1F2ddd";
const ethTokenAddress = "0x46857BCA993e5D70D2842c29427D6352165f9A4F";
const bscBridgeAddress = "0x4Bb50669e1C2d7fdf23590DF6CA2eCca1cC707Fc";
const ethBridgeAddress = "0xD2b6Ad52A74eBb0590db43ADb3C152d2c927c09b";

const tokenDecimals = 6;
// const targetBSCChainId = 56;
// const targetEthChainId = 1;

const targetBSCChainId = 97;
const targetEthChainId = 11155111;

let signer, ethTokenContract, bscTokenContract, ethBridgeContract, bscBridgeContract, walletConnected, userAddress;

async function calculateFee() {
    let fee;
    if (select.value === "BSCtoETH") {
        fee = await bscBridgeContract.calculateFee();
    } else {
        fee = await ethBridgeContract.calculateFee();
    }
    return Number(fee) / 100;
}

async function connectWallet() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    let chainId = targetBSCChainId;
    if (select.value === "BSCtoETH") {
        chainId = targetBSCChainId;
    } else {
        chainId = targetEthChainId;
    }
    await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + chainId.toString(16) }],
    });
    claimButtonEl.innerHTML = "Bridge";
    walletConnected = true;
    userAddress = signer.address;
    ethTokenContract = new ethers.Contract(ethTokenAddress, ABI, signer);
    bscTokenContract = new ethers.Contract(bscTokenAddress, ABI, signer);
    ethBridgeContract = new ethers.Contract(ethBridgeAddress, ABI, signer);
    bscBridgeContract = new ethers.Contract(bscBridgeAddress, ABI, signer);
    const fee = await calculateFee();
    feeEl.innerHTML = fee;
    inputBsc.disabled = false;
    inputEth.disabled = false;
    await recalculateAmountBsc({ target: inputBsc });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = async () => {
            clearTimeout(timeout);
            await func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function onClaimBtnClick() {
    if (!walletConnected) {
        await connectWallet();
        return;
    }
    await connectWallet();

    if (select.value === "BSCtoETH") {
        await recalculateAmountBsc({ target: inputBsc });
        const tokenAmount = ethers.parseUnits(inputBsc.value, tokenDecimals);
        if (+inputEth.value <= 0) {
            return alert("Amount must be greater than 0");
        }
        const approveTx = await bscTokenContract.approve(bscBridgeAddress, tokenAmount);
        await approveTx.wait();
        const bridgeTx = await bscBridgeContract.bridge(tokenAmount);
        await bridgeTx.wait();
    } else {
        await recalculateAmountEth({ target: inputEth });
        const tokenAmount = ethers.parseUnits(inputEth.value, tokenDecimals);
        if (+inputBsc.value <= 0) {
            return alert("Amount must be greater than 0");
        }
        const approveTx = await ethTokenContract.approve(ethBridgeAddress, tokenAmount);
        await approveTx.wait();
        const bridgeTx = await ethBridgeContract.bridge(tokenAmount);
        await bridgeTx.wait();
    }
}

claimButtonEl.addEventListener("click", onClaimBtnClick);

async function recalculateAmountBsc({ target: { value } }) {
    const fee = await calculateFee();

    if (+value === 0) {
        return;
    }

    if (select.value === "BSCtoETH") {
        value = +value - fee;
    } else {
        value = +value + fee;
    }

    inputEth.value = value > 0 ? value : 0;
}
async function recalculateAmountEth({ target: { value } }) {
    const fee = await calculateFee();

    if (+value === 0) {
        return;
    }

    if (select.value === "BSCtoETH") {
        value = +value + fee;
    } else {
        value = +value - fee;
    }

    inputBsc.value = value > 0 ? value : 0;
}

inputBsc.addEventListener("input", debounce(recalculateAmountBsc, 500));
inputEth.addEventListener("input", debounce(recalculateAmountEth, 500));

select.addEventListener("change", async () => {
    await connectWallet();
});

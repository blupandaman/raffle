import fs from "fs";
import { ethers, network } from "hardhat";

const FRONTEND_ADDRESSES_FILE = "..//raffle-frontend/src/constants/contractAddresses.json";
const FRONTEND_ABI_FILE = "../raffle-frontend/src/constants/abi.json";

const updateFrontend = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating frontend...");
        updateContractAddress();
        updateAbi();
    }
};

const updateContractAddress = async () => {
    const raffle = ethers.getContract("Raffle");
    const chainId = network!.config!.chainId!.toString();
    const currentAddresses = JSON.parse(fs.readFileSync(FRONTEND_ADDRESSES_FILE, "utf8"));
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes((await raffle).address)) {
            currentAddresses[chainId].push((await raffle).address);
        }
    } else {
        currentAddresses[chainId] = [(await raffle).address];
    }
    fs.writeFileSync(FRONTEND_ADDRESSES_FILE, JSON.stringify(currentAddresses));
};

const updateAbi = async () => {
    const raffle = ethers.getContract("Raffle");
    fs.writeFileSync(
        FRONTEND_ABI_FILE,
        (await raffle).interface.format(ethers.utils.FormatTypes.json) as string
    );
};

export default updateFrontend;
updateFrontend.tags = ["all", "frontend"];

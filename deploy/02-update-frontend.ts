import fs from "fs";
import { ethers, network } from "hardhat";

const FRONTEND_ADDRESSES_FILE = "..//raffle-frontend/src/constants/contractAddresses.json";
const FRONTEND_ABI_FILE = "../raffle-frontend/src/constants/abi.json";

const updateFrontend = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating frontend...");
        await updateContractAddress();
        await updateAbi();
    }
};

const updateContractAddress = async () => {
    const raffle = await ethers.getContract("Raffle");
    const chainId = network.config.chainId!.toString();
    const currentAddresses = await JSON.parse(fs.readFileSync(FRONTEND_ADDRESSES_FILE, "utf8"));
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(raffle.address)) {
            await currentAddresses[chainId].push(raffle.address);
        }
    } else {
        currentAddresses[chainId] = [raffle.address];
    }
    fs.writeFileSync(FRONTEND_ADDRESSES_FILE, JSON.stringify(currentAddresses));
};

const updateAbi = async () => {
    const raffle = await ethers.getContract("Raffle");
    fs.writeFileSync(
        FRONTEND_ABI_FILE,
        raffle.interface.format(ethers.utils.FormatTypes.json) as string
    );
};

export default updateFrontend;
updateFrontend.tags = ["all", "frontend"];

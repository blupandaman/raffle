import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains, networkConfig } from "../helper-hardhat-config";

const BASE_FEE = "250000000000000000"; // 0.25 is the premium. It costs 0.25 LINK.
const GAS_PRICE_LINK = 1e9; // Calculated value based on the gas price of the chain.

const deployMocks: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments } = hre;
    const { deploy, log } = deployments;
    const accounts = await ethers.getSigners();
    const deployer: SignerWithAddress = accounts[0];

    if (developmentChains.includes(network.name)) {
        log("Local network " + network.name + " detected. Deploying mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer.address,
            args: [BASE_FEE, GAS_PRICE_LINK],
            log: true,
        });
        log("Mocks deployed.");
        log("---------------------------------------------------------------");
    }
};

export default deployMocks;
deployMocks.tags = ["all", "mocks"];

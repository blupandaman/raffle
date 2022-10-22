import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { networkConfig } from "../helper-hardhat-config";
import { VRFCoordinatorV2Mock } from "../typechain-types";
import { verify } from "../utils/verify";
import { developmentChains } from "./../helper-hardhat-config";

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

const deployRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments } = hre;
    const { deploy, log } = deployments;
    const accounts = await ethers.getSigners();
    const deployer: SignerWithAddress = accounts[0];
    let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock, vrfCoordinatorV2Address, subscriptionId;

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        // Create the subscription
        const txResponse = await vrfCoordinatorV2Mock.createSubscription();
        const txReceipt = await txResponse.wait();
        subscriptionId = txReceipt!.events![0].args!.subId;
        log("Subscription is created");
        // Fund the subscription
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[network.name].vrfCoordinatorV2;
        subscriptionId = networkConfig[network.name].subscriptionId;
    }

    const args: any[] = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[network.name].entranceFee,
        networkConfig[network.name].gasLane,
        networkConfig[network.name].callbackGasLimit,
        networkConfig[network.name].interval,
    ];
    const raffle = await deploy("Raffle", {
        from: deployer.address,
        args: args,
        log: true,
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    });

    // Add raffle as a valid consumer
    if (developmentChains.includes(network.name)) {
        await vrfCoordinatorV2Mock!.addConsumer(subscriptionId, raffle.address);
        log("Consumer is added");
    }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...");
        await verify(raffle.address, args);
    }
    log("---------------------------------------------------------------");
};

export default deployRaffle;
deployRaffle.tags = ["all", "raffle"];

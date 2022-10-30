import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { deployments, ethers, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";

if (developmentChains.includes(network.name)) {
    describe.skip;
} else {
    describe("Raffle Staging Tests", () => {
        let raffleContract: Raffle;
        let raffle: Raffle;
        let raffleEntranceFee: BigNumber;
        let accounts: SignerWithAddress[];
        let deployer: SignerWithAddress;

        beforeEach(async () => {
            accounts = await ethers.getSigners();
            deployer = accounts[0];
            raffle = await ethers.getContract("Raffle", deployer);
            raffleEntranceFee = await raffle.getEntranceFee();
        });

        describe("fulfillRandomWords", () => {
            it("works with Chainlink Automations and VRF, we get a random winner", async () => {
                console.log("Setting up test...");
                const startingTimeStamp = await raffle.getLastTimeStamp();
                accounts = await ethers.getSigners();
                // Event listener
                await new Promise<void>(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired.");
                        try {
                            const recentWinner = await raffle.getRecentWinner();
                            const raffleState = await raffle.getRaffleState();
                            const winnerEndingBalance = await accounts[0].getBalance();
                            const endingTimeStamp = await raffle.getLastTimeStamp();

                            await expect(raffle.getPlayer(0)).to.be.reverted;
                            assert.equal(recentWinner.toString(), accounts[0].address);
                            assert.equal(raffleState, 0);
                            assert.equal(
                                winnerEndingBalance.toString(),
                                winnerStartingBalance.add(raffleEntranceFee).toString()
                            );
                            assert(endingTimeStamp > startingTimeStamp);
                            resolve();
                        } catch (error) {
                            console.log(error);
                            reject(error);
                        }
                    });
                    // Then entering the raffle
                    console.log("Entering Raffle...");
                    const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                    await tx.wait(1);
                    console.log("Ok, time to wait...");
                    const winnerStartingBalance = await accounts[0].getBalance();
                });
            });
        });
    });
}

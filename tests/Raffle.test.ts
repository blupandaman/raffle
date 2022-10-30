import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { deployments, ethers, network } from "hardhat";
import { Raffle, VRFCoordinatorV2Mock } from "../typechain-types";
import { developmentChains, networkConfig } from "./../helper-hardhat-config";

if (!developmentChains.includes(network.name)) {
    describe.skip;
} else {
    describe("Raffle Unit Tests", () => {
        let raffleContract: Raffle;
        let raffle: Raffle;
        let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
        let raffleEntranceFee: BigNumber;
        let interval: number;
        let accounts: SignerWithAddress[];
        let deployer: SignerWithAddress;
        let setCheckUpkeepToTrue: () => Promise<void>;

        beforeEach(async () => {
            accounts = await ethers.getSigners();
            deployer = accounts[0];
            await deployments.fixture(["mocks", "raffle"]);
            raffle = await ethers.getContract("Raffle", deployer);
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
            raffleEntranceFee = await raffle.getEntranceFee();
            interval = (await raffle.getInterval()).toNumber();
            setCheckUpkeepToTrue = async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval + 1]);
                await network.provider.send("evm_mine", []);
            };
        });

        describe("constructor", () => {
            it("initializes the raffle correctly", async () => {
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState.toString(), "0");
                assert.equal(
                    raffleEntranceFee.toString(),
                    networkConfig[network.name].entranceFee?.toString()
                );
                assert.equal(interval.toString(), networkConfig[network.name].interval);
            });
        });

        describe("enterRaffle", () => {
            it("reverts when you don't pay enough", async () => {
                await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                    raffle,
                    "Raffle__NotEnoughETHEntered"
                );
            });
            it("records players when they enter", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                const playerFromContract = await raffle.getPlayer(0);
                assert.equal(playerFromContract, deployer.address);
            });
            it("emits event on enter", async () => {
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                    raffle,
                    "RaffleEnter"
                );
            });
            it("doesn't allow entrance when raffle is calculating", async () => {
                await setCheckUpkeepToTrue();
                // we pretend to be a keeper for a second
                await raffle.performUpkeep([]);
                await expect(
                    raffle.enterRaffle({ value: raffleEntranceFee })
                ).to.be.revertedWithCustomError(raffle, "Raffle__RaffleNotOpen");
            });
        });

        describe("checkUpkeep", () => {
            it("returns false if people haven't sent any ETH", async () => {
                await network.provider.send("evm_increaseTime", [interval + 1]);
                await network.provider.send("evm_mine", []);
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                assert(!upkeepNeeded);
            });
            it("returns false if raffle is not open", async () => {
                await setCheckUpkeepToTrue();
                await raffle.performUpkeep([]);
                // Check raffle state after it is changed to CALCULATING
                const raffleState = await raffle.getRaffleState();
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                assert(raffleState.toString(), "1");
                assert(!upkeepNeeded);
            });
            it("returns false if enough time hasn't passed", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval - 3]);
                await network.provider.send("evm_mine", []);
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                assert(!upkeepNeeded);
            });
            it("returns true if enough time has passed, has players, eth, and is open", async () => {
                await setCheckUpkeepToTrue();
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                assert(upkeepNeeded);
            });
        });

        describe("performUpkeep", () => {
            it("can only run if checkUpkeep is true", async () => {
                await setCheckUpkeepToTrue();
                const tx = await raffle.performUpkeep([]);
                assert(tx);
            });
            it("reverts when checkUpkeep is false", async () => {
                await expect(raffle.performUpkeep([])).to.be.revertedWithCustomError(
                    raffle,
                    "Raffle__UpkeepNotNeeded"
                );
            });
            it("updates the raffle state, emits event and calls vrfCoordinator", async () => {
                await setCheckUpkeepToTrue();
                const txResponse = await raffle.performUpkeep([]);
                const txReceipt = await txResponse.wait(1);
                const requestId = txReceipt!.events![1].args!.requestId;
                const raffleState = await raffle.getRaffleState();
                assert(requestId.toNumber() > 0);
                assert.equal(raffleState.toString(), "1");
            });
        });

        describe("fulfillRandomWords", () => {
            beforeEach(async () => {
                await setCheckUpkeepToTrue();
            });
            it("can only be called after performUpkeep", async () => {
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                ).to.be.revertedWith("nonexistent request");
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                ).to.be.revertedWith("nonexistent request");
            });
            it("picks a winner, resets the lotter, and sends money", async () => {
                const additionalEntrants = 3;
                // Start at index 1 becuase deployer = 0
                for (let i = 1; i < 1 + additionalEntrants; i++) {
                    const accountConnectedRaffle = raffle.connect(accounts[i]);
                    await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
                }
                const startingTimeStamp = await raffle.getLastTimeStamp();

                // This will be more important for our staging tests...
                await new Promise<void>(async (resolve, reject) => {
                    // Set up event listener for WinnerPicked
                    raffle.once("WinnerPicked", async () => {
                        console.log("Found the event.");
                        try {
                            const winnerEndingBalance = await accounts[1].getBalance();
                            const raffleState = await raffle.getRaffleState();
                            const endingTimeStamp = await raffle.getLastTimeStamp();
                            const numPlayer = await raffle.getNumOfPlayers();
                            assert.equal(numPlayer.toNumber(), 0);
                            assert.equal(raffleState.toString(), "0");
                            assert(endingTimeStamp > startingTimeStamp);
                            assert.equal(
                                winnerEndingBalance.toString(),
                                winnerStartingBalance
                                    .add(
                                        raffleEntranceFee
                                            .mul(additionalEntrants)
                                            .add(raffleEntranceFee)
                                    )
                                    .toString()
                            );
                        } catch (error) {
                            reject(error);
                        }
                        resolve();
                    });
                    // Mock code that fires WinnerPicked event
                    const txResponse = await raffle.performUpkeep([]);
                    const txReceipt = await txResponse.wait(1);
                    const winnerStartingBalance = await accounts[1].getBalance();
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt!.events![1].args!.requestId,
                        raffle.address
                    );
                });
            });
        });
    });
}

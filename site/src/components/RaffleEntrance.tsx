import { BigNumber, ContractInterface, ethers } from "ethers";
import { useEffect, useState } from "react";
import {
    chain,
    useAccount,
    useContractEvent,
    useContractRead,
    useContractReads,
    useContractWrite,
    useNetwork,
    usePrepareContractWrite,
    useWaitForTransaction,
} from "wagmi";
import { abi, contractAddresses } from "../constants";

interface contractAddressesInterface {
    [key: string]: string[];
}

const RaffleEntrance = () => {
    const { isConnected } = useAccount();
    const { chain } = useNetwork();
    const addresses: contractAddressesInterface = contractAddresses;
    const [chainId, setChainId] = useState(31337);
    const raffleAddress = chainId in addresses ? addresses[chainId][0] : null;
    const [entranceFee, setEntranceFee] = useState("0");
    const [numOfPlayers, setNumOfPlayers] = useState(0);
    const [recentWinner, setRecentWinner] = useState("");
    const [connected, setConnected] = useState(false);

    const contractConfig = {
        addressOrName: raffleAddress!,
        contractInterface: abi as ContractInterface,
        chainId,
    };

    const { config: writeContractConfig } = usePrepareContractWrite({
        ...contractConfig,
        functionName: "enterRaffle",
        overrides: {
            value: entranceFee,
        },
    });

    const {
        data: enterRaffleData,
        write: enterRaffle,
        isLoading: isEnterRaffleLoading,
        isSuccess: isEnterRaffleStarted,
    } = useContractWrite(writeContractConfig);

    const { isSuccess: txSuccess } = useWaitForTransaction({
        hash: enterRaffleData?.hash,
        confirmations: 1,
        onSettled: () => updateUI(),
    });

    // Constant contract read
    const { data: entranceFeeData } = useContractRead({
        ...contractConfig,
        functionName: "getEntranceFee",
    });

    // Variable contract reads
    const { data: variableReadsData, refetch: variableReadsRefetch } = useContractReads({
        contracts: [
            {
                ...contractConfig,
                functionName: "getNumOfPlayers",
            },
            {
                ...contractConfig,
                functionName: "getRecentWinner",
            },
        ],
    });

    useContractEvent({
        ...contractConfig,
        eventName: "WinnerPicked" || "RaffleEnter",
        async listener() {
            await updateUI();
        },
    });

    const updateUI = async () => {
        await variableReadsRefetch();
        if (entranceFeeData) setEntranceFee(entranceFeeData.toString());
        if (variableReadsData) {
            setNumOfPlayers(variableReadsData[0].toNumber());
            setRecentWinner(variableReadsData[1].toString());
        }
    };

    useEffect(() => {
        if (isConnected) {
            setConnected(isConnected);
            updateUI();
        }
        if (chain) {
            setChainId(chain.id);
        }
    }, [entranceFeeData, variableReadsData, isConnected, chain]);

    return raffleAddress ? (
        <div>
            {connected ? (
                <>
                    <div>Entrance fee: {ethers.utils.formatEther(entranceFee)} ETH</div>
                    <div>Number of players: {numOfPlayers}</div>
                    <div>
                        {recentWinner === "0x0000000000000000000000000000000000000000"
                            ? "No winner yet"
                            : `Recent winner : ${recentWinner} ETH`}
                    </div>
                </>
            ) : (
                <div>Please connect your wallet</div>
            )}

            <div className="h-6"></div>

            {!txSuccess ? (
                <button
                    disabled={!enterRaffle || isEnterRaffleLoading || isEnterRaffleStarted}
                    className="btn  btn-primary font-bold rounded-lg px-6 shadow-lg hover:scale-105"
                    onClick={() => enterRaffle?.()}
                >
                    {isEnterRaffleLoading && "Waiting for approval"}
                    {isEnterRaffleStarted && "Entering Raffle..."}
                    {!isEnterRaffleLoading && !isEnterRaffleStarted && "Enter Raffle"}
                </button>
            ) : (
                <button disabled={true} className="btn font-bold rounded-lg px-6 shadow-lg">
                    Thank you for entering!
                </button>
            )}
        </div>
    ) : (
        <div>No Raffle address detected</div>
    );
};

export default RaffleEntrance;

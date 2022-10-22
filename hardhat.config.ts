import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "dotenv/config";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

const PRIVATE_KEY = process.env.PRIVATE_KEY! || "0xkey";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key";
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "https://eth-goerli";
const REPORT_GAS = process.env.REPORT_GAS || false;

const config: HardhatUserConfig = {
    solidity: "0.8.17",
    networks: {
        hardhat: {
            chainId: 31337,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 5,
        },
    },
    etherscan: {
        apiKey: {
            goerli: ETHERSCAN_API_KEY,
        },
    },
    gasReporter: {
        // enabled: true,
        enabled: REPORT_GAS === "true" ? true : false,
    },
    mocha: {
        timeout: 500000, // 500 seconds max
    },
};

export default config;

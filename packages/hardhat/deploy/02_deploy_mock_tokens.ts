import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "ethers";

/**
 * Deploys mock meme tokens for testing
 */
const deployMockTokens: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy PEPE token
  await deploy("PEPE", {
    contract: "MockMemeToken",
    from: deployer,
    args: ["Pepe", "PEPE", ethers.parseEther("1000000")], // 1M tokens
    log: true,
    autoMine: true,
  });

  // Deploy DOGE token
  await deploy("DOGE", {
    contract: "MockMemeToken",
    from: deployer,
    args: ["Dogecoin", "DOGE", ethers.parseEther("1000000")], // 1M tokens
    log: true,
    autoMine: true,
  });
};

export default deployMockTokens;
deployMockTokens.tags = ["MockTokens"];

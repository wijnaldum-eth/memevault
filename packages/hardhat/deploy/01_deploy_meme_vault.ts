import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the MemeVault contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployMemeVault: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("MemeVault", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });

  // Get the deployed contract
  const memeVault = await hre.ethers.getContract<Contract>("MemeVault", deployer);
  console.log("🚀 MemeVault deployed at:", await memeVault.getAddress());
};

export default deployMemeVault;

// Tags
deployMemeVault.tags = ["MemeVault"];

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

  // Deploy wSOL token (Wrapped Solana)
  await deploy("wSOL", {
    contract: "MockMemeToken",
    from: deployer,
    args: ["Wrapped Solana", "wSOL", ethers.parseEther("10000")], // 10K tokens
    log: true,
    autoMine: true,
  });

  // Deploy wBTC token (Wrapped Bitcoin)
  try {
    await deploy("wBTC", {
      contract: "MockMemeToken",
      from: deployer,
      args: ["Wrapped Bitcoin", "wBTC", ethers.parseEther("100")], // 100 tokens
      log: true,
      autoMine: true,
      gasPrice: "2000000000", // 2 gwei - explicit gas price to avoid replacement issues
    });
  } catch (error: any) {
    if (error.message.includes("REPLACEMENT_UNDERPRICED")) {
      console.log("⚠️  wBTC deployment had gas price issue, retrying with higher gas...");
      await deploy("wBTC", {
        contract: "MockMemeToken",
        from: deployer,
        args: ["Wrapped Bitcoin", "wBTC", ethers.parseEther("100")],
        log: true,
        autoMine: true,
        gasPrice: "5000000000", // 5 gwei
      });
    } else {
      throw error;
    }
  }
};

export default deployMockTokens;
deployMockTokens.tags = ["MockTokens"];

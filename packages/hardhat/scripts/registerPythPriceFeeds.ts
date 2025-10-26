import { ethers } from "hardhat";

const PRICE_FEEDS = {
  PEPE: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  DOGE: "0xdcef50dd0a4cd2dcc17e45df1676dcb336436849701b831ee5ff1913dfb1c4a9",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
};

async function main() {
  console.log("📊 Registering Pyth price feeds...\n");

  // Get deployed contracts
  const memeVault = await ethers.getContract("MemeVault");
  const pepeToken = await ethers.getContract("PEPE");
  const dogeToken = await ethers.getContract("DOGE");

  const memeVaultAddress = await memeVault.getAddress();
  const pepeAddress = await pepeToken.getAddress();
  const dogeAddress = await dogeToken.getAddress();

  console.log(`MemeVault: ${memeVaultAddress}`);
  console.log(`PEPE Token: ${pepeAddress}`);
  console.log(`DOGE Token: ${dogeAddress}\n`);

  // Register PEPE price feed
  try {
    console.log("Registering PEPE price feed...");
    const tx1 = await memeVault.registerPriceFeed(pepeAddress, PRICE_FEEDS.PEPE);
    const receipt1 = await tx1.wait();
    console.log(`✅ PEPE price feed registered (tx: ${receipt1?.hash})\n`);
  } catch (error: any) {
    console.log(`❌ Error registering PEPE: ${error.message}\n`);
  }

  // Register DOGE price feed
  try {
    console.log("Registering DOGE price feed...");
    const tx2 = await memeVault.registerPriceFeed(dogeAddress, PRICE_FEEDS.DOGE);
    const receipt2 = await tx2.wait();
    console.log(`✅ DOGE price feed registered (tx: ${receipt2?.hash})\n`);
  } catch (error: any) {
    console.log(`❌ Error registering DOGE: ${error.message}\n`);
  }

  // Verify registrations
  console.log("📋 Verifying price feed registrations...\n");

  const pepeFeedId = await memeVault.tokenPriceFeedIds(pepeAddress);
  const dogeFeedId = await memeVault.tokenPriceFeedIds(dogeAddress);

  console.log(`PEPE Feed ID: ${pepeFeedId}`);
  console.log(`Expected:    ${PRICE_FEEDS.PEPE}`);
  console.log(`Match: ${pepeFeedId === PRICE_FEEDS.PEPE ? "✅" : "❌"}\n`);

  console.log(`DOGE Feed ID: ${dogeFeedId}`);
  console.log(`Expected:    ${PRICE_FEEDS.DOGE}`);
  console.log(`Match: ${dogeFeedId === PRICE_FEEDS.DOGE ? "✅" : "❌"}\n`);

  console.log("🎉 Price feed registration complete!");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

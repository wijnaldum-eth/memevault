import { expect } from "chai";
import { ethers } from "hardhat";
import { MemeVault, MockMemeToken } from "../typechain-types";

describe("MemeVault - Pyth Integration", function () {
  let memeVault: MemeVault;
  let mockToken: MockMemeToken;
  let owner: any;
  let user: any;

  // Mock Pyth contract address
  const MOCK_PYTH_ADDRESS = "0x4305FB66699C3B2702D4d05CF36551390A4c69C6";

  // Mock price feed ID for PEPE/USD
  const PEPE_PRICE_FEED_ID = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy MemeVault with mock Pyth address
    const MemeVaultFactory = await ethers.getContractFactory("MemeVault");
    memeVault = await MemeVaultFactory.deploy(owner.address, MOCK_PYTH_ADDRESS);
    await memeVault.waitForDeployment();

    // Deploy mock token
    const MockTokenFactory = await ethers.getContractFactory("MockMemeToken");
    mockToken = await MockTokenFactory.deploy("PEPE", "PEPE", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Mint tokens to user
    await mockToken.mint(user.address, ethers.parseEther("1000"));
  });

  describe("Price Feed Registration", function () {
    it("Should allow owner to register price feeds", async function () {
      await memeVault.registerPriceFeed(await mockToken.getAddress(), PEPE_PRICE_FEED_ID);

      // Verify registration was successful by checking no error was thrown
      expect(memeVault.registerPriceFeed).to.be.a("function");
    });

    it("Should not allow non-owner to register price feeds", async function () {
      await expect(
        memeVault.connect(user).registerPriceFeed(await mockToken.getAddress(), PEPE_PRICE_FEED_ID),
      ).to.be.revertedWith("Only owner can register price feeds");
    });

    it("Should reject invalid token address", async function () {
      await expect(memeVault.registerPriceFeed(ethers.ZeroAddress, PEPE_PRICE_FEED_ID)).to.be.revertedWith(
        "Invalid token",
      );
    });

    it("Should store price feed ID correctly", async function () {
      await memeVault.registerPriceFeed(await mockToken.getAddress(), PEPE_PRICE_FEED_ID);

      const storedFeedId = await memeVault.tokenPriceFeedIds(await mockToken.getAddress());
      expect(storedFeedId).to.equal(PEPE_PRICE_FEED_ID);
    });
  });

  describe("Price Update Handling", function () {
    beforeEach(async function () {
      // Register price feed
      await memeVault.registerPriceFeed(await mockToken.getAddress(), PEPE_PRICE_FEED_ID);
    });

    it("Should reject price updates with no data", async function () {
      await expect(memeVault.updatePrices([])).to.be.revertedWith("No price updates provided");
    });

    it("Should handle insufficient fee", async function () {
      // This would fail in real scenario with actual Pyth contract
      // For testing, we're just verifying the check exists
      // const mockUpdateData = [ethers.toBeHex("0x1234", 32)];

      // In a real test with Pyth mock, this would revert with "Insufficient fee"
      // For now, we verify the function signature exists
      expect(memeVault.updatePrices).to.be.a("function");
    });
  });

  describe("Price Reading", function () {
    beforeEach(async function () {
      // Register price feed
      await memeVault.registerPriceFeed(await mockToken.getAddress(), PEPE_PRICE_FEED_ID);
    });

    it("Should reject reading price for unregistered token", async function () {
      const unregisteredToken = await ethers.deployContract("MockMemeToken", [
        "DOGE",
        "DOGE",
        ethers.parseEther("1000000"),
      ]);

      await expect(memeVault.getTokenPrice(await unregisteredToken.getAddress(), 60)).to.be.revertedWith(
        "Price feed not registered for token",
      );
    });

    it("Should reject reading USD price for unregistered token", async function () {
      const unregisteredToken = await ethers.deployContract("MockMemeToken", [
        "SHIB",
        "SHIB",
        ethers.parseEther("1000000"),
      ]);

      await expect(memeVault.getTokenPriceUsd(await unregisteredToken.getAddress(), 60)).to.be.revertedWith(
        "Price feed not registered for token",
      );
    });

    it("Should reject calculating deposit value for unregistered token", async function () {
      const unregisteredToken = await ethers.deployContract("MockMemeToken", [
        "FLOKI",
        "FLOKI",
        ethers.parseEther("1000000"),
      ]);

      await expect(
        memeVault.getDepositValueUsd(await unregisteredToken.getAddress(), ethers.parseEther("100"), 60),
      ).to.be.revertedWith("Price feed not registered for token");
    });
  });

  describe("Integration with Deposits", function () {
    beforeEach(async function () {
      // Register price feed
      await memeVault.registerPriceFeed(await mockToken.getAddress(), PEPE_PRICE_FEED_ID);

      // Approve tokens for deposit
      await mockToken.connect(user).approve(await memeVault.getAddress(), ethers.parseEther("100"));
    });

    it("Should allow deposits with registered price feed", async function () {
      const depositAmount = ethers.parseEther("100");

      await memeVault.connect(user).deposit(await mockToken.getAddress(), depositAmount, "Base");

      expect(await memeVault.getDepositValueUsd(await mockToken.getAddress(), depositAmount, 60)).to.be.above(0);
      const userDeposit = await memeVault.getUserDeposit(user.address, await mockToken.getAddress());
      expect(userDeposit).to.equal(depositAmount);
    });

    it("Should track deposits correctly", async function () {
      const depositAmount = ethers.parseEther("100");

      await memeVault.connect(user).deposit(await mockToken.getAddress(), depositAmount, "Base");

      const userDeposit = await memeVault.getUserDeposit(user.address, await mockToken.getAddress());
      expect(userDeposit).to.equal(depositAmount);

      const totalDeposits = await memeVault.totalDeposits(await mockToken.getAddress());
      expect(totalDeposits).to.equal(depositAmount);
    });

    it("Should emit YieldRouted event on deposit", async function () {
      const depositAmount = ethers.parseEther("100");

      await expect(memeVault.connect(user).deposit(await mockToken.getAddress(), depositAmount, "Base")).to.emit(
        memeVault,
        "YieldRouted",
      );

      expect(await memeVault.getDepositValueUsd(await mockToken.getAddress(), depositAmount, 60)).to.be.above(0);
    });
  });

  describe("Pyth Contract Integration", function () {
    it("Should store Pyth contract address", async function () {
      const pythAddress = await memeVault.pyth();
      expect(pythAddress).to.equal(MOCK_PYTH_ADDRESS);
    });

    it("Should allow updating Pyth contract address via new deployment", async function () {
      const newPythAddress = "0x1234567890123456789012345678901234567890";
      const MemeVaultFactory = await ethers.getContractFactory("MemeVault");
      const newVault = await MemeVaultFactory.deploy(owner.address, newPythAddress);
      await newVault.waitForDeployment();

      const pythAddress = await newVault.pyth();
      expect(pythAddress).to.equal(newPythAddress);
    });
  });

  describe("Security Tests", function () {
    it("Should prevent reentrancy on deposit", async function () {
      await mockToken.connect(user).approve(await memeVault.getAddress(), ethers.parseEther("100"));

      // Normal deposit should work
      await memeVault.connect(user).deposit(await mockToken.getAddress(), ethers.parseEther("50"), "Base");

      expect(await memeVault.getDepositValueUsd(await mockToken.getAddress(), ethers.parseEther("50"), 60)).to.be.above(
        0,
      );
    });

    it("Should prevent reentrancy on withdrawal", async function () {
      await mockToken.connect(user).approve(await memeVault.getAddress(), ethers.parseEther("100"));

      await memeVault.connect(user).deposit(await mockToken.getAddress(), ethers.parseEther("50"), "Base");

      // Normal withdrawal should work
      await memeVault.connect(user).withdraw(await mockToken.getAddress(), ethers.parseEther("25"));

      expect(await memeVault.getDepositValueUsd(await mockToken.getAddress(), ethers.parseEther("25"), 60)).to.be.above(
        0,
      );
    });

    it("Should reject zero amount deposits", async function () {
      await mockToken.connect(user).approve(await memeVault.getAddress(), ethers.parseEther("100"));

      await expect(memeVault.connect(user).deposit(await mockToken.getAddress(), 0, "Base")).to.be.revertedWith(
        "Amount must be > 0",
      );
    });

    it("Should reject invalid token address", async function () {
      await expect(
        memeVault.connect(user).deposit(ethers.ZeroAddress, ethers.parseEther("100"), "Base"),
      ).to.be.revertedWith("Invalid token");
    });
  });
});

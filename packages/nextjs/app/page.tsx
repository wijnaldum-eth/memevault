"use client";

import { useMemo, useState } from "react";
import { AISuggestionModal } from "../components/MemeVault/AISuggestionModal";
import { DepositForm, type TokenOption } from "../components/MemeVault/DepositForm";
import { YieldDashboard } from "../components/MemeVault/YieldDashboard";
import { PythPriceGrid } from "../components/PythPriceDisplay";
import type { NextPage } from "next";
import type { Address as AddressType, Hash } from "viem";
import { parseEther } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { Address as AddressDisplay, Balance } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

type PendingDeposit = {
  token: string;
  amount: string;
  chain: string;
  tokenLabel?: string;
  tokenSymbol?: string;
  tokenEmoji?: string;
  chainLabel?: string;
  chainEmoji?: string;
};

const CHAIN_METADATA: Record<string, { label: string; emoji?: string }> = {
  Sepolia: { label: "Sepolia Testnet", emoji: "🧪" },
  Base: { label: "Base Sepolia", emoji: "🟦" },
};

const Home: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  useTargetNetwork();
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [pendingDeposit, setPendingDeposit] = useState<PendingDeposit | null>(null);

  const publicClient = usePublicClient();
  const { writeContractAsync: writeMemeVaultAsync } = useScaffoldWriteContract({
    contractName: "MemeVault",
    disableSimulate: true,
  });
  const { writeContractAsync } = useWriteContract();
  const { data: memeVaultContract } = useDeployedContractInfo({ contractName: "MemeVault" });
  const { data: pepeContract } = useDeployedContractInfo({ contractName: "PEPE" });
  const { data: dogeContract } = useDeployedContractInfo({ contractName: "DOGE" });
  const { data: wsolContract } = useDeployedContractInfo({ contractName: "wSOL" as any });
  const { data: wbtcContract } = useDeployedContractInfo({ contractName: "wBTC" as any });

  const tokenOptions = useMemo<TokenOption[]>(() => {
    const options: TokenOption[] = [];

    if (pepeContract?.address) {
      options.push({ name: "PEPE", symbol: "PEPE", emoji: "🐸", address: pepeContract.address });
    }

    if (dogeContract?.address) {
      options.push({ name: "DOGE", symbol: "DOGE", emoji: "🐶", address: dogeContract.address });
    }

    if (wsolContract?.address) {
      options.push({ name: "Wrapped Solana", symbol: "wSOL", emoji: "◎", address: wsolContract.address });
    }

    if (wbtcContract?.address) {
      options.push({ name: "Wrapped Bitcoin", symbol: "wBTC", emoji: "₿", address: wbtcContract.address });
    }

    return options;
  }, [dogeContract?.address, pepeContract?.address, wsolContract?.address, wbtcContract?.address]);

  const handleDepositSubmit = (token: string, amount: string, chain: string) => {
    const tokenInfo = tokenOptions.find(option => option.address?.toLowerCase() === token.toLowerCase());
    const chainInfo = CHAIN_METADATA[chain];

    setPendingDeposit({
      token,
      amount,
      chain,
      tokenLabel: tokenInfo?.name,
      tokenSymbol: tokenInfo?.symbol,
      tokenEmoji: tokenInfo?.emoji,
      chainLabel: chainInfo?.label,
      chainEmoji: chainInfo?.emoji,
    });
    setShowAISuggestion(true);
  };

  const handleMintTokens = async (tokenAddress: AddressType | undefined, amount: string) => {
    if (!connectedAddress) {
      console.error("No wallet connected");
      return;
    }

    if (!tokenAddress) {
      console.error("Token address not available on this network");
      return;
    }

    try {
      await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "to", type: "address" },
              { internalType: "uint256", name: "amount", type: "uint256" },
            ],
            name: "mint",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "mint",
        args: [connectedAddress as AddressType, parseEther(amount)],
      });
      console.log("Tokens minted successfully!");
    } catch (error) {
      console.error("Minting failed:", error);
    }
  };

  const handleAIConfirm = async () => {
    if (!pendingDeposit) return;

    try {
      // Convert amount to wei (assuming 18 decimals for simplicity)
      const amountInWei = parseEther(pendingDeposit.amount);
      const memeVaultAddress = memeVaultContract?.address;

      if (!memeVaultAddress) {
        console.error("MemeVault contract address not available on this network");
        return;
      }

      // First, approve the MemeVault contract to spend the tokens
      const approvalTxHash = (await writeContractAsync({
        address: pendingDeposit.token as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "spender", type: "address" },
              { internalType: "uint256", name: "amount", type: "uint256" },
            ],
            name: "approve",
            outputs: [{ internalType: "bool", name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "approve",
        args: [memeVaultAddress, amountInWei],
      })) as Hash;

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: approvalTxHash });
      }

      // Then, deposit to the vault
      await writeMemeVaultAsync({
        functionName: "deposit",
        args: [pendingDeposit.token, amountInWei, pendingDeposit.chain],
      });

      console.log("Deposit executed successfully!");
      setShowAISuggestion(false);
      setPendingDeposit(null);
    } catch (error) {
      console.error("Deposit failed:", error);
      // TODO: Show error toast
    }
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-10 min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-green-900">
        <div className="px-5 w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              🚀 MemeVault
            </h1>
            <p className="text-xl text-gray-300 mb-6">Deposit meme coins, AI routes to highest yields across chains</p>
            {isConnected ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 inline-block">
                <p className="text-white mb-2">Connected Wallet:</p>
                <AddressDisplay address={connectedAddress} />
              </div>
            ) : (
              <p className="text-yellow-300">Connect your wallet to start earning yields!</p>
            )}
          </div>

          {isConnected && (
            <div className="space-y-8">
              {/* Pyth Price Feeds */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">💰 Real-Time Prices (Powered by Pyth)</h2>
                <p className="text-gray-300 mb-4">Live price feeds updated every 10 seconds</p>
                <PythPriceGrid tokens={["BTC", "ETH", "SOL"]} />
              </div>

              {/* Mint Tokens Section */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Get Test Tokens</h2>
                <p className="text-gray-300 mb-4">Mint tokens to your wallet for testing</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleMintTokens(pepeContract?.address, "1000")}
                    disabled={!pepeContract?.address}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pepeContract?.address ? "🐸 Mint 1000 PEPE" : "PEPE unavailable"}
                  </button>
                  <button
                    onClick={() => handleMintTokens(dogeContract?.address, "1000")}
                    disabled={!dogeContract?.address}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {dogeContract?.address ? "🐶 Mint 1000 DOGE" : "DOGE unavailable"}
                  </button>
                  <button
                    onClick={() => handleMintTokens(wsolContract?.address, "100")}
                    disabled={!wsolContract?.address}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {wsolContract?.address ? "◎ Mint 100 wSOL" : "wSOL unavailable"}
                  </button>
                  <button
                    onClick={() => handleMintTokens(wbtcContract?.address, "1")}
                    disabled={!wbtcContract?.address}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {wbtcContract?.address ? "₿ Mint 1 wBTC" : "wBTC unavailable"}
                  </button>
                </div>
              </div>

              {/* Balance Display */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Your Balance</h2>
                <Balance address={connectedAddress!} className="text-white" />
              </div>

              {/* Deposit Form */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Deposit Meme Coins</h2>
                <DepositForm onSubmit={handleDepositSubmit} presetTokens={tokenOptions} />
              </div>

              {/* Yield Dashboard */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Your Yields</h2>
                <YieldDashboard />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestion Modal */}
      <AISuggestionModal
        isOpen={showAISuggestion}
        onClose={() => setShowAISuggestion(false)}
        deposit={pendingDeposit}
        onConfirm={handleAIConfirm}
      />
    </>
  );
};

export default Home;

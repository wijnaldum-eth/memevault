"use client";

import { useState } from "react";
import { AISuggestionModal } from "../components/MemeVault/AISuggestionModal";
import { DepositForm } from "../components/MemeVault/DepositForm";
import { YieldDashboard } from "../components/MemeVault/YieldDashboard";
import type { NextPage } from "next";
import { type Hash, parseEther } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { Address, Balance } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

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

const TOKEN_METADATA: Record<string, { label: string; symbol: string; emoji?: string }> = {
  "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9": { label: "PEPE", symbol: "PEPE", emoji: "🐸" },
  "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707": { label: "DOGE", symbol: "DOGE", emoji: "🐶" },
};

const CHAIN_METADATA: Record<string, { label: string; emoji?: string }> = {
  Sepolia: { label: "Sepolia Testnet", emoji: "🧪" },
  Base: { label: "Base Sepolia", emoji: "🟦" },
};

const Home: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [pendingDeposit, setPendingDeposit] = useState<PendingDeposit | null>(null);

  const publicClient = usePublicClient();
  const { writeContractAsync: writeMemeVaultAsync } = useScaffoldWriteContract({
    contractName: "MemeVault",
    disableSimulate: true,
  });
  const { writeContractAsync } = useWriteContract();

  const handleDepositSubmit = (token: string, amount: string, chain: string) => {
    const tokenInfo = TOKEN_METADATA[token.toLowerCase()];
    const chainInfo = CHAIN_METADATA[chain];

    setPendingDeposit({
      token,
      amount,
      chain,
      tokenLabel: tokenInfo?.label,
      tokenSymbol: tokenInfo?.symbol,
      tokenEmoji: tokenInfo?.emoji,
      chainLabel: chainInfo?.label,
      chainEmoji: chainInfo?.emoji,
    });
    setShowAISuggestion(true);
  };

  const handleMintTokens = async (tokenAddress: string, amount: string) => {
    if (!connectedAddress) {
      console.error("No wallet connected");
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
        args: [connectedAddress!, parseEther(amount)],
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
        args: ["0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", amountInWei], // MemeVault address
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
                <Address address={connectedAddress} />
              </div>
            ) : (
              <p className="text-yellow-300">Connect your wallet to start earning yields!</p>
            )}
          </div>

          {isConnected && (
            <div className="space-y-8">
              {/* Mint Tokens Section */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Get Test Tokens</h2>
                <p className="text-gray-300 mb-4">Mint PEPE or DOGE tokens to your wallet for testing</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleMintTokens("0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", "1000")}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                    Mint 1000 PEPE
                  </button>
                  <button
                    onClick={() => handleMintTokens("0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", "1000")}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                    Mint 1000 DOGE
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
                <DepositForm onSubmit={handleDepositSubmit} />
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

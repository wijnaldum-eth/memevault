"use client";

import { useState } from "react";
import { IntentTimeline } from "./IntentTimeline";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { useNexusIntent } from "~~/hooks/useNexusIntent";
import { NEXUS_CONFIG } from "~~/utils/nexusConfig";

interface AISuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposit: {
    token: string;
    amount: string;
    chain: string;
    tokenLabel?: string;
    tokenSymbol?: string;
    tokenEmoji?: string;
    chainLabel?: string;
    chainEmoji?: string;
  } | null;
  onConfirm: () => void;
}

export const AISuggestionModal = ({ isOpen, onClose, deposit, onConfirm }: AISuggestionModalProps) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const { createBridgeAndExecute, status: nexusStatus, intentId, txHash } = useNexusIntent();

  const { chain } = useAccount();

  if (!isOpen || !deposit) return null;

  // Derived state for Nexus status
  const nexusIsCompleted = nexusStatus === "completed";
  const nexusIsPending =
    nexusStatus === "creating" ||
    nexusStatus === "pending" ||
    nexusStatus === "bridging" ||
    nexusStatus === "executing";

  // Cross-chain detection: If on Sepolia, Base has higher APY (18% vs 12%)
  const sourceChain = deposit.chain;
  const bestCrossChainAPY = "18%"; // Base always has best APY in demo
  const bestCrossChainName = "Base Sepolia";
  const shouldSuggestCrossChain = sourceChain !== "Base";

  const suggestedAPY = deposit.chain === "Base" ? "12%" : "8%";
  const suggestedVault = deposit.chain === "Base" ? "BaseMoonwell" : "SepoliaMock";

  const tokenDisplay =
    `${deposit.tokenEmoji ?? ""} ${deposit.tokenLabel ?? deposit.tokenSymbol ?? deposit.token}`.trim();
  const chainDisplay = `${deposit.chainEmoji ?? ""} ${deposit.chainLabel ?? deposit.chain}`.trim();

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCrossChainConfirm = async () => {
    setIsConfirming(true);

    try {
      // STEP 1: Switch to source chain FIRST (before modal opens)
      const sourceChainId =
        deposit.chain === "Base" ? NEXUS_CONFIG.chains.base.chainId : NEXUS_CONFIG.chains.sepolia.chainId;

      // For cross-chain recommendation we always route to Base Sepolia for higher APY
      const destChainId = NEXUS_CONFIG.chains.base.chainId;

      const currentChainId = chain?.id;
      console.log(`Current chain: ${currentChainId}, Source chain: ${sourceChainId}`);

      if (currentChainId !== sourceChainId) {
        console.log(`Current chain ${currentChainId} !== source chain ${sourceChainId}`);
        console.log(`MUST switch to ${deposit.chain === "Base" ? "Base Sepolia" : "Sepolia"} before proceeding`);

        // Use direct wallet_switchEthereumChain RPC call
        setIsSwitchingNetwork(true);

        try {
          const provider = (window as any).ethereum;
          if (!provider) {
            throw new Error("No wallet provider found");
          }

          // Convert chain ID to hex
          const chainIdHex = `0x${sourceChainId.toString(16)}`;
          console.log(`Requesting switch to chain ${chainIdHex} (${sourceChainId})`);

          // Direct RPC call to switch network
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }],
          });

          console.log("Switch request sent to MetaMask");

          // Poll until the switch actually completes (up to 15 seconds)
          let switchCompleted = false;
          let attempts = 0;
          const maxAttempts = 30; // 15 seconds (500ms * 30)

          while (!switchCompleted && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;

            const currentChainId = await provider.request({ method: "eth_chainId" });
            const currentChainDecimal = parseInt(currentChainId, 16);

            console.log(`Attempt ${attempts}: Current chain = ${currentChainDecimal}, Target = ${sourceChainId}`);

            if (currentChainDecimal === sourceChainId) {
              switchCompleted = true;
              console.log(`✅ Network switch confirmed after ${attempts * 500}ms`);
            }
          }

          if (!switchCompleted) {
            const finalChainId = await provider.request({ method: "eth_chainId" });
            const finalChainDecimal = parseInt(finalChainId, 16);
            throw new Error(
              `Network switch timed out. Still on chain ${finalChainDecimal}, need ${sourceChainId}. Please manually switch in MetaMask.`,
            );
          }

          console.log("✅ Network switch confirmed");

          // CRITICAL: Re-initialize Nexus SDK after network switch
          console.log("🔄 Re-initializing Nexus SDK with new network...");
          const { deinitNexus, initializeNexus } = await import("~~/lib/nexus");

          try {
            await deinitNexus();
          } catch (e) {
            console.log("Deinit not needed or failed:", e);
          }

          await initializeNexus(provider);
          console.log("✅ Nexus SDK re-initialized on current source chain");

          setIsSwitchingNetwork(false);
        } catch (switchError: any) {
          console.error("Network switch error:", switchError);
          setIsSwitchingNetwork(false);
          setIsConfirming(false);

          if (switchError.code === 4902) {
            // Chain not added to wallet
            const missingChain = deposit.chain === "Base" ? "Base Sepolia" : "Sepolia";
            alert(`${missingChain} network not found in your wallet. Please add it first.`);
          } else if (switchError.code === 4001) {
            // User rejected
            alert("You must switch to the recommended source network to continue");
          } else {
            alert(`Failed to switch network: ${switchError.message}`);
          }
          return;
        }
      }

      // STEP 2: Now open modal and create intent

      // Create Nexus Bridge & Execute intent
      await createBridgeAndExecute({
        fromChain: sourceChainId,
        toChain: destChainId,
        token: deposit.token as Address,
        amount: deposit.amount,
        targetProtocol: "MemeVault",
      });

      // Intent created successfully - timeline will show progress
    } catch (error) {
      console.error("Cross-chain intent failed:", error);
      setIsConfirming(false);
    }
  };

  // Show network switching UI
  if (isSwitchingNetwork) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-green-900/90 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-purple-500/30 text-center">
          <div className="text-6xl mb-4 animate-bounce">🔄</div>
          <h3 className="text-2xl font-bold text-white mb-2">Switching Network</h3>
          <p className="text-gray-300 mb-4">
            Please approve the network switch to <span className="text-purple-300 font-semibold">Base Sepolia</span> in
            your wallet
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Show timeline if Nexus intent is active
  if (nexusStatus !== "idle") {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-green-900/90 rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-purple-500/30">
          <IntentTimeline status={nexusStatus} intentId={intentId} txHash={txHash} />

          {nexusIsCompleted && (
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  onClose();
                  // Reset state would happen here
                }}
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 px-8 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all"
              >
                ✅ Done - View Dashboard
              </button>
            </div>
          )}

          {!nexusIsPending && !nexusIsCompleted && (
            <div className="mt-4 text-center">
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-sm">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl my-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          ×
        </button>

        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Yield Analysis</h2>
          <p className="text-gray-600">Based on real-time market data from Pyth</p>
        </div>

        <div className="space-y-4 mb-6">
          {/* Deposit Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Deposit Amount:</span>
              <span className="font-semibold text-lg">
                {deposit.amount} {deposit.tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Token:</span>
              <span className="font-mono text-sm">{tokenDisplay}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Source Chain:</span>
              <span className="font-semibold">{chainDisplay}</span>
            </div>
          </div>

          {/* Route Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Same Chain */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 hover:border-blue-400 transition-colors cursor-pointer">
              <div className="text-center">
                <div className="text-2xl mb-2">⚡</div>
                <p className="text-blue-800 font-semibold mb-1">Same Chain</p>
                <p className="text-2xl font-bold text-blue-600 mb-1">{suggestedVault}</p>
                <p className="text-lg text-blue-700 mb-2">{suggestedAPY} APY</p>
                <p className="text-xs text-blue-600">
                  ✓ Instant (~30s)
                  <br />✓ Gas: ~0.0005 ETH
                </p>
              </div>
            </div>

            {/* Option 2: Cross-Chain (if beneficial) */}
            {shouldSuggestCrossChain && (
              <div className="bg-gradient-to-br from-purple-50 to-green-50 border-2 border-purple-300 rounded-lg p-4 hover:border-purple-500 transition-colors cursor-pointer relative">
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  +6% APY! 🔥
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">🌊</div>
                  <p className="text-purple-800 font-semibold mb-1">Cross-Chain</p>
                  <p className="text-2xl font-bold text-purple-600 mb-1">{bestCrossChainName}</p>
                  <p className="text-lg text-green-700 mb-2 font-bold">{bestCrossChainAPY} APY</p>
                  <p className="text-xs text-purple-600">
                    ⏱ ~7 minutes
                    <br />
                    💰 Gas: ~0.0023 ETH
                    <br />
                    <span className="text-green-600 font-semibold">✨ Powered by Avail Nexus</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {shouldSuggestCrossChain && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-800">
                <strong>💡 AI Recommendation:</strong> Cross-chain routing to {bestCrossChainName} offers{" "}
                <strong>+6% higher APY</strong>. Even after bridge fees, you&apos;ll earn{" "}
                <strong>~$45 more per year</strong> on this deposit!
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {shouldSuggestCrossChain && (
            <button
              onClick={handleCrossChainConfirm}
              disabled={isConfirming}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-green-600 text-white font-bold py-4 px-6 rounded-lg hover:from-purple-700 hover:via-pink-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isConfirming ? (
                <span>🌊 Creating Nexus Intent...</span>
              ) : (
                <span>🚀 Bridge & Deposit on Base (Recommended)</span>
              )}
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isConfirming ? "Executing..." : "⚡ Deposit on Same Chain"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MEME_TOKEN_FEEDS, usePythPrice } from "../hooks/usePythPrice";
import { formatPrice } from "../utils/pythIntegration";

interface RoutingRecommendation {
  chain: string;
  vault: string;
  apy: number;
  allocation: number; // percentage
  reason: string;
  priceImpact: number; // percentage
}

interface PythAIRoutingModalProps {
  tokenName: keyof typeof MEME_TOKEN_FEEDS;
  depositAmount: number;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (recommendations: RoutingRecommendation[]) => void;
  onDecline: () => void;
}

/**
 * AI Routing Modal with Pyth Price Integration
 * Shows intelligent yield routing recommendations based on real-time prices
 */
export const PythAIRoutingModal: React.FC<PythAIRoutingModalProps> = ({
  tokenName,
  depositAmount,
  isOpen,
  onClose,
  onApprove,
  onDecline,
}) => {
  const priceFeedId = MEME_TOKEN_FEEDS[tokenName];
  const priceData = usePythPrice(priceFeedId, 10000);
  const [recommendations, setRecommendations] = useState<RoutingRecommendation[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);

  // Calculate routing recommendations based on Pyth prices
  useEffect(() => {
    if (priceData.isLoading || priceData.error) {
      setIsCalculating(true);
      return;
    }

    // Simulate AI routing logic based on price data
    const newRecommendations: RoutingRecommendation[] = [];

    // Base recommendation: 70% to Base, 30% to Sepolia
    const baseAllocation = 70;
    const sepoliaAllocation = 30;

    // Adjust based on price volatility (confidence interval)
    const volatility = (priceData.confidence / priceData.price) * 100;

    if (volatility < 1) {
      // Low volatility: aggressive allocation
      newRecommendations.push({
        chain: "Base",
        vault: "BaseMoonwell",
        apy: 12,
        allocation: baseAllocation,
        reason: "High liquidity, stable price",
        priceImpact: 0.5,
      });
      newRecommendations.push({
        chain: "Sepolia",
        vault: "SepoliaAave",
        apy: 8,
        allocation: sepoliaAllocation,
        reason: "Diversification, testnet yield",
        priceImpact: 0.3,
      });
    } else if (volatility < 2) {
      // Medium volatility: balanced allocation
      newRecommendations.push({
        chain: "Base",
        vault: "BaseMoonwell",
        apy: 11,
        allocation: 60,
        reason: "Balanced risk/reward",
        priceImpact: 0.4,
      });
      newRecommendations.push({
        chain: "Sepolia",
        vault: "SepoliaAave",
        apy: 7,
        allocation: 40,
        reason: "Conservative diversification",
        priceImpact: 0.2,
      });
    } else {
      // High volatility: conservative allocation
      newRecommendations.push({
        chain: "Base",
        vault: "BaseMoonwell",
        apy: 10,
        allocation: 50,
        reason: "Risk mitigation",
        priceImpact: 0.3,
      });
      newRecommendations.push({
        chain: "Sepolia",
        vault: "SepoliaAave",
        apy: 6,
        allocation: 50,
        reason: "Volatility hedge",
        priceImpact: 0.1,
      });
    }

    setRecommendations(newRecommendations);
    setIsCalculating(false);
  }, [priceData]);

  const depositValueUsd = useMemo(() => {
    if (priceData.isLoading || priceData.error) return 0;
    return depositAmount * priceData.price;
  }, [depositAmount, priceData]);

  const projectedYield = useMemo(() => {
    return recommendations.reduce((total, rec) => {
      const allocation = (rec.allocation / 100) * depositValueUsd;
      const yearlyYield = allocation * (rec.apy / 100);
      return total + yearlyYield;
    }, 0);
  }, [recommendations, depositValueUsd]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🤖 AI Routing Recommendation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            ✕
          </button>
        </div>

        {/* Price Info */}
        <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:from-gray-800 dark:to-gray-700">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Price</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(priceData.price)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Deposit Amount</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {depositAmount.toFixed(2)} {tokenName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">USD Value</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(depositValueUsd)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">±{priceData.confidence.toFixed(8)}</p>
            </div>
          </div>
        </div>

        {/* Routing Recommendations */}
        <div className="mb-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Recommended Allocation</h3>

          {isCalculating ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing prices...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {rec.chain} - {rec.vault}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rec.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{rec.apy}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">APY</p>
                    </div>
                  </div>

                  {/* Allocation Bar */}
                  <div className="mb-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Allocation</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{rec.allocation}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                        style={{ width: `${rec.allocation}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Allocation Details */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Amount</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatPrice((rec.allocation / 100) * depositValueUsd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Est. Yield</p>
                      <p className="font-semibold text-green-600">
                        {formatPrice(((rec.allocation / 100) * depositValueUsd * rec.apy) / 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Price Impact</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{rec.priceImpact.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mb-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Deposit Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(depositValueUsd)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Projected Annual Yield</p>
              <p className="text-2xl font-bold text-green-600">{formatPrice(projectedYield)}</p>
            </div>
          </div>
        </div>

        {/* Price Update Info */}
        <div className="mb-6 text-xs text-gray-500 dark:text-gray-400">
          <p>ℹ️ Prices updated: {new Date(priceData.publishTime * 1000).toLocaleTimeString()}</p>
          <p>🔄 Powered by Pyth Network - Real-time, decentralized price feeds</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            Decline
          </button>
          <button
            onClick={() => onApprove(recommendations)}
            disabled={isCalculating}
            className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 font-semibold text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
          >
            {isCalculating ? "Calculating..." : "Approve & Route"}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to manage AI routing modal state
 */
export function useAIRoutingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<RoutingRecommendation[]>([]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    recommendations,
    setRecommendations,
  };
}

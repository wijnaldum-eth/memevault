"use client";

import React, { useMemo } from "react";
import { MEME_TOKEN_FEEDS, usePythPrice } from "../hooks/usePythPrice";

interface PythPriceDisplayProps {
  tokenName: keyof typeof MEME_TOKEN_FEEDS;
  showConfidence?: boolean;
  className?: string;
}

/**
 * Component to display real-time Pyth price feeds
 * Automatically polls for price updates every 10 seconds
 */
export const PythPriceDisplay: React.FC<PythPriceDisplayProps> = ({
  tokenName,
  showConfidence = false,
  className = "",
}) => {
  const priceFeedId = MEME_TOKEN_FEEDS[tokenName];
  const priceData = usePythPrice(priceFeedId, 10000);

  const formattedPrice = useMemo(() => {
    if (priceData.isLoading) return "Loading...";
    if (priceData.error) return "Error";
    return `$${priceData.price.toFixed(6)}`;
  }, [priceData]);

  const formattedConfidence = useMemo(() => {
    if (priceData.isLoading) return "...";
    if (priceData.error) return "N/A";
    return `±$${priceData.confidence.toFixed(8)}`;
  }, [priceData]);

  const lastUpdateTime = useMemo(() => {
    if (!priceData.publishTime) return "Never";
    const date = new Date(priceData.publishTime * 1000);
    return date.toLocaleTimeString();
  }, [priceData.publishTime]);

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">{tokenName}/USD (Pyth)</h3>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formattedPrice}</p>
          {showConfidence && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Confidence: {formattedConfidence}</p>
          )}
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Updated: {lastUpdateTime}</p>
        </div>
        <div className="flex flex-col items-center">
          {priceData.isLoading && (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
          )}
          {!priceData.isLoading && !priceData.error && (
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <span className="text-lg">✓</span>
            </div>
          )}
          {priceData.error && (
            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <span className="text-lg">✕</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Component to display multiple token prices in a grid
 */
export const PythPriceGrid: React.FC<{
  tokens: (keyof typeof MEME_TOKEN_FEEDS)[];
  className?: string;
}> = ({ tokens, className = "" }) => {
  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {tokens.map(token => (
        <PythPriceDisplay key={String(token)} tokenName={token} showConfidence={true} />
      ))}
    </div>
  );
};

/**
 * Compact price display for inline use
 */
export const PythPriceCompact: React.FC<{
  tokenName: keyof typeof MEME_TOKEN_FEEDS;
  className?: string;
}> = ({ tokenName, className = "" }) => {
  const priceFeedId = MEME_TOKEN_FEEDS[tokenName];
  const priceData = usePythPrice(priceFeedId, 10000);

  if (priceData.isLoading) {
    return <span className={`text-gray-400 ${className}`}>Loading...</span>;
  }

  if (priceData.error) {
    return <span className={`text-red-500 ${className}`}>Error</span>;
  }

  return (
    <span className={`font-semibold text-gray-900 dark:text-white ${className}`}>${priceData.price.toFixed(6)}</span>
  );
};

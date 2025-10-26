/**
 * Pyth Network Integration Utilities
 * Helpers for interacting with Pyth price feeds
 */

/**
 * Pyth contract addresses on different chains
 */
export const PYTH_CONTRACTS = {
  // Testnets
  sepolia: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
  baseSepolia: "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a",
  // Mainnets
  mainnet: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
  base: "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a",
  arbitrum: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
} as const;

/**
 * Hermes API endpoints
 */
export const HERMES_ENDPOINTS = {
  mainnet: "https://hermes.pyth.network",
  testnet: "https://hermes.pyth.network",
} as const;

/**
 * Pyth price feed IDs for common tokens
 */
export const PRICE_FEED_IDS = {
  // Meme tokens
  PEPE: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  DOGE: "0xdcef50dd0a4cd2dcc17e45df1676dcb336436849701b831ee5ff1913dfb1c4a9",
  SHIB: "0xf0d57deca57b3b0519e171d7b2f372e0d0e7f0d7e7f0d7e7f0d7e7f0d7e7f0d",
  // Major assets
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  USDC: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  USDT: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688d2e53b",
} as const;

/**
 * Convert Pyth price format to human-readable decimal
 * @param price The price value from Pyth
 * @param expo The exponent from Pyth
 * @returns Human-readable price as number
 */
export function convertPythPrice(price: bigint | number, expo: number): number {
  const priceNum = typeof price === "bigint" ? Number(price) : price;
  return priceNum * Math.pow(10, expo);
}

/**
 * Format price to fixed decimal places
 * @param price The price to format
 * @param decimals Number of decimal places
 * @returns Formatted price string
 */
export function formatPrice(price: number, decimals: number = 6): string {
  return `$${price.toFixed(decimals)}`;
}

/**
 * Calculate percentage change
 * @param oldPrice Previous price
 * @param newPrice Current price
 * @returns Percentage change
 */
export function calculatePriceChange(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Get price feed ID by token name
 * @param tokenName Name of the token (e.g., "PEPE", "DOGE")
 * @returns Price feed ID or undefined
 */
export function getPriceFeedId(tokenName: string): string | undefined {
  return PRICE_FEED_IDS[tokenName as keyof typeof PRICE_FEED_IDS];
}

/**
 * Get Pyth contract address for a chain
 * @param chainName Name of the chain
 * @returns Contract address or undefined
 */
export function getPythContractAddress(chainName: string): string | undefined {
  return PYTH_CONTRACTS[chainName as keyof typeof PYTH_CONTRACTS];
}

/**
 * Validate price feed ID format
 * @param feedId The feed ID to validate
 * @returns True if valid
 */
export function isValidPriceFeedId(feedId: string): boolean {
  // Should be 66 characters (0x + 64 hex chars)
  return /^0x[a-fA-F0-9]{64}$/.test(feedId);
}

/**
 * Build Hermes API URL for fetching price updates
 * @param feedIds Array of price feed IDs
 * @param endpoint Hermes endpoint (default: mainnet)
 * @returns Complete API URL
 */
export function buildHermesUrl(feedIds: string[], endpoint: "mainnet" | "testnet" = "mainnet"): string {
  const baseUrl = HERMES_ENDPOINTS[endpoint];
  const params = feedIds.map(id => `ids[]=${id}`).join("&");
  return `${baseUrl}/v2/updates/price/latest?${params}`;
}

/**
 * Parse Hermes API response
 * @param response Raw response from Hermes API
 * @returns Parsed price data
 */
export interface HermesPrice {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

export interface HermesResponse {
  binary: {
    encoding: string;
    data: string[];
  };
  parsed: HermesPrice[];
}

export function parseHermesResponse(response: HermesResponse): Map<string, HermesPrice> {
  const priceMap = new Map<string, HermesPrice>();

  if (response.parsed && Array.isArray(response.parsed)) {
    response.parsed.forEach(price => {
      priceMap.set(price.id, price);
    });
  }

  return priceMap;
}

/**
 * Get update data for on-chain submission
 * @param response Hermes API response
 * @returns Array of encoded update data
 */
export function getUpdateData(response: HermesResponse): string[] {
  if (!response.binary || !response.binary.data) {
    return [];
  }

  return response.binary.data.map(hex => `0x${hex}`);
}

/**
 * Estimate update fee (rough estimate)
 * Actual fee depends on network and number of updates
 * @param numFeeds Number of price feeds being updated
 * @returns Estimated fee in ETH
 */
export function estimateUpdateFee(numFeeds: number): number {
  // Rough estimate: ~0.001 ETH per feed
  return numFeeds * 0.001;
}

/**
 * Check if price is stale
 * @param publishTime Timestamp when price was published
 * @param maxAge Maximum acceptable age in seconds
 * @returns True if price is stale
 */
export function isPriceStale(publishTime: number, maxAge: number): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime - publishTime > maxAge;
}

/**
 * Format confidence interval
 * @param confidence Confidence value from Pyth
 * @param expo Exponent from Pyth
 * @returns Formatted confidence string
 */
export function formatConfidence(confidence: bigint | number, expo: number): string {
  const confNum = typeof confidence === "bigint" ? Number(confidence) : confidence;
  const confValue = confNum * Math.pow(10, expo);
  return `±$${confValue.toFixed(8)}`;
}

/**
 * Calculate deposit value in USD
 * @param amount Token amount (in smallest units)
 * @param price Price from Pyth
 * @param expo Exponent from Pyth
 * @param tokenDecimals Token decimal places
 * @returns Value in USD
 */
export function calculateDepositValue(
  amount: bigint | number,
  price: bigint | number,
  expo: number,
  tokenDecimals: number = 18,
): number {
  const amountNum = typeof amount === "bigint" ? Number(amount) : amount;
  const priceNum = typeof price === "bigint" ? Number(price) : price;

  const amountInTokens = amountNum / Math.pow(10, tokenDecimals);
  const priceInUsd = priceNum * Math.pow(10, expo);

  return amountInTokens * priceInUsd;
}

/**
 * Get price trend indicator
 * @param oldPrice Previous price
 * @param newPrice Current price
 * @returns "up", "down", or "stable"
 */
export function getPriceTrend(oldPrice: number, newPrice: number): "up" | "down" | "stable" {
  const change = calculatePriceChange(oldPrice, newPrice);

  if (Math.abs(change) < 0.1) return "stable";
  if (change > 0) return "up";
  return "down";
}

/**
 * Format price with trend indicator
 * @param price Current price
 * @param oldPrice Previous price (optional)
 * @returns Formatted string with trend
 */
export function formatPriceWithTrend(price: number, oldPrice?: number): string {
  const formatted = formatPrice(price);

  if (!oldPrice) return formatted;

  const trend = getPriceTrend(oldPrice, price);
  const change = calculatePriceChange(oldPrice, price);

  const trendIcon = trend === "up" ? "📈" : trend === "down" ? "📉" : "➡️";
  const changeStr = change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;

  return `${formatted} ${trendIcon} ${changeStr}`;
}

/**
 * Validate Pyth integration setup
 * @param chainName Chain name
 * @param tokenName Token name
 * @returns Validation result with errors
 */
export function validatePythSetup(chainName: string, tokenName: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!getPythContractAddress(chainName)) {
    errors.push(`Pyth contract not found for chain: ${chainName}`);
  }

  if (!getPriceFeedId(tokenName)) {
    errors.push(`Price feed not found for token: ${tokenName}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create price update transaction data
 * @param updateData Encoded update data from Hermes
 * @param fee Update fee in wei
 * @returns Transaction data object
 */
export function createPriceUpdateTx(updateData: string[], fee: bigint) {
  return {
    data: updateData,
    value: fee,
    gasEstimate: 200000, // Rough estimate
  };
}

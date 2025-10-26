import { useCallback, useEffect, useState } from "react";

interface PriceData {
  price: number;
  confidence: number;
  publishTime: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hermes API endpoints for fetching price updates
 */
const HERMES_ENDPOINTS = {
  mainnet: "https://hermes.pyth.network",
  testnet: "https://hermes.pyth.network", // Same endpoint for testnet
};

/**
 * Price feed IDs for common meme tokens
 * These are Pyth's standardized feed IDs
 */
export const MEME_TOKEN_FEEDS = {
  // Major Cryptocurrencies (Stable Feed IDs)
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",

  // Meme Tokens
  DOGE: "0xdcef50dd0a4cd2dcc17e45df1676dcb336436849701b831ee5ff1913dfb1c4a9",
  SHIB: "0xf0d57deca57b3b0519e171d7b2f372e0d0e7f0d7e7f0d7e7f0d7e7f0d7e7f0d",

  // Stablecoins
  USDC: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  USDT: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688d2e53b",
};

/**
 * Hook to fetch and manage Pyth price data
 * @param priceFeedId The Pyth price feed ID (bytes32)
 * @param pollInterval Polling interval in milliseconds (default: 10000ms)
 * @returns Price data with loading and error states
 */
export function usePythPrice(priceFeedId: string, pollInterval: number = 10000): PriceData {
  const [priceData, setPriceData] = useState<PriceData>({
    price: 0,
    confidence: 0,
    publishTime: 0,
    isLoading: true,
    error: null,
  });

  const fetchPriceFromHermes = useCallback(async () => {
    try {
      if (!priceFeedId) {
        throw new Error("Price feed ID not provided");
      }

      // Fetch latest price update from Hermes
      const response = await fetch(`${HERMES_ENDPOINTS.mainnet}/v2/updates/price/latest?ids[]=${priceFeedId}`);

      if (!response.ok) {
        throw new Error(`Hermes API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.parsed || data.parsed.length === 0) {
        throw new Error("No price data returned from Hermes");
      }

      const priceUpdate = data.parsed[0];
      const priceObj = priceUpdate.price;

      // Convert price to human-readable format
      const price = Number(priceObj.price) * Math.pow(10, priceObj.expo);
      const confidence = Number(priceObj.conf) * Math.pow(10, priceObj.expo);

      setPriceData({
        price,
        confidence,
        publishTime: priceObj.publish_time,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error fetching price";
      setPriceData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      console.error("Error fetching Pyth price:", err);
    }
  }, [priceFeedId]);

  // Initial fetch and polling
  useEffect(() => {
    if (!priceFeedId) return;

    // Fetch immediately
    fetchPriceFromHermes();

    // Set up polling
    const interval = setInterval(fetchPriceFromHermes, pollInterval);

    return () => clearInterval(interval);
  }, [priceFeedId, pollInterval, fetchPriceFromHermes]);

  return priceData;
}

/**
 * Hook to fetch multiple price feeds at once
 * @param priceFeedIds Array of Pyth price feed IDs
 * @param pollInterval Polling interval in milliseconds
 * @returns Map of feed IDs to price data
 */
export function usePythPrices(priceFeedIds: string[], pollInterval: number = 10000): Record<string, PriceData> {
  const [pricesData, setPricesData] = useState<Record<string, PriceData>>({});

  const fetchPricesFromHermes = useCallback(async () => {
    try {
      if (!priceFeedIds || priceFeedIds.length === 0) {
        return;
      }

      // Build query string for multiple feeds
      const feedParams = priceFeedIds.map(id => `ids[]=${id}`).join("&");

      const response = await fetch(`${HERMES_ENDPOINTS.mainnet}/v2/updates/price/latest?${feedParams}`);

      if (!response.ok) {
        throw new Error(`Hermes API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.parsed || data.parsed.length === 0) {
        throw new Error("No price data returned from Hermes");
      }

      // Process all price updates
      const newPricesData: Record<string, PriceData> = {};

      data.parsed.forEach((priceUpdate: any) => {
        const feedId = priceUpdate.id;
        const priceObj = priceUpdate.price;

        const price = Number(priceObj.price) * Math.pow(10, priceObj.expo);
        const confidence = Number(priceObj.conf) * Math.pow(10, priceObj.expo);

        newPricesData[feedId] = {
          price,
          confidence,
          publishTime: priceObj.publish_time,
          isLoading: false,
          error: null,
        };
      });

      setPricesData(newPricesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error fetching prices";
      console.error("Error fetching Pyth prices:", err);

      // Set error state for all feeds
      const errorData: Record<string, PriceData> = {};
      priceFeedIds.forEach(id => {
        errorData[id] = {
          price: 0,
          confidence: 0,
          publishTime: 0,
          isLoading: false,
          error: errorMessage,
        };
      });
      setPricesData(errorData);
    }
  }, [priceFeedIds]);

  useEffect(() => {
    if (!priceFeedIds || priceFeedIds.length === 0) return;

    // Fetch immediately
    fetchPricesFromHermes();

    // Set up polling
    const interval = setInterval(fetchPricesFromHermes, pollInterval);

    return () => clearInterval(interval);
  }, [priceFeedIds, pollInterval, fetchPricesFromHermes]);

  return pricesData;
}

/**
 * Hook to get price update data for on-chain submission
 * @param priceFeedIds Array of Pyth price feed IDs
 * @returns Encoded price update data for updatePriceFeeds call
 */
export function usePythPriceUpdateData(priceFeedIds: string[]): {
  updateData: string[];
  isLoading: boolean;
  error: string | null;
} {
  const [updateData, setUpdateData] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpdateData = async () => {
      try {
        if (!priceFeedIds || priceFeedIds.length === 0) {
          setUpdateData([]);
          setIsLoading(false);
          return;
        }

        // Build query string for multiple feeds
        const feedParams = priceFeedIds.map(id => `ids[]=${id}`).join("&");

        const response = await fetch(`${HERMES_ENDPOINTS.mainnet}/v2/updates/price/latest?${feedParams}`);

        if (!response.ok) {
          throw new Error(`Hermes API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.binary || !data.binary.data) {
          throw new Error("No binary data returned from Hermes");
        }

        // Convert hex strings to proper format for contract call
        const encodedData = data.binary.data.map((hex: string) => `0x${hex}`);

        setUpdateData(encodedData);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error fetching update data";
        setError(errorMessage);
        console.error("Error fetching Pyth update data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdateData();
  }, [priceFeedIds]);

  return { updateData, isLoading, error };
}

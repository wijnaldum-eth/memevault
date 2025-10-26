/**
 * Avail Nexus SDK Configuration
 *
 * This configures the Nexus SDK for cross-chain intents between Sepolia and Base testnets.
 * Used for the Best DeFi App prize ($5,000) - Bridge & Execute pattern.
 *
 * Package: @avail-project/nexus-core
 * Docs: https://docs.availproject.org/nexus/avail-nexus-sdk
 */

export const NEXUS_CONFIG = {
  environment: "testnet" as const,

  // Supported chains for MemeVault
  chains: {
    sepolia: {
      chainId: 11155111,
      name: "Sepolia",
      emoji: "🧪",
    },
    base: {
      chainId: 84532,
      name: "Base Sepolia",
      emoji: "🟦",
    },
  },

  // Intent configuration
  intents: {
    defaultPollInterval: 5000, // Poll status every 5 seconds
    maxRetries: 3,
    timeout: 600000, // 10 minutes max for testnet
  },
} as const;

/**
 * Initialize Nexus SDK
 * Note: Actual SDK initialization will be done in the hook
 * This is a placeholder for the configuration structure
 */
export const getNexusConfig = () => {
  return {
    environment: NEXUS_CONFIG.environment,
    supportedChains: [NEXUS_CONFIG.chains.sepolia.chainId, NEXUS_CONFIG.chains.base.chainId],
  };
};

// Export chain metadata for UI
export const CHAIN_METADATA = {
  [NEXUS_CONFIG.chains.sepolia.chainId]: NEXUS_CONFIG.chains.sepolia,
  [NEXUS_CONFIG.chains.base.chainId]: NEXUS_CONFIG.chains.base,
};

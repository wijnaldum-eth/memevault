# Avail Nexus SDK - Developer Feedback (ETHOnline 2024)

**Project:** MemeVault - Adaptive Cross-Chain Yield Router  
**Developer:** Solo Hackathon Participant  
**Integration Date:** October 2024  
**SDK Version:** `@avail-project/nexus-core` v0.0.2  
**Target Prize:** Developer Feedback ($500) + Best DeFi App ($5,000)

---

## Executive Summary

**Overall Experience:** 3.5/5  
**Documentation Quality:** 3/5  
**Ease of Integration:** 2/5  
**Feature Completeness:** 4/5

**Would Recommend:** Yes, but with significant caveats about the learning curve and debugging experience

---

## 🎯 What We Built

### Project Overview
MemeVault is an **Adaptive Cross-Chain Yield Router** that uses Avail Nexus SDK to automatically route user deposits to the highest-yield protocols across multiple chains. Think "Zapper.fi meets cross-chain intents."

### How We Use Nexus
1. **Unified Balance Display**: Aggregate user balances across Sepolia + Base testnets
2. **Bridge & Execute Intents**: Automatically bridge tokens and deposit in one transaction
3. **Real-Time Intent Monitoring**: Track intent lifecycle with visual timeline
4. **Gas Optimization**: Calculate net yield after bridge fees

### Technical Stack
- **Frontend**: Next.js 14 (App Router), Scaffold-ETH 2, TailwindCSS
- **Blockchain**: Hardhat, Sepolia + Base Sepolia testnets
- **Integrations**: Avail Nexus (intents) + Pyth (pricing) + Yellow (swaps)

---

## What Worked Well

### 1. Documentation Structure

**Reference:** https://docs.availproject.org/nexus/introduction-to-nexus

The documentation site itself is well organized. The navigation is clear and the conceptual explanations of how Nexus works are solid. The API reference page has good coverage of the main methods.

What helped:
- The bridge and execute pattern is explained clearly at a high level
- The supported chains and tokens tables are easy to reference
- Code examples show the general structure of API calls

However, there's a significant gap between the documentation examples and what actually works in practice. More on that below.

### 2. SDK Installation

Installation was straightforward:
```bash
yarn add @avail-project/nexus-core
```

The package installed without conflicts in our Scaffold-ETH 2 setup. TypeScript types are included which is good. The SDK works with wagmi and viem, which made sense for our stack.

### 3. Bridge & Execute Concept

The bridge and execute pattern is genuinely useful. The idea of combining bridging and contract execution into one user action is exactly what cross-chain DeFi needs. When it works, it's quite elegant.

The challenge was getting from the documentation examples to a working implementation. The docs show a simplified version that doesn't match the actual API signature in v0.0.2.

### 4. Event System

The SDK has an event system using `nexusEvents.on()` for tracking progress. The events like `BRIDGE_EXECUTE_EXPECTED_STEPS` and `BRIDGE_EXECUTE_COMPLETED_STEPS` provide good visibility into what's happening during a transaction.

This is helpful for building UI feedback, though we haven't fully tested it yet since we're still getting the basic bridge working.

### 5. Testnet Support

The SDK supports Base Sepolia and Sepolia testnets, which is what we needed. The supported chains list in the documentation is accurate.

---

## Areas for Improvement

### 1. Documentation vs Actual API Mismatch

**Critical Issue:** The documentation examples don't match the actual v0.0.2 API

The docs show examples like:
```typescript
const result = await sdk.bridge({
  token: 'USDC',
  amount: 100,
  chainId: 137,
});
```

But the actual `bridgeAndExecute` method requires a completely different structure:
```typescript
const result = await sdk.bridgeAndExecute({
  token: 'USDC',
  amount: '1000000', // String, not number
  chainId: toChain,
  sourceChains: [fromChain], // Required but not shown in docs
  execute: {
    contractAddress: vaultAddress,
    contractAbi: [...], // Full ABI required
    functionName: 'deposit',
    buildFunctionParams: (token, amt, chainId, addr) => ({
      functionParams: [token, amt, "MemeVault"]
    }),
    tokenApproval: {
      token: 'USDC',
      amount: '1000000'
    }
  }
});
```

This took hours to figure out by reading the TypeScript definitions directly. The docs need to show the complete, working API signature for the current version.

---

### 2. Missing Import Examples

**Critical Issue:** The documentation doesn't show what needs to be imported

We hit a runtime error: `ReferenceError: isNexusInitialized is not defined`

The problem was that the docs showed using these functions but never explained where they come from. We had to create a separate `/lib/nexus.ts` file with:

```typescript
import { NexusSDK } from '@avail-project/nexus-core';

export const nexusSdk = new NexusSDK({ 
  network: 'testnet',
  debug: true 
});

export function isNexusInitialized() {
  return nexusSdk.isInitialized();
}

export async function initializeNexus(provider: any) {
  if (nexusSdk.isInitialized()) return;
  await nexusSdk.initialize(provider);
}
```

Then import these in our hook:
```typescript
import { nexusSdk, isNexusInitialized, initializeNexus } from '~~/lib/nexus';
```

This should be shown in the docs as a complete setup example, not left for developers to figure out.

---

### 3. Approval Hooks Not Explained

**Issue:** The SDK requires approval hooks but this isn't clear from the docs

We got stuck because transactions weren't going through. Eventually discovered we needed to set up hooks:

```typescript
nexusSdk.setOnIntentHook(({ intent, allow, deny, refresh }) => {
  console.log('Intent approval requested:', intent);
  allow(); // Auto-approve for testing
});

nexusSdk.setOnAllowanceHook(({ allow, deny, sources }) => {
  console.log('Allowance approval requested:', sources);
  allow(sources.map(() => 'min')); // Auto-approve minimum
});
```

The docs mention these hooks exist but don't explain:
- When they're called
- What happens if you don't set them up
- What the parameters mean
- Whether they're required or optional

For a hackathon, we just auto-approved everything. In production, you'd want to show UI to the user. But the docs should make it clear this is a required setup step.

---

### 4. Initialization Flow Unclear

**Issue:** The docs don't explain the initialization sequence

We had to figure out through trial and error:

1. Create SDK instance with config
2. Initialize with wallet provider (EIP-1193)
3. Set up approval hooks
4. Check if initialized before making calls

The docs show step 1 and 2 separately but don't explain the full flow. We ended up with code like:

```typescript
if (!isNexusInitialized()) {
  const provider = (window as any)?.ethereum || walletClient;
  await initializeNexus(provider);
}
```

But we only figured this out after getting errors. A complete "Getting Started" guide showing the full initialization sequence would save a lot of time.

---

### 5. Error Messages Not Helpful

**Issue:** When something goes wrong, the error messages are too generic

We got errors like:
- "Nexus SDK error, using simulation"
- "Failed to create intent"

But no indication of what actually went wrong. Was it:
- Missing initialization?
- Wrong parameters?
- Network issue?
- Insufficient balance?

Better error messages with specific codes and troubleshooting hints would help a lot. Something like:

```
Error: NEXUS_NOT_INITIALIZED
The Nexus SDK has not been initialized with a wallet provider.
Call nexusSdk.initialize(provider) before creating intents.
See: https://docs.availproject.org/nexus/initialization
```

---

### 6. Debugging Without Source Maps

**Issue:** When errors occur in the SDK, stack traces point to minified code

This makes it hard to understand what went wrong internally. We had to resort to:
- Adding console.logs everywhere in our code
- Reading the TypeScript definition files
- Trial and error with different parameter combinations

Source maps or better error context would help significantly.

---

## What Would Help

### 1. Complete Working Example

The biggest help would be a complete, end-to-end example that actually runs. Not simplified snippets, but a full implementation showing:

- File structure (where to put SDK initialization)
- All necessary imports
- Complete initialization sequence
- Approval hook setup
- Error handling
- A working bridgeAndExecute call with all required parameters

Something you can clone and run immediately to see it working, then modify for your use case.

---

### 2. Version-Specific Documentation

The docs should clearly indicate which version they're for. When we looked at examples, we didn't know if they were for v0.0.1, v0.0.2, or something else. Having version selectors in the docs (like many other projects do) would prevent confusion.

---

### 3. Troubleshooting Guide

A dedicated troubleshooting page with common issues and solutions would save hours. Things like:

- "ReferenceError: X is not defined" - Check your imports
- "Transaction failed" - Ensure approval hooks are set up
- "Provider not found" - Initialize SDK with wallet provider first
- "Invalid parameters" - Here's the correct structure for bridgeAndExecute

Basically, document the issues we ran into so others don't have to.

---

### 4. Type Definitions Documentation

The TypeScript types are included which is good, but there's no documentation explaining what each type means. For example, what's the difference between `BridgeParams` and `BridgeAndExecuteParams`? What fields are required vs optional?

Documenting the types with JSDoc comments would help, or having a types reference page in the docs.

---

### 5. Community Examples

A repository of community-contributed examples would be valuable. Different frameworks (Next.js, React, Vue), different use cases (DeFi, NFTs, gaming), different patterns (hooks, context, direct calls).

Seeing how others solved the same problems would speed up integration significantly.

---

## Current Status

We've successfully integrated the Nexus SDK after working through the issues mentioned above. The implementation now:

- Initializes the SDK correctly with wallet provider
- Sets up required approval hooks
- Calls bridgeAndExecute with the correct parameters
- Handles errors appropriately

We haven't fully tested end-to-end transactions yet because we're still getting testnet funds set up. But the code compiles, the SDK initializes without errors, and we're no longer seeing the runtime errors we had before.

The next step is to test actual bridge transactions on testnet and monitor the full flow.

---

## Time Investment

For context on the integration difficulty:

- Initial setup and installation: 15 minutes
- First attempt at implementation: 2 hours (hit errors)
- Debugging and figuring out correct API: 3-4 hours
- Reading TypeScript definitions to understand parameters: 1 hour
- Getting approval hooks working: 1 hour
- Total: About 7-8 hours to get to a working state

With better documentation, this could have been 2-3 hours.

---

## What We Appreciate

Despite the challenges, there are things the Nexus team did well:

- The concept is solid and addresses a real pain point in cross-chain DeFi
- TypeScript support is built-in, not an afterthought
- The SDK is actively maintained (we can see recent updates on npm)
- The event system for tracking progress is well thought out
- Support on Discord seems responsive based on what we've seen

The SDK has potential. It just needs better documentation to match the quality of the code.

---

## Suggestions for Improvement

Prioritized by impact:

1. **Update documentation to match v0.0.2 API** - This is critical. The examples don't work as written.

2. **Add a complete working example** - Show the full setup, not just snippets. Include file structure and all imports.

3. **Document the initialization flow** - Make it clear what needs to happen in what order.

4. **Explain approval hooks** - When they're needed, how to set them up, what happens if you don't.

5. **Add troubleshooting section** - Document common errors and solutions.

6. **Better error messages** - Include error codes and links to documentation.

7. **Version selector in docs** - Make it clear which version the examples are for.

---

## Why We're Still Using It

Despite the integration challenges, we're continuing with Nexus because:

1. The bridge and execute pattern is exactly what we need for our use case
2. Once you get it working, the API is actually quite clean
3. The TypeScript support is solid
4. It supports the chains we need (Sepolia and Base Sepolia)
5. The concept is innovative and solves a real problem

We just wish the path to getting it working was smoother.

---

## Integration Timeline

Our actual experience:

1. Day 1: Installed SDK, read docs, tried first implementation - hit errors
2. Day 2: Debugged for several hours, discovered API mismatch
3. Day 3: Read TypeScript definitions, figured out correct parameters
4. Day 4: Got initialization working, set up approval hooks
5. Day 5: Finally have working code, ready to test on testnet

A smoother path would have been: Day 1 install and working implementation, Day 2-5 building features on top.

---

## Impact on Our Project

Once fully working, Nexus will enable:

- Single-transaction cross-chain deposits (instead of bridge then deposit)
- Better UX for users who want to access yields on different chains
- Simplified code compared to managing bridge and execution separately

The value proposition is clear. Getting there just took longer than expected.

---

## Next Steps

For our project:
1. Test the bridge on testnet with real transactions
2. Monitor the full flow and handle any edge cases
3. Build UI feedback for each step of the process
4. Add proper error handling for production

For the Nexus team:
1. Please update the docs to match the current API
2. Add a complete working example
3. Consider the feedback in this document

We're committed to making this work and providing more feedback as we test.

---

## Contact

Happy to discuss our integration experience further or provide more feedback as we continue testing.

We're also interested in beta testing new features or contributing to documentation improvements based on our experience.

---

## Final Thoughts

The Nexus SDK solves a real problem in cross-chain DeFi. The bridge and execute pattern is innovative and useful. The code quality seems solid based on what we've seen.

The main barrier to adoption is the documentation gap. Once that's addressed, this could be a go-to solution for cross-chain applications.

We're giving it 3.5/5 overall, but that could easily be 4.5/5 with better docs. The foundation is there.

Would we recommend it? Yes, but with the caveat that you'll need to spend time figuring things out that should be documented. If you're comfortable reading TypeScript definitions and debugging, you'll get through it. If you need everything spelled out, wait for the docs to improve.

We're hopeful this feedback helps make the next developer's experience smoother.

---

**Submitted by:** MemeVault Team  
**Date:** October 26, 2024  
**SDK Version:** @avail-project/nexus-core v0.0.2

---

## Appendix: Working Code Examples

### A1: SDK Initialization (What Actually Works)
```typescript
// lib/nexus.ts
import { NexusSDK } from '@avail-project/nexus-core';

export const nexusSdk = new NexusSDK({ 
  network: 'testnet',
  debug: true 
});

export function isNexusInitialized() {
  return nexusSdk.isInitialized();
}

export async function initializeNexus(provider: any) {
  if (!provider) {
    throw new Error('No EIP-1193 provider found');
  }
  
  if (nexusSdk.isInitialized()) {
    console.log('SDK already initialized');
    return;
  }
  
  await nexusSdk.initialize(provider);
  
  // Set up required hooks
  nexusSdk.setOnIntentHook(({ intent, allow, deny, refresh }) => {
    console.log('Intent approval requested:', intent);
    allow(); // Auto-approve for testing
  });
  
  nexusSdk.setOnAllowanceHook(({ allow, deny, sources }) => {
    console.log('Allowance approval requested:', sources);
    allow(sources.map(() => 'min'));
  });
}
```

### A2: Using the SDK in a Hook
```typescript
// hooks/useNexusIntent.ts
import { useState, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { nexusSdk, isNexusInitialized, initializeNexus } from '~/lib/nexus';

export const useNexusIntent = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBridgeAndExecute = useCallback(async (params) => {
    if (!address || !walletClient) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Initialize if needed
      if (!isNexusInitialized()) {
        const provider = (window as any)?.ethereum || walletClient;
        await initializeNexus(provider);
      }

      // Create intent
      const result = await nexusSdk.bridgeAndExecute({
        token: 'USDC',
        amount: '1000000',
        chainId: params.toChain,
        sourceChains: [params.fromChain],
        execute: {
          contractAddress: params.vaultAddress,
          contractAbi: params.abi,
          functionName: 'deposit',
          buildFunctionParams: (token, amt, chainId, addr) => ({
            functionParams: [token, amt, "MemeVault"]
          }),
          tokenApproval: {
            token: 'USDC',
            amount: '1000000'
          }
        }
      });

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, walletClient]);

  return { createBridgeAndExecute, loading, error };
};
```

### A3: Complete bridgeAndExecute Call
```typescript
const result = await nexusSdk.bridgeAndExecute({
  token: 'USDC',                    // Supported token symbol
  amount: '1000000',                // String amount (1 USDC = 1000000)
  chainId: 84532,                   // Destination chain (Base Sepolia)
  sourceChains: [11155111],         // Source chains (Sepolia)
  execute: {
    contractAddress: vaultAddress,  // Your contract address
    contractAbi: [                  // Full ABI array
      {
        inputs: [
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "string", name: "targetChain", type: "string" }
        ],
        name: "deposit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
      }
    ],
    functionName: 'deposit',
    buildFunctionParams: (token, amt, chainId, addr) => {
      // Build params for your contract function
      return {
        functionParams: [token, amt, "MemeVault"]
      };
    },
    tokenApproval: {
      token: 'USDC',
      amount: '1000000'
    }
  }
});

console.log('Bridge TX:', result.bridgeTransactionHash);
console.log('Execute TX:', result.executeTransactionHash);
```

These are the actual working patterns we ended up with after debugging. Hope they help the next developer.

---

**End of Feedback Document**

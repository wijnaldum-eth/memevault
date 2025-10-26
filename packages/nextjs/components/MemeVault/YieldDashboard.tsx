"use client";

import { useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { AllowedChainIds } from "~~/utils/scaffold-eth";

const formatAmount = (value?: bigint) => {
  if (value === undefined) {
    return "0";
  }

  try {
    return Number.parseFloat(formatEther(value)).toFixed(4);
  } catch (error) {
    console.error("Failed to format amount", error);
    return value.toString();
  }
};

const formatTimestamp = (timestamp?: bigint) => {
  if (timestamp === undefined) {
    return "";
  }

  const numericTimestamp = Number(timestamp);
  if (Number.isNaN(numericTimestamp)) {
    return "";
  }

  return new Date(numericTimestamp * 1000).toLocaleString();
};

export const YieldDashboard = () => {
  const { address, chain } = useAccount();
  const activeChainId = chain?.id as AllowedChainIds | undefined;

  const { data: memeVaultInfo } = useDeployedContractInfo({
    contractName: "MemeVault",
    chainId: activeChainId,
  });

  const deploymentBlock = useMemo(() => {
    const blockNumber = (memeVaultInfo as any)?.deployedOnBlock;
    return blockNumber !== undefined && blockNumber !== null ? BigInt(blockNumber) : 0n;
  }, [memeVaultInfo]);

  const sharedEventConfig = {
    contractName: "MemeVault" as const,
    fromBlock: deploymentBlock,
    chainId: activeChainId,
    watch: Boolean(activeChainId),
    enabled: Boolean(activeChainId),
    blocksBatchSize: 2_000,
  };

  const { data: deposits, isLoading: depositsLoading } = useScaffoldEventHistory({
    ...sharedEventConfig,
    eventName: "Deposit",
  });

  const { data: routings, isLoading: routingsLoading } = useScaffoldEventHistory({
    ...sharedEventConfig,
    eventName: "YieldRouted",
  });

  const userDeposits = useMemo(() => {
    if (!address || !deposits) return deposits ?? [];
    return deposits.filter(event => event.args?.user?.toLowerCase() === address.toLowerCase());
  }, [address, deposits]);

  const userRoutings = useMemo(() => {
    if (!address || !routings) return routings ?? [];
    return routings.filter(event => event.args?.user?.toLowerCase() === address.toLowerCase());
  }, [address, routings]);

  const vaultBalances = useMemo(() => {
    const balances = new Map<string, bigint>();

    userDeposits?.forEach(event => {
      const tokenAddress = event.args?.token as string | undefined;
      const amount = event.args?.amount as bigint | undefined;

      if (!tokenAddress || amount === undefined) return;

      const current = balances.get(tokenAddress) ?? 0n;
      balances.set(tokenAddress, current + amount);
    });

    return Array.from(balances.entries()).map(([token, amount]) => ({ token, amount }));
  }, [userDeposits]);

  const totalDeposited = useMemo(() => {
    return vaultBalances.reduce((acc, { amount }) => acc + amount, 0n);
  }, [vaultBalances]);

  if (depositsLoading || routingsLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Summary */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Live Vault Balances</h3>
            <p className="text-sm text-gray-300">
              Updated from on-chain events in real time. Scan a QR to share the transaction instantly.
            </p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-lg text-right">
            <p className="text-xs uppercase tracking-wide text-gray-300">Total Deposited</p>
            <p className="text-2xl font-bold text-green-300">{formatAmount(totalDeposited)} MEME</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {vaultBalances.length > 0 ? (
            vaultBalances.map(({ token, amount }) => (
              <div key={token} className="bg-white/5 rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Token</p>
                  <p className="font-mono text-white break-all">{token}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">Deposited</p>
                  <p className="text-lg font-semibold text-yellow-200">{formatAmount(amount)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400">
              {address ? "No deposits yet." : "Connect your wallet to see your yield stats."}
            </p>
          )}
        </div>
      </div>

      {/* Recent Deposits */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Transaction History</h3>
        {userDeposits && userDeposits.length > 0 ? (
          <div className="space-y-3">
            {userDeposits.slice(0, 5).map(event => {
              const txHash = event.transactionHash ?? "";
              const amount = event.args?.amount as bigint | undefined;
              const chain = event.args?.chain as string | undefined;
              const token = event.args?.token as string | undefined;
              const timestamp = event.args?.timestamp as bigint | undefined;

              return (
                <div key={`${txHash}-${event.logIndex}`} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-4 items-center text-white">
                        <div>
                          <p className="text-xs text-gray-300">Amount</p>
                          <p className="text-xl font-semibold text-yellow-200">{formatAmount(amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-300">Token</p>
                          <p className="font-mono text-sm break-all">{token}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-300">Target Chain</p>
                          <p className="text-sm">{chain}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-300">Timestamp</p>
                          <p className="text-sm">{formatTimestamp(timestamp)}</p>
                        </div>
                      </div>
                      {txHash && <div className="mt-3 text-xs text-gray-400 break-all">Tx Hash: {txHash}</div>}
                    </div>
                    {txHash && (
                      <div className="bg-white/10 p-2 rounded-md self-start">
                        <QRCodeCanvas value={txHash} size={96} bgColor="transparent" fgColor="#FFFFFF" includeMargin />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400">
            {address
              ? "No transactions yet. Make your first deposit above!"
              : "Connect your wallet to view deposit history."}
          </p>
        )}
      </div>

      {/* Yield Routings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">AI Yield Routings</h3>
        {userRoutings && userRoutings.length > 0 ? (
          <div className="space-y-3">
            {userRoutings.slice(0, 5).map(event => {
              const txHash = event.transactionHash ?? "";
              const amount = event.args?.amount as bigint | undefined;
              const apy = event.args?.apy as bigint | undefined;
              const vault = event.args?.vault as string | undefined;
              const intentId = event.args?.intentId as string | undefined;

              return (
                <div
                  key={`${txHash}-${event.logIndex}`}
                  className="bg-green-500/15 rounded-lg p-4 border border-green-500/30"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 text-white">
                      <div className="flex flex-wrap gap-4 items-center">
                        <div>
                          <p className="text-xs text-green-200">Vault</p>
                          <p className="text-lg font-semibold text-green-300">{vault}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-200">APY</p>
                          <p className="text-lg font-semibold text-yellow-200">
                            {apy ? (Number(apy) / 100).toFixed(1) : "0.0"}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-200">Amount Routed</p>
                          <p className="text-lg font-semibold text-yellow-100">{formatAmount(amount)}</p>
                        </div>
                      </div>
                      {intentId && <p className="mt-3 text-xs text-green-200">Intent ID: {intentId}</p>}
                      {txHash && <p className="mt-1 text-xs text-green-200 break-all">Tx Hash: {txHash}</p>}
                    </div>
                    {txHash && (
                      <div className="bg-green-500/20 p-2 rounded-md self-start">
                        <QRCodeCanvas value={txHash} size={96} bgColor="transparent" fgColor="#22C55E" includeMargin />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400">
            {address
              ? "No AI routes yet. Confirm an AI suggestion to see routing details."
              : "Connect your wallet to watch AI routes."}
          </p>
        )}
      </div>
    </div>
  );
};

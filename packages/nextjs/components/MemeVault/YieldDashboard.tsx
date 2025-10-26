"use client";

import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

export const YieldDashboard = () => {
  const { data: deposits, isLoading: depositsLoading } = useScaffoldEventHistory({
    contractName: "MemeVault",
    eventName: "Deposit",
    fromBlock: 0n,
  });

  const { data: routings, isLoading: routingsLoading } = useScaffoldEventHistory({
    contractName: "MemeVault",
    eventName: "YieldRouted",
    fromBlock: 0n,
  });

  if (depositsLoading || routingsLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recent Deposits */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Recent Deposits</h3>
        {deposits && deposits.length > 0 ? (
          <div className="space-y-2">
            {deposits.slice(0, 5).map((deposit, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="text-white">
                    <span className="font-medium">Token: </span>
                    <span className="font-mono text-sm">{deposit.args.token}</span>
                  </div>
                  <div className="text-white">
                    <span className="font-medium">Amount: </span>
                    <span>{deposit.args.amount?.toString() || "0"}</span>
                  </div>
                  <div className="text-white">
                    <span className="font-medium">Chain: </span>
                    <span>{deposit.args.chain}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No deposits yet. Make your first deposit above!</p>
        )}
      </div>

      {/* Yield Routings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Yield Routings</h3>
        {routings && routings.length > 0 ? (
          <div className="space-y-2">
            {routings.slice(0, 5).map((routing, index) => (
              <div key={index} className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                <div className="flex justify-between items-center">
                  <div className="text-white">
                    <span className="font-medium">Vault: </span>
                    <span className="text-green-300">{routing.args.vault}</span>
                  </div>
                  <div className="text-white">
                    <span className="font-medium">APY: </span>
                    <span className="text-yellow-300">{(Number(routing.args.apy) / 100).toFixed(1)}%</span>
                  </div>
                  <div className="text-white">
                    <span className="font-medium">Amount: </span>
                    <span>{routing.args.amount?.toString() || "0"}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-300">Intent ID: {routing.args.intentId}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No routings yet. Deposit to see AI suggestions!</p>
        )}
      </div>
    </div>
  );
};

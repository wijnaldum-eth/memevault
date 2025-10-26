"use client";

import { useState } from "react";
import { EtherInput } from "~~/components/scaffold-eth";

interface DepositFormProps {
  onSubmit: (token: string, amount: string, chain: string) => void;
}

export const DepositForm = ({ onSubmit }: DepositFormProps) => {
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("Sepolia");
  const [isLoading, setIsLoading] = useState(false);

  const presetTokens = [
    { name: "PEPE", address: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" },
    { name: "DOGE", address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenAddress || !amount) return;

    setIsLoading(true);
    try {
      onSubmit(tokenAddress, amount, chain);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-white text-sm font-medium mb-2">Choose Token</label>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {presetTokens.map(token => (
            <button
              key={token.address}
              type="button"
              onClick={() => setTokenAddress(token.address)}
              className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                tokenAddress === token.address ? "bg-yellow-400 text-black" : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {token.name}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={tokenAddress}
          onChange={e => setTokenAddress(e.target.value)}
          placeholder="Or enter custom token address: 0x..."
          className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-white text-sm font-medium mb-2">Amount to Deposit</label>
        <EtherInput value={amount} onChange={setAmount} placeholder="Enter amount" />
      </div>

      <div>
        <label className="block text-white text-sm font-medium mb-2">Target Chain</label>
        <select
          value={chain}
          onChange={e => setChain(e.target.value)}
          className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        >
          <option value="Sepolia" className="text-black">
            Sepolia (8% APY)
          </option>
          <option value="Base" className="text-black">
            Base (12% APY)
          </option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading || !tokenAddress || !amount}
        className="w-full bg-gradient-to-r from-yellow-400 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:from-yellow-500 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isLoading ? "Analyzing..." : "🚀 Deposit & Get AI Suggestion"}
      </button>
    </form>
  );
};

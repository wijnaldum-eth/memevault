"use client";

import { useState } from "react";

interface AISuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposit: {
    token: string;
    amount: string;
    chain: string;
  } | null;
  onConfirm: () => void;
}

export const AISuggestionModal = ({ isOpen, onClose, deposit, onConfirm }: AISuggestionModalProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen || !deposit) return null;

  const suggestedAPY = deposit.chain === "Base" ? "12%" : "8%";
  const suggestedVault = deposit.chain === "Base" ? "BaseMoonwell" : "SepoliaMock";

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Yield Analysis</h2>
          <p className="text-gray-600">Based on current market data</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Deposit Amount:</span>
              <span className="font-semibold">{deposit.amount}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Token:</span>
              <span className="font-mono text-sm">{deposit.token}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Target Chain:</span>
              <span className="font-semibold">{deposit.chain}</span>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🎯</div>
              <p className="text-green-800 font-semibold mb-1">Recommended Route</p>
              <p className="text-3xl font-bold text-green-600 mb-1">{suggestedVault}</p>
              <p className="text-lg text-green-700">{suggestedAPY} APY</p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isConfirming ? "Executing..." : "🚀 Execute Yield Route"}
          </button>
        </div>
      </div>
    </div>
  );
};

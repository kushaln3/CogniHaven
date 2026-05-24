import React, { useState, useEffect } from 'react';
import { Send, DollarSign } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

interface FundTransferProps {
  balance: number;
}

export const FundTransfer: React.FC<FundTransferProps> = ({ balance }) => {
  const { setAction, showNotification, needsOtp, isFrozen } = useTelemetry();
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    setAction("view_transfer_form");
  }, []);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!target || !amount) {
      showNotification("Please fill in all fields", "error");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount > balance) {
      showNotification(`Insufficient funds. Maximum available: ₹${balance.toLocaleString()}`, "error");
      return;
    }

    if (needsOtp || isFrozen) {
      showNotification("Transaction blocked: Security verification required", "error");
      return;
    }
    
    setAction("execute_fund_transfer", { amount: transferAmount, recipient: target });
    setTarget('');
    setAmount('');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
        <Send className="w-5 h-5 mr-2 text-indigo-600" /> Fund Transfer
      </h2>
      <form onSubmit={handleTransfer} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target Account Number</label>
          <input 
            type="text" 
            required
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="0000-0000-0000"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-700">Amount (₹)</label>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Available: ₹{balance.toLocaleString()}</span>
          </div>
          <div className="relative">
            <input 
              type="number" 
              required
              min="1"
              step="0.01"
              className="w-full px-4 py-3 pl-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="absolute left-3 top-3.5 font-bold text-slate-400">₹</span>
          </div>
        </div>
        <button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
          Confirm Transfer
        </button>
      </form>
    </div>
  );
};

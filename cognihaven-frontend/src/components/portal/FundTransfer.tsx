import React, { useState, useEffect } from 'react';
import { Send, DollarSign } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const FundTransfer: React.FC = () => {
  const { setAction, showNotification, needsOtp, isFrozen } = useTelemetry();
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    setAction("view_transfer_form");
  }, []);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setAction("execute_fund_transfer");

    // Strict Form Validation
    if (!target.trim() || !amount || parseFloat(amount) <= 0) {
      showNotification("Please fill in all fields to initiate the transaction.", "error");
      return;
    }

    if (needsOtp || isFrozen) {
      showNotification("Transaction blocked: Security verification required", "error");
      return;
    }

    // Pass recipient to metadata
    setAction("execute_fund_transfer", { 
      amount: parseFloat(amount),
      recipient: target
    });
    
    showNotification(`Transfer of ₹${amount} to ${target} initiated.`);
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
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="0000-0000-0000"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
          <div className="relative">
            <input 
              type="number" 
              className="w-full px-4 py-3 pl-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 font-bold">₹</div>
          </div>
        </div>
        <button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
          Confirm Transfer
        </button>
      </form>
    </div>
  );
};

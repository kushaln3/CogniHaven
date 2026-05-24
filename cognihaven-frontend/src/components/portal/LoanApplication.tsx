import React, { useState, useEffect } from 'react';
import { Landmark, ChevronRight } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const LoanApplication: React.FC = () => {
  const { setAction, showNotification, needsOtp, isFrozen } = useTelemetry();
  const [amount, setAmount] = useState(5000);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setAction("view_loan_application");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsOtp || isFrozen) {
      showNotification("Application blocked: Security verification required", "error");
      return;
    }
    setAction("execute_loan_application", { amount });
    showNotification("Loan application submitted for review.");
    setReason('');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
        <Landmark className="w-5 h-5 mr-2 text-indigo-600" /> Loan Application
      </h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-4">Request Amount: ${amount.toLocaleString()}</label>
          <input 
            type="range" 
            min="1000" 
            max="50000" 
            step="1000"
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Purpose of Loan</label>
          <textarea 
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none h-32"
            placeholder="Please describe why you need this loan..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center shadow-xl shadow-indigo-100 group">
          Submit Application <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>
    </div>
  );
};

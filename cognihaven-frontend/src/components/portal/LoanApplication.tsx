import React, { useState, useEffect } from 'react';
import { Landmark, ChevronRight, Zap, TrendingUp, Info } from 'lucide-react';
import { useTelemetry } from '../../context/useTelemetry';

export const LoanApplication: React.FC = () => {
  const { setAction, showNotification, needsOtp, isFrozen } = useTelemetry();
  const [amount, setAmount] = useState(5000);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setAction("view_loan_application");
  }, [setAction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsOtp || isFrozen) {
      showNotification("Application blocked: Security verification required", "error");
      return;
    }
    setAction("execute_loan_application", { amount });
    showNotification("Credit injection request submitted for neural review.");
    setReason('');
  };

  return (
    <div className="max-w-3xl mx-auto pt-4">
      <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32 animate-pulse"></div>

        <div className="flex items-center mb-10">
          <div className="w-14 h-14 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center mr-5 shadow-2xl group-hover:scale-105 transition-transform duration-500">
            <Landmark className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Credit_Injection</h2>
            <div className="flex items-center space-x-2 mt-1">
               <TrendingUp className="w-3 h-3 text-emerald-500" />
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Neural Liquidity Assessment</p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-2xl mb-10 flex items-start space-x-4">
           <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
           <p className="text-[11px] text-zinc-400 font-medium leading-relaxed uppercase tracking-tight">
             All credit requests are subject to <span className="text-white font-black">Biometric_Verification</span>. Approval latency is minimized via real-time risk profiling.
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-6">
            <div className="flex justify-between items-end">
               <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Quantum_Amount</label>
               <span className="text-3xl font-black text-white font-mono tracking-tighter">₹{amount.toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min="1000" 
              max="50000" 
              step="1000"
              className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-indigo-600 border border-white/5"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value))}
            />
            <div className="flex justify-between text-[8px] font-black text-zinc-700 uppercase tracking-widest px-1">
               <span>Min: ₹1k</span>
               <span>Max: ₹50k</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Application_Justification</label>
            <textarea 
              className="w-full bg-zinc-950/50 border border-white/5 focus:border-indigo-500/50 rounded-2xl px-6 py-5 text-white outline-none transition-all font-mono text-xs h-32 resize-none shadow-inner"
              placeholder="State the purpose of this liquidity request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <button className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-black py-6 rounded-[1.5rem] transition-all duration-300 shadow-2xl shadow-white/5 uppercase tracking-[0.3em] text-[11px] flex items-center justify-center group active:scale-[0.98]">
            Transmit_Application
            <ChevronRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between opacity-30">
          <div className="flex items-center space-x-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">Assessing Risk...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

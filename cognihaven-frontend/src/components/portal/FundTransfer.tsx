import React, { useState } from 'react';
import { Send, IndianRupee, ShieldCheck, ChevronRight, ArrowUpRight, Zap } from 'lucide-react';
import { useTelemetry } from '../../context/useTelemetry';

export const FundTransfer: React.FC = () => {
  const { setAction, needsOtp, isFrozen, showNotification } = useTelemetry();
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!target.trim() || !amount || parseFloat(amount) <= 0) {
      showNotification("Please fill in all fields to initiate the transaction.", "error");
      return;
    }

    if (needsOtp || isFrozen) {
      showNotification("Transaction blocked: Security verification required", "error");
      return;
    }

    setAction("execute_fund_transfer", { 
      amount: parseFloat(amount),
      recipient: target 
    });
    
    setTarget('');
    setAmount('');
  };

  return (
    <div className="max-w-2xl mx-auto pt-4">
      <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
        
        <div className="flex items-center mb-10">
          <div className="w-14 h-14 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center mr-5 shadow-2xl group-hover:scale-105 transition-transform duration-500">
            <Send className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Transfer Assets</h2>
            <div className="flex items-center space-x-2 mt-1">
               <ShieldCheck className="w-3 h-3 text-emerald-500" />
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Secure Transfer</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleTransfer} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Recipient ID</label>
            <div className="relative">
              <input
                type="text"
                className={`w-full bg-zinc-950/50 border ${isFocused === 'target' ? 'border-indigo-500/50 ring-4 ring-indigo-500/5' : 'border-white/5'} rounded-2xl px-6 py-5 pl-14 text-white outline-none transition-all duration-300 font-mono text-sm shadow-inner`}
                placeholder="Enter recipient username"
                value={target}
                onFocus={() => setIsFocused('target')}
                onBlur={() => setIsFocused(null)}
                onChange={(e) => setTarget(e.target.value)}
              />
              <ArrowUpRight className={`absolute left-5 top-5 w-6 h-6 transition-colors duration-300 ${isFocused === 'target' ? 'text-indigo-400' : 'text-zinc-600'}`} />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Amount (₹)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                className={`w-full bg-zinc-950/50 border ${isFocused === 'amount' ? 'border-indigo-500/50 ring-4 ring-indigo-500/5' : 'border-white/5'} rounded-2xl px-6 py-5 pl-14 text-white outline-none transition-all duration-300 font-mono text-xl font-black shadow-inner`}
                placeholder="0.00"
                value={amount}
                onFocus={() => setIsFocused('amount')}
                onBlur={() => setIsFocused(null)}
                onChange={(e) => setAmount(e.target.value)}
              />
              <IndianRupee className={`absolute left-5 top-5.5 w-6 h-6 transition-colors duration-300 ${isFocused === 'amount' ? 'text-indigo-400' : 'text-zinc-600'}`} />
            </div>
          </div>

          <button className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-black py-6 rounded-[1.5rem] transition-all duration-300 shadow-2xl shadow-white/5 uppercase tracking-[0.3em] text-[11px] flex items-center justify-center group active:scale-[0.98]">
            Transfer Funds
            <ChevronRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between opacity-30">
          <div className="flex items-center space-x-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">Status: Secure Connection</span>
          </div>
        </div>
      </div>
    </div>
  );
};

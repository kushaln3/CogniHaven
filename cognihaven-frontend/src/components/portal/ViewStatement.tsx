import React, { useEffect, useState } from 'react';
import { FileText, Download, ArrowUpRight, ArrowDownLeft, Shield, Cpu } from 'lucide-react';
import { useTelemetry } from '../../context/useTelemetry';

interface Transaction {
  id: number;
  recipient: string;
  amount: number;
  timestamp: string;
  status: string;
}

export const ViewStatement: React.FC = () => {
  const { setAction, sessionId } = useTelemetry();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAction("view_statement_history");
  }, [setAction]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!sessionId) return;
      try {
        const response = await fetch(`http://localhost:8000/api/user/transactions?session_id=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [sessionId]);

  return (
    <div className="max-w-4xl mx-auto pt-4">
      <div className="bg-zinc-900/20 backdrop-blur-2xl rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl transition-all duration-500 hover:border-white/10">
        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center mr-5 shadow-2xl">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tighter uppercase">Transaction History</h2>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">Account Statement</p>
            </div>
          </div>
          <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all flex items-center group">
            <Download className="w-3.5 h-3.5 mr-2 group-hover:translate-y-0.5 transition-transform" />
            Export Statement
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-white/5">
                <th className="px-8 py-5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Description</th>
                <th className="px-8 py-5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {transactions.length > 0 ? transactions.map((t) => (
                <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6 text-[10px] font-mono text-zinc-500 uppercase tracking-tight">
                    {new Date(t.timestamp).toLocaleString()}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-lg mr-4 flex items-center justify-center border transition-all ${
                        t.amount > 0 
                          ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' 
                          : 'bg-zinc-900 border-white/5 text-zinc-500'
                      }`}>
                        {t.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <span className="text-[11px] font-black text-white uppercase tracking-tight">
                        {t.amount > 0 ? 'Incoming Transfer' : `Transfer to ${t.recipient}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2">
                       <Shield className="w-3 h-3 text-emerald-500" />
                       <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{t.status}</span>
                    </div>
                  </td>
                  <td className={`px-8 py-6 text-right font-mono font-black text-sm tracking-tighter ${t.amount > 0 ? 'text-emerald-500' : 'text-zinc-200'}`}>
                    {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    {isLoading ? (
                       <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    ) : (
                      <>
                        <Cpu className="w-12 h-12 text-zinc-800 mx-auto mb-6 animate-pulse" />
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">No transaction records found</p>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

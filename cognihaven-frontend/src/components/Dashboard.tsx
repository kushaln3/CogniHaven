import React, { useState, useEffect } from 'react';
import { LayoutDashboard, LogOut, Send, Lock, User, Landmark, FileText, Activity, TrendingUp, ShieldCheck, Zap, ArrowUpRight, ArrowDownLeft, Shield, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTelemetry } from '../context/useTelemetry';
import { FundTransfer } from './portal/FundTransfer';
import { ChangePassword } from './portal/ChangePassword';
import { UpdateProfile } from './portal/UpdateProfile';
import { LoanApplication } from './portal/LoanApplication';
import { ViewStatement } from './portal/ViewStatement';

const TelemetryMap = () => (
  <div className="absolute inset-0 z-0 opacity-10 overflow-hidden pointer-events-none">
    <svg width="100%" height="100%" className="absolute inset-0">
      <motion.path
        d="M -100 200 Q 300 100 500 400 T 1200 300"
        stroke="#1D4ED8"
        strokeWidth="4"
        fill="transparent"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      <motion.path
        d="M 1200 600 Q 700 800 400 500 T -100 700"
        stroke="#84CC16"
        strokeWidth="6"
        fill="transparent"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear", delay: 2 }}
      />
    </svg>
  </div>
);

interface Transaction {
  id: number;
  name: string;
  amount: number;
  date: string;
  time: string;
  type: string;
}

interface RawTransaction {
  id: number;
  recipient: string;
  amount: number;
  timestamp: string;
  status: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { username, sessionId, riskScore } = useTelemetry();
  const [activeTab, setActiveTab] = useState('overview');
  const [balance, setBalance] = useState(50000.00);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) return;
      try {
        const accRes = await fetch(`http://localhost:8000/api/user/account?session_id=${sessionId}`);
        if (accRes.ok) {
          const accData = await accRes.json();
          setBalance(accData.current_balance);
        }

        const txRes = await fetch(`http://localhost:8000/api/user/transactions?session_id=${sessionId}`);
        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData.map((t: RawTransaction) => ({
            id: t.id,
            name: t.recipient,
            amount: t.amount,
            date: new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: t.status.toUpperCase()
          })));
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transfer', label: 'Transfers', icon: Send },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'loan', label: 'Loan', icon: Landmark },
    { id: 'statement', label: 'Transaction History', icon: FileText },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'transfer': return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><FundTransfer /></div>;
      case 'security': return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><ChangePassword /></div>;
      case 'profile': return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><UpdateProfile /></div>;
      case 'loan': return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><LoanApplication /></div>;
      case 'statement': return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><ViewStatement /></div>;
      default: return (
        <div className="space-y-6 animate-in fade-in duration-700">
          {/* Top Bento Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-white/20 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32 transition-all group-hover:bg-indigo-500/20"></div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Available Liquidity</p>
                <h3 className="text-6xl font-black text-white tracking-tighter font-mono leading-none">
                  ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <div className="mt-8 flex items-center space-x-6">
                  <div className="flex items-center text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/20">
                    <TrendingUp className="w-3 h-3 mr-2" /> +2.4% APY
                  </div>
                  <div className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Verified Baseline: SECURE</div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#EAB308] p-8 rounded-[2.5rem] shadow-2xl shadow-yellow-900/20 relative overflow-hidden group transition-all duration-500 hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-black/5 opacity-10"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                   <p className="text-[10px] font-black text-black/40 uppercase tracking-[0.3em] mb-1">Credit Score</p>
                   <h3 className="text-5xl font-black text-black font-mono tracking-tighter">785</h3>
                </div>
                <div className="bg-black/10 backdrop-blur-md p-3 rounded-2xl border border-black/5 mt-4">
                  <p className="text-[9px] font-black text-black/60 uppercase tracking-widest">EXCELLENT_RATING</p>
                  <div className="w-full h-1.5 bg-black/10 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-black w-[85%]"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Middle Bento Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center group hover:border-indigo-500/30 transition-all duration-500"
            >
               <div className="w-12 h-12 bg-zinc-950 border border-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Zap className="w-6 h-6 text-amber-500" />
               </div>
               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Risk Score</p>
               <h4 className="text-2xl font-black text-white font-mono tracking-tighter">{riskScore.toString().padStart(2, '0')}%</h4>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center group hover:border-emerald-500/30 transition-all duration-500"
            >
               <div className="w-12 h-12 bg-zinc-950 border border-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <ShieldCheck className="w-6 h-6 text-emerald-500" />
               </div>
               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Security Status</p>
               <h4 className="text-lg font-black text-white uppercase tracking-tighter leading-none mt-1 text-center">Active</h4>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="md:col-span-2 bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-6 px-8 rounded-[2rem] flex items-center justify-between group hover:border-white/20 transition-all duration-500"
            >
               <div className="flex items-center">
                  <div className="w-12 h-12 bg-zinc-950 border border-white/5 rounded-2xl flex items-center justify-center mr-5">
                    <Activity className="w-6 h-6 text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Biometrics</p>
                    <p className="text-xs font-bold text-zinc-300 uppercase tracking-tight">Authenticated</p>
                  </div>
               </div>
               <div className="flex space-x-1">
                  {[40, 70, 45, 90, 65].map((h, i) => (
                    <div key={i} className="w-1.5 bg-indigo-500/20 rounded-full h-8 flex items-end">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                        className="w-full bg-indigo-500 rounded-full"
                      ></motion.div>
                    </div>
                  ))}
               </div>
            </motion.div>
          </div>

          {/* Bottom Bento Area: Transactions */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-zinc-900/20 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 hover:border-white/10"
          >
            <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center mr-5">
                  <FileText className="w-5 h-5 text-zinc-400" />
                </div>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Recent Transactions</h2>
              </div>
              <button 
                onClick={() => setActiveTab('statement')}
                className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors border-b border-indigo-400/30 pb-0.5"
              >
                View All
              </button>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <tbody>
                  {transactions.length > 0 ? transactions.map((t) => (
                    <tr key={t.id} className="group hover:bg-white/[0.02] transition-all duration-300 border-b border-white/[0.03] last:border-0">
                      <td className="px-8 py-5">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-xl mr-5 flex items-center justify-center border transition-all ${
                            t.amount > 0 
                              ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' 
                              : 'bg-zinc-950 border-white/5 text-zinc-400'
                          }`}>
                            {t.amount > 0 ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-tight">{t.name}</p>
                            <p className="text-[9px] text-zinc-600 font-mono uppercase mt-0.5">{t.type} // VERIFIED</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[10px] font-mono text-zinc-500 uppercase">
                        {t.date} <span className="mx-2 text-zinc-800">|</span> {t.time}
                      </td>
                      <td className={`px-8 py-5 text-right font-mono font-black text-sm tracking-tighter ${t.amount > 0 ? 'text-emerald-500' : 'text-zinc-200'}`}>
                        {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-8 py-24 text-center">
                        <Cpu className="w-12 h-12 text-zinc-800 mx-auto mb-6 animate-pulse" />
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">No transaction records found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans flex relative overflow-hidden selection:bg-indigo-500/30">
      <TelemetryMap />
      
      {/* Premium Sidebar */}
      <aside className="w-80 bg-zinc-950/80 backdrop-blur-3xl border-r border-white/5 p-8 flex flex-col fixed h-full z-[100]">
        <div className="flex items-center mb-16 px-2 group cursor-default">
          <div className="relative mr-4">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-500 animate-pulse"></div>
            <div className="relative bg-zinc-900 border border-white/10 p-2.5 rounded-xl shadow-2xl">
              <Shield className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
          <div>
             <span className="font-black text-white text-2xl tracking-tighter font-['Bebas_Neue'] leading-none">COGNI<span className="text-zinc-600">HAVEN</span></span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all group relative overflow-hidden ${
                activeTab === item.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-4 h-4 mr-4 transition-colors ${activeTab === item.id ? 'text-white' : 'text-zinc-600 group-hover:text-indigo-400'}`} />
              {item.label}
              {activeTab === item.id && (
                <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full"></div>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-10 border-t border-white/5">
          <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5 mb-6">
             <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">User</p>
             <p className="text-xs font-black text-white uppercase tracking-tighter truncate font-mono">{username || 'Guest'}</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center px-5 py-4 text-[#f43f5e] hover:bg-rose-500/10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all group border border-transparent hover:border-rose-500/20"
          >
            <LogOut className="w-4 h-4 mr-4 group-hover:-translate-x-1 transition-transform" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Scroll Area */}
      <main className="flex-1 ml-80 p-10 max-w-[1200px] mx-auto relative z-10">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase font-['Bebas_Neue'] leading-none">Dashboard</h1>
            <div className="flex items-center space-x-3 mt-3">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
               <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Continuous Security Active</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
             <button 
               onClick={() => setActiveTab('transfer')}
               className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3.5 rounded-2xl font-black text-[10px] text-white uppercase tracking-widest transition-all active:scale-95 shadow-xl"
             >
               Transfer
             </button>
             <button 
               onClick={() => setActiveTab('loan')}
               className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/20 active:scale-95"
             >
               Loan
             </button>
          </div>
        </header>

        {renderContent()}
      </main>

      {/* Global CSS for scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Lock, User, ChevronRight, Activity, Zap, Cpu } from 'lucide-react';

// --- Kinetic Sub-Components (Reusing the style from Login.tsx) ---

const TelemetryMap = () => {
  return (
    <div className="absolute inset-0 z-0 opacity-20 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" className="absolute inset-0">
        <motion.path
          d="M -100 100 Q 200 150 400 50 T 900 200"
          stroke="#ef4444"
          strokeWidth="8"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M 1200 400 Q 800 300 600 500 T -100 450"
          stroke="#4f46e5"
          strokeWidth="12"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 1 }}
        />
        <motion.path
          d="M 500 -100 Q 600 400 400 800 T 700 1200"
          stroke="#991b1b"
          strokeWidth="6"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 2 }}
        />
      </svg>
    </div>
  );
};

const GeometricBlock: React.FC<{ children: React.ReactNode, color: string, delay?: number, className?: string }> = ({ children, color, delay = 0, className = "" }) => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0, y: 40 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    transition={{ type: "spring", stiffness: 100, damping: 15, delay }}
    className={`rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden ${className}`}
    style={{ backgroundColor: color }}
  >
    {children}
  </motion.div>
);

export const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isFocused, setIsFocused] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      navigate('/soc-admin');
    } else {
      // Use a more subtle alert or visual feedback in real app
      alert("INVALID_ADMIN_CREDENTIALS");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-red-500/30">
      <TelemetryMap />

      {/* Decorative Floating Shapes */}
      <motion.div 
        animate={{ 
          rotate: 360,
          y: [0, 40, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 left-20 w-32 h-32 rounded-full border-4 border-red-500/20 z-0"
      />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Col: Brand & System Status */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center space-x-4 mb-8">
              <div className="bg-red-600 p-4 rounded-[1.5rem] shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                <ShieldAlert className="w-12 h-12 text-white" />
              </div>
              <div className="h-16 w-0.5 bg-white/10 hidden md:block"></div>
              <div>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Root Access Terminal</p>
                <h1 className="text-7xl font-black text-white tracking-tighter leading-[0.85] font-['Bebas_Neue']">
                  COMMAND<span className="text-zinc-600">CENTER</span>
                </h1>
              </div>
            </div>

            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight mb-8 font-['Bebas_Neue']">
              MONITOR. DETECT. <br /> 
              <span className="text-white/20">NEUTRALIZE.</span> <span className="text-red-600">ENFORCE.</span>
            </h2>

            <div className="flex flex-wrap gap-4">
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 px-6 py-4 rounded-3xl flex items-center space-x-3">
                <Activity className="w-5 h-5 text-red-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">System_Health: 99.8%</span>
              </div>
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 px-6 py-4 rounded-3xl flex items-center space-x-3">
                <Zap className="w-5 h-5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">SOC_Uplink: Active</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Col: Admin Gate */}
        <div className="lg:col-span-5">
          <GeometricBlock color="rgba(24, 24, 27, 0.4)" className="backdrop-blur-3xl border-red-500/10" delay={0.2}>
            <div className="flex items-center justify-between mb-10">
               <h3 className="text-xl font-black text-white uppercase tracking-widest">Admin_Gate</h3>
               <div className="flex items-center bg-zinc-950 px-3 py-1.5 rounded-full border border-red-500/20">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 shadow-[0_0_8px_#ef4444]"></div>
                  <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Elevated</span>
               </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">ADMIN_IDENTIFIER</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    onFocus={() => setIsFocused('user')}
                    onBlur={() => setIsFocused(null)}
                    className={`w-full bg-zinc-950/80 border-2 ${isFocused === 'user' ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5'} rounded-[1.5rem] px-6 py-5 pl-14 text-white outline-none transition-all duration-300 font-mono text-sm tracking-tight`}
                    placeholder="root_operator"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <User className={`absolute left-5 top-5 w-6 h-6 transition-colors duration-300 ${isFocused === 'user' ? 'text-red-500' : 'text-zinc-700'}`} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">MASTER_PASSPHRASE</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    onFocus={() => setIsFocused('pass')}
                    onBlur={() => setIsFocused(null)}
                    className={`w-full bg-zinc-950/80 border-2 ${isFocused === 'pass' ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5'} rounded-[1.5rem] px-6 py-5 pl-14 text-white outline-none transition-all duration-300 font-mono text-sm`}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock className={`absolute left-5 top-5 w-6 h-6 transition-colors duration-300 ${isFocused === 'pass' ? 'text-red-500' : 'text-zinc-700'}`} />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-6 rounded-[1.5rem] transition-all duration-300 shadow-2xl shadow-red-900/40 uppercase tracking-[0.3em] text-[12px] flex items-center justify-center group active:scale-[0.98]"
              >
                AUTHORIZE_SESSION
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-12 flex flex-col items-center space-y-4">
               <div className="flex items-center space-x-3 opacity-30">
                  <Cpu className="w-4 h-4 text-zinc-500" />
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-mono">Kernel_Access: Unrestricted</span>
               </div>
            </div>
          </GeometricBlock>
        </div>
      </div>

      {/* Footer Log */}
      <div className="absolute bottom-8 w-full px-12 flex justify-between items-end pointer-events-none opacity-20">
         <div className="font-mono text-[8px] text-zinc-500 space-y-1">
            <p>0xFF: ELEVATED_PRIVILEGES_REQUESTED</p>
            <p>0x00: FIREWALL_BYPASS_AUTHORIZED</p>
            <p>0xAA: SOC_DASHBOARD_LINK_PENDING</p>
         </div>
         <div className="text-right">
            <p className="font-['Bebas_Neue'] text-4xl text-white tracking-widest uppercase">Root_Shell</p>
         </div>
      </div>
    </div>
  );
};

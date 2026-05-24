import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, User, Terminal, ChevronRight, Activity, Zap, Cpu } from 'lucide-react';
import { useTelemetry } from '../context/useTelemetry';

// --- Kinetic Sub-Components ---

const TelemetryMap = () => {
  return (
    <div className="absolute inset-0 z-0 opacity-20 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" className="absolute inset-0">
        {/* Animated Paths mimicking the MTA map style */}
        <motion.path
          d="M -100 100 Q 200 150 400 50 T 900 200"
          stroke="#84CC16"
          strokeWidth="8"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M 1200 400 Q 800 300 600 500 T -100 450"
          stroke="#EAB308"
          strokeWidth="12"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 1 }}
        />
        <motion.path
          d="M 500 -100 Q 600 400 400 800 T 700 1200"
          stroke="#1D4ED8"
          strokeWidth="6"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 2 }}
        />
        <motion.path
          d="M 100 1100 Q 400 600 900 700 T 1300 -100"
          stroke="#f43f5e"
          strokeWidth="10"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear", delay: 0.5 }}
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

export const Login: React.FC = () => {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequired, setOtpRequired] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [learningStep, setLearningStep] = useState(1);
  const [isFocused, setIsFocused] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { setSessionId, setUsername, logout, showNotification } = useTelemetry();

  const handleUsernameBlur = async () => {
    if (!usernameInput) return;
    try {
      const response = await fetch('http://localhost:8000/pre-login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput }),
      });
      if (response.ok) {
        const data = await response.json();
        setOtpRequired(data.otp_required);
        setIsFirstLogin(data.is_first_login);
        setLearningStep(data.learning_step);
      }
    } catch (error) {
      console.error("Risk check failed:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logout();
    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: usernameInput, 
          password,
          otp: otpRequired ? otp : undefined 
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session_id, data.is_enrolled);
        setUsername(data.username);
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        showNotification(errorData.detail || "Login failed", "error");
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      <TelemetryMap />

      {/* Decorative Floating Shapes */}
      <motion.div 
        animate={{ 
          rotate: 360,
          y: [0, 40, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 right-20 w-32 h-32 rounded-full border-4 border-indigo-500/20 z-0"
      />
      <motion.div 
        animate={{ 
          rotate: -360,
          x: [0, -50, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-20 left-20 w-48 h-48 rounded-[3rem] border-4 border-emerald-500/10 z-0"
      />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Col: Brand & Identity */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center space-x-4 mb-8">
              <div className="bg-[#EAB308] p-4 rounded-[1.5rem] shadow-[0_0_40px_rgba(234,179,8,0.3)]">
                <Shield className="w-12 h-12 text-[#050505]" />
              </div>
              <div className="h-16 w-0.5 bg-white/10 hidden md:block"></div>
              <div>
                <p className="text-[10px] font-black text-[#EAB308] uppercase tracking-[0.4em]">Continuous Security</p>
                <h1 className="text-7xl font-black text-white tracking-tighter leading-[0.85] font-['Bebas_Neue']">
                  COGNI<span className="text-[#84CC16]">HAVEN</span>
                </h1>
              </div>
            </div>

            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight mb-8 font-['Bebas_Neue']">
              AUTHENTICATION IS NO LONGER <br /> 
              <span className="text-white/20">A MOMENT;</span> <span className="text-indigo-500">IT IS A STATE.</span>
            </h2>

            <div className="flex flex-wrap gap-4">
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 px-6 py-4 rounded-3xl flex items-center space-x-3">
                <Activity className="w-5 h-5 text-[#84CC16]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live_Behavioral_Stream</span>
              </div>
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 px-6 py-4 rounded-3xl flex items-center space-x-3">
                <Zap className="w-5 h-5 text-[#EAB308]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Neural_Engine_v2.2</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Col: Secure Form */}
        <div className="lg:col-span-5">
          <GeometricBlock color="rgba(24, 24, 27, 0.4)" className="backdrop-blur-3xl" delay={0.2}>
            <div className="flex items-center justify-between mb-10">
               <h3 className="text-xl font-black text-white uppercase tracking-widest">Secure_Gate</h3>
               <div className="flex items-center bg-zinc-950 px-3 py-1.5 rounded-full border border-white/10">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 shadow-[0_0_8px_#10b981]"></div>
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Encrypted</span>
               </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">UID_SEQUENCE</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    onFocus={() => setIsFocused('user')}
                    onBlur={() => { setIsFocused(null); handleUsernameBlur(); }}
                    className={`w-full bg-zinc-950/80 border-2 ${isFocused === 'user' ? 'border-[#84CC16] shadow-[0_0_20px_rgba(132,204,22,0.2)]' : 'border-white/5'} rounded-[1.5rem] px-6 py-5 pl-14 text-white outline-none transition-all duration-300 font-mono text-sm tracking-tight`}
                    placeholder="SUBJECT_01"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                  />
                  <User className={`absolute left-5 top-5 w-6 h-6 transition-colors duration-300 ${isFocused === 'user' ? 'text-[#84CC16]' : 'text-zinc-700'}`} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">KEY_PHRASE</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    onFocus={() => setIsFocused('pass')}
                    onBlur={() => setIsFocused(null)}
                    className={`w-full bg-zinc-950/80 border-2 ${isFocused === 'pass' ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-white/5'} rounded-[1.5rem] px-6 py-5 pl-14 text-white outline-none transition-all duration-300 font-mono text-sm`}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock className={`absolute left-5 top-5 w-6 h-6 transition-colors duration-300 ${isFocused === 'pass' ? 'text-indigo-500' : 'text-zinc-700'}`} />
                </div>
              </div>

              <AnimatePresence>
                {otpRequired && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 pt-2 overflow-hidden"
                  >
                    <label className={`text-[9px] font-black uppercase tracking-[0.2em] ml-1 flex items-center ${isFirstLogin ? 'text-emerald-500' : 'text-amber-500'}`}>
                      <Terminal className="w-3 h-3 mr-2" />
                      {isFirstLogin ? `BASELINING_STEP_${learningStep}` : 'IDENTITY_CHALLENGE'}
                    </label>
                    <input
                      type="text"
                      required
                      className={`w-full bg-[#050505] border-2 ${isFirstLogin ? 'border-emerald-500/50' : 'border-amber-500/50'} rounded-[1.5rem] px-4 py-5 text-white outline-none focus:ring-4 ${isFirstLogin ? 'focus:ring-emerald-500/10' : 'focus:ring-amber-500/10'} transition-all font-mono text-center text-2xl tracking-[0.5em]`}
                      placeholder="000000"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                className="w-full bg-[#EAB308] hover:bg-[#FACC15] text-[#050505] font-black py-6 rounded-[1.5rem] transition-all duration-300 shadow-2xl shadow-yellow-900/20 uppercase tracking-[0.3em] text-[12px] flex items-center justify-center group active:scale-[0.98]"
              >
                INITIALIZE_CORE
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-12 flex flex-col items-center space-y-4">
               <div className="flex items-center space-x-3 opacity-30">
                  <Cpu className="w-4 h-4 text-zinc-500" />
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-mono">Kernel_Access: Restrictive</span>
               </div>
               <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                  Auth_v2.2.0 // Node_Mumbai_01
               </p>
            </div>
          </GeometricBlock>
        </div>
      </div>

      {/* Experimental Footer Log */}
      <div className="absolute bottom-8 w-full px-12 flex justify-between items-end pointer-events-none opacity-20">
         <div className="font-mono text-[8px] text-zinc-500 space-y-1">
            <p>0x42: MOUSE_EVENT_HOOK_ESTABLISHED</p>
            <p>0x89: KEYBOARD_BUFFER_MONITOR_ON</p>
            <p>0xCF: BIOMETRIC_RECON_READY</p>
         </div>
         <div className="text-right">
            <p className="font-['Bebas_Neue'] text-4xl text-white tracking-widest">KINETIC_SHIELD</p>
         </div>
      </div>
    </div>
  );
};

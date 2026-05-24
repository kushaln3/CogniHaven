import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Keyboard, MousePointer2, Cpu, Zap } from 'lucide-react';

interface CalibrationModalProps {
  onComplete: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({ onComplete }) => {
  const [inputText, setInputText] = useState('');
  const targetPhrase = 'The quick brown fox jumps over the lazy dog';
  const progress = Math.min(100, (inputText.length / targetPhrase.length) * 100);

  const handleFinish = () => {
    if (inputText === targetPhrase) {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050505]/90 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 selection:bg-indigo-500/30">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-zinc-900/40 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -ml-32 -mb-32"></div>

        <div className="relative z-10">
          <div className="flex items-center mb-8">
            <div className="bg-indigo-600 p-4 rounded-2xl mr-6 shadow-[0_0_30px_rgba(79,70,229,0.3)]">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase font-['Bebas_Neue']">Identity_Calibration</h2>
              <div className="flex items-center space-x-3 mt-1">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                 <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Neural Enrollment Phase active</p>
              </div>
            </div>
          </div>

          <p className="text-zinc-400 mb-8 leading-relaxed text-sm font-medium uppercase tracking-tight">
            To establish your unique <span className="text-white font-black">Behavioral_Signature</span>, we require a high-fidelity baseline. Type the synchronization sequence below exactly as shown.
          </p>

          <div className="bg-zinc-950/80 border border-white/5 rounded-[2rem] p-8 mb-8 font-mono text-center relative group overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-zinc-600 text-[9px] mb-4 uppercase tracking-[0.3em] font-black">Target_Sequence_Buffer</p>
            <p className="text-xl font-black text-white tracking-tight">"{targetPhrase}"</p>
          </div>

          <div className="space-y-6 mb-10">
            <div className="relative">
              <input
                type="text"
                autoFocus
                className="w-full bg-zinc-950 border-2 border-white/5 focus:border-indigo-500/50 rounded-2xl px-6 py-5 pr-14 text-white outline-none transition-all font-mono text-lg shadow-inner"
                placeholder="Initialize typing sequence..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={(e) => e.preventDefault()}
              />
              <Keyboard className="absolute right-6 top-5.5 w-6 h-6 text-zinc-700" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Buffer_Sync_Progress</span>
                <span className="text-[9px] font-black text-indigo-400 font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="bg-indigo-600 h-full shadow-[0_0_15px_rgba(79,70,229,0.5)]" 
                ></motion.div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleFinish}
            disabled={inputText !== targetPhrase}
            className={`w-full font-black py-6 rounded-2xl transition-all flex items-center justify-center uppercase tracking-[0.3em] text-[11px] group ${
              inputText === targetPhrase 
              ? 'bg-white text-zinc-950 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:bg-zinc-200' 
              : 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-white/5'
            }`}
          >
            <MousePointer2 className={`w-5 h-5 mr-3 transition-transform ${inputText === targetPhrase ? 'group-hover:scale-110' : ''}`} />
            Finalize_Enrollment
          </button>
          
          <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-center space-x-6 opacity-40">
            <div className="flex items-center space-x-2">
               <Cpu className="w-3.5 h-3.5 text-zinc-500" />
               <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Feature_Capture: ON</span>
            </div>
            <div className="flex items-center space-x-2">
               <Zap className="w-3.5 h-3.5 text-zinc-500" />
               <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Neural_Link: Stable</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

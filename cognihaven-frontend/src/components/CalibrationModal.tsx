import React, { useState } from 'react';
import { ShieldCheck, Keyboard, MousePointer2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 shadow-2xl border border-indigo-100">
        <div className="flex items-center mb-6">
          <div className="bg-indigo-600 p-3 rounded-2xl mr-4 shadow-lg shadow-indigo-200">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Identity Calibration</h2>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider text-[10px]">Security Enrollment Phase</p>
          </div>
        </div>

        <p className="text-slate-600 mb-6 leading-relaxed text-sm">
          To provide continuous protection, we need to calibrate your unique behavioral profile. Please type the phrase below and click the button.
        </p>

        <div className="bg-slate-50 rounded-2xl p-6 mb-6 border border-slate-100 font-mono text-center">
          <p className="text-slate-400 text-xs mb-2 uppercase font-sans tracking-widest">Target Phrase</p>
          <p className="text-lg font-bold text-slate-700">"{targetPhrase}"</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="relative">
            <input
              type="text"
              autoFocus
              className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-mono"
              placeholder="Start typing..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <Keyboard className="absolute right-4 top-4.5 w-5 h-5 text-slate-300" />
          </div>
          
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <button 
          onClick={handleFinish}
          disabled={inputText !== targetPhrase}
          className={`w-full font-bold py-4 rounded-2xl transition-all flex items-center justify-center shadow-xl ${
            inputText === targetPhrase 
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100' 
            : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          <MousePointer2 className="w-5 h-5 mr-2" />
          Finalize Enrollment
        </button>
        
        <p className="mt-6 text-center text-[10px] text-slate-400 uppercase tracking-widest font-medium">
          Capturing 6-Feature Behavioral Profiling...
        </p>
      </div>
    </div>
  );
};

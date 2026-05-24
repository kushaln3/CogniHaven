import React, { useState } from 'react';
import { Fingerprint, Smartphone, ShieldCheck, Info, AlertTriangle, UserCheck, ShieldAlert } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const OtpModal: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(false);
  const { otpReason, verifyOtp } = useTelemetry();

  const isLearning = otpReason === 'learning';

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(false);

    // Auto-focus next
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    const success = await verifyOtp(code.join(''));
    if (!success) {
      setError(true);
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className={`max-w-md w-full bg-white rounded-[2rem] p-8 shadow-2xl border-2 transition-all duration-500 overflow-hidden relative ${
        isLearning ? 'border-emerald-100' : 'border-rose-100 shadow-rose-200/20'
      }`}>
        {/* Decorative Top Accent */}
        <div className={`absolute top-0 left-0 right-0 h-2 ${isLearning ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

        <div className="flex items-center mb-6">
          <div className={`p-4 rounded-2xl mr-4 transition-colors duration-500 ${isLearning ? 'bg-emerald-50' : 'bg-rose-50'}`}>
            {isLearning ? (
              <UserCheck className="w-8 h-8 text-emerald-600 animate-in zoom-in duration-500" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-rose-600 animate-bounce" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight leading-tight">
              {isLearning ? 'Secure Onboarding' : 'Identity Challenge'}
            </h2>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLearning ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isLearning ? 'Establishing Behavioral Profile' : 'Security Shield Triggered'}
            </p>
          </div>
        </div>

        <div className={`p-5 rounded-2xl mb-8 flex items-start space-x-4 transition-colors duration-500 ${
          isLearning ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-rose-50/50 border border-rose-100'
        }`}>
          {isLearning ? (
            <Info className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {isLearning 
              ? "Welcome! We're learning your unique behavioral signature to secure your account. Please verify your identity to proceed."
              : "Anomalous behavior detected. We've temporarily paused this action to protect your account. Please verify your identity."}
          </p>
        </div>

        <div className="flex justify-between gap-2 mb-8">
          {code.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              maxLength={1}
              className={`w-full h-16 text-center text-2xl font-black border-2 rounded-2xl focus:ring-4 outline-none transition-all ${
                error ? 'border-red-500 bg-red-50 text-red-600' : 
                isLearning ? 'border-slate-100 bg-slate-50 focus:border-emerald-500 focus:ring-emerald-500/10 text-emerald-700' : 'border-slate-100 bg-slate-50 focus:border-rose-500 focus:ring-rose-500/10 text-rose-700'
              }`}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              disabled={isVerifying}
            />
          ))}
        </div>

        <button 
          onClick={handleVerify}
          disabled={isVerifying}
          className={`w-full text-white font-black text-sm uppercase tracking-widest py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center group ${
            isVerifying ? 'bg-slate-400 cursor-not-allowed' :
            isLearning ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
          }`}
        >
          {isVerifying ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          ) : (
            <ShieldCheck className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          )}
          {isVerifying ? 'Verifying...' : 'Confirm Identity'}
        </button>

        <div className="mt-8 flex items-center justify-center space-x-3 text-slate-300">
          <Fingerprint className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em]">CogniHaven Continuous Auth v2.2</span>
        </div>
      </div>
    </div>
  );
};

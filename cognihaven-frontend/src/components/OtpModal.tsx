import React, { useState } from 'react';
import { Fingerprint, Smartphone, ShieldCheck, RefreshCw } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const OtpModal: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const { verifyOtp, otpReason, showNotification } = useTelemetry();

  const handleChange = (index: number, value: string) => {
    if (!/^\d*₹/.test(value)) return; // Only numbers
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) return;

    setLoading(true);
    const success = await verifyOtp(fullCode);
    if (!success) {
      showNotification("Invalid OTP. Try again.", "error");
      setCode(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    }
    setLoading(false);
  };

  const isLearning = otpReason === 'learning';

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl border border-slate-100 transform animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center mb-8">
          <div className={`p-4 rounded-2xl mr-5 ${isLearning ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isLearning ? 'Initial Verification' : 'Security Challenge'}
            </h2>
            <p className={`text-[10px] font-black uppercase tracking-widest ${isLearning ? 'text-indigo-500' : 'text-amber-500'}`}>
              {isLearning ? 'Baseline Calibration Phase' : 'Behavioral Drift Detected'}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
           <p className="text-slate-600 text-sm leading-relaxed">
            {isLearning 
              ? "To secure your account, we are establishing your unique behavioral baseline. Please enter the OTP (123456) to continue calibration." 
              : "Our security engine detected an interaction pattern that doesn't match your enrolled profile. Please verify your identity."}
          </p>
        </div>

        <div className="flex justify-between gap-2 mb-10">
          {code.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="w-12 h-16 text-center text-2xl font-black border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>

        <button 
          onClick={handleVerify}
          disabled={loading || code.join('').length < 6}
          className={`w-full py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center font-bold text-lg ${
            loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-[0.98]'
          }`}
        >
          {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (
            <>
              <ShieldCheck className="w-6 h-6 mr-3" />
              Complete Verification
            </>
          )}
        </button>

        <div className="mt-10 pt-8 border-t border-slate-100 flex items-center justify-center space-x-3 text-slate-400">
          <Fingerprint className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">CogniHaven Identity Shield // v2.0</span>
        </div>
      </div>
    </div>
  );
};

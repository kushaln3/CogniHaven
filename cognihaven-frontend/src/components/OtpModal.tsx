import React, { useState } from 'react';
import { Fingerprint, Smartphone, ShieldCheck } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const OtpModal: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const { resetOtp, setRiskScore } = useTelemetry();

  const handleChange = (index: number, value: string) => {
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

  const handleVerify = () => {
    // In MVP, any code works
    resetOtp();
    setRiskScore(10); // Lower risk after manual verification
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-200">
        <div className="flex items-center mb-6">
          <div className="bg-amber-100 p-3 rounded-2xl mr-4">
            <Smartphone className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Step-Up Authentication</h2>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider text-[10px]">Verification Required</p>
          </div>
        </div>

        <p className="text-slate-600 mb-8 leading-relaxed">
          We noticed a change in your behavior. To ensure it's still you, please enter the code sent to your mobile device.
        </p>

        <div className="flex justify-between mb-8">
          {code.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              maxLength={1}
              className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
            />
          ))}
        </div>

        <button 
          onClick={handleVerify}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center"
        >
          <ShieldCheck className="w-5 h-5 mr-2" />
          Verify Identity
        </button>

        <div className="mt-8 flex items-center justify-center space-x-2 text-slate-400">
          <Fingerprint className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-widest">Secured by CogniHaven SDK</span>
        </div>
      </div>
    </div>
  );
};

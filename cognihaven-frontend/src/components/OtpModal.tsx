import React, { useState } from 'react';
import { Fingerprint, Smartphone, ShieldCheck } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const OtpModal: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const { verifyOtp, otpReason } = useTelemetry();

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
    const fullCode = code.join('');
    const success = await verifyOtp(fullCode);
    if (!success) {
      setError(true);
      setCode(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    }
  };

  const isLearning = otpReason === 'learning';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-200">
        <div className="flex items-center mb-6">
          <div className={`${isLearning ? 'bg-indigo-100' : 'bg-amber-100'} p-3 rounded-2xl mr-4`}>
            {isLearning ? (
              <Fingerprint className={`w-6 h-6 ${isLearning ? 'text-indigo-600' : 'text-amber-600'}`} />
            ) : (
              <Smartphone className="w-6 h-6 text-amber-600" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {isLearning ? 'Adaptive Learning' : 'Step-Up Authentication'}
            </h2>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider text-[10px]">
              {isLearning ? 'Identity Calibration' : 'Verification Required'}
            </p>
          </div>
        </div>

        <p className="text-slate-600 mb-8 leading-relaxed">
          {isLearning 
            ? "We're currently calibrating your unique behavioral profile. To proceed with the setup, please verify your identity."
            : "We noticed a change in your behavior or a high-value action. To ensure it's still you, please enter the code sent to your mobile device."
          }
        </p>

        <div className="flex justify-between mb-2">
          {code.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              maxLength={1}
              className={`w-12 h-14 text-center text-xl font-bold border-2 ${error ? 'border-rose-500 ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'} rounded-xl focus:ring-4 outline-none transition-all`}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
            />
          ))}
        </div>
        
        {error && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mb-6 text-center">Invalid Verification Code</p>}
        {!error && <div className="h-6 mb-6"></div>}

        <button 
          onClick={handleVerify}
          className={`w-full ${isLearning ? 'bg-slate-800 hover:bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center`}
        >
          <ShieldCheck className="w-5 h-5 mr-2" />
          {isLearning ? 'Continue Calibration' : 'Verify Identity'}
        </button>

        <div className="mt-8 flex items-center justify-center space-x-2 text-slate-400">
          <Fingerprint className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-widest">Secured by CogniHaven SDK</span>
        </div>
      </div>
    </div>
  );
};

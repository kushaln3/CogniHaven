import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

export const Login: React.FC = () => {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequired, setOtpRequired] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [learningStep, setLearningStep] = useState(1);
  const [checkingRisk, setCheckingRisk] = useState(false);
  const navigate = useNavigate();
  const { setSessionId, setUsername, logout, showNotification } = useTelemetry();

  const handleUsernameBlur = async () => {
    if (!usernameInput) return;
    setCheckingRisk(true);
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
    } finally {
      setCheckingRisk(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logout(); // Ensure previous tracking stops
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold ml-3 text-slate-800">CogniHaven Bank</h1>
        </div>

        <h2 className="text-xl font-semibold text-center mb-6 text-slate-700">Secure Client Login</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username / Email</label>
            <div className="relative">
              <input
                type="text"
                required
                className={`w-full px-4 py-3 rounded-lg border ${otpRequired ? 'border-amber-400 bg-amber-50' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none`}
                placeholder="Username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onBlur={handleUsernameBlur}
              />
              {checkingRisk && (
                <div className="absolute right-3 top-3.5">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute right-3 top-3.5 w-5 h-5 text-slate-400" />
            </div>
          </div>

          {otpRequired && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className={`block text-sm font-medium mb-1 flex items-center ${isFirstLogin ? 'text-emerald-700' : 'text-amber-700'}`}>
                <Shield className="w-4 h-4 mr-1" />
                {isFirstLogin 
                  ? `Security Profile Setup (Step ${learningStep} of 3)` 
                  : 'Secondary Verification (OTP)'}
              </label>
              <input
                type="text"
                required
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all outline-none font-mono text-center text-lg tracking-widest ${
                  isFirstLogin 
                    ? 'border-emerald-200 bg-emerald-50/30 focus:ring-emerald-500/20 focus:border-emerald-500' 
                    : 'border-amber-300 bg-amber-50/30 focus:ring-amber-500/20 focus:border-amber-500'
                }`}
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <p className={`mt-1 text-xs ${isFirstLogin ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isFirstLogin 
                  ? "We're establishing your behavioral baseline. Please verify your identity to continue." 
                  : "High-risk login detected. Enter the code sent to your device."}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-indigo-100 flex items-center justify-center"
          >
            Sign In
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Protected by Continuous Behavioral Authentication
        </p>
      </div>
      
      <div className="mt-6 flex items-center text-slate-400 text-xs">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        Behavioral SDK Active
      </div>
    </div>
  );
};

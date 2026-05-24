import React, { useState, useEffect } from 'react';
import { Lock, RefreshCw, Shield, Key } from 'lucide-react';
import { useTelemetry } from '../../context/useTelemetry';

export const ChangePassword: React.FC = () => {
  const { setAction, showNotification, needsOtp, isFrozen, sessionId } = useTelemetry();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [isFocused, setIsFocused] = useState<string | null>(null);

  useEffect(() => {
    setAction("view_change_password");
  }, [setAction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsOtp || isFrozen) {
      showNotification("Update blocked: Security verification required", "error");
      return;
    }
    try {
      const response = await fetch('http://localhost:8000/api/user/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId,
          old_password: oldPass,
          new_password: newPass
        }),
      });
      if (response.ok) {
        setAction("execute_change_password");
        showNotification("Security credentials updated successfully.");
        setOldPass('');
        setNewPass('');
      } else {
        const error = await response.json();
        showNotification(error.detail || "Failed to update security credentials.", "error");
      }
    } catch {
      showNotification("Failed to connect to security server.", "error");
    }
  };

  return (
    <div className="max-w-md mx-auto pt-4">
      <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>

        <div className="flex items-center mb-10">
          <div className="w-14 h-14 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center mr-5 shadow-2xl group-hover:scale-105 transition-transform duration-500">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Vault_Security</h2>
            <div className="flex items-center space-x-2 mt-1">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Credential Rotation Module</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Current_Secret</label>
            <div className="relative">
              <input 
                type="password" 
                className={`w-full bg-zinc-950/50 border ${isFocused === 'old' ? 'border-indigo-500/50 ring-4 ring-indigo-500/5' : 'border-white/5'} rounded-2xl px-6 py-5 pl-14 text-white outline-none transition-all duration-300 font-mono text-sm shadow-inner`}
                value={oldPass}
                onFocus={() => setIsFocused('old')}
                onBlur={() => setIsFocused(null)}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="••••••••••••"
              />
              <Lock className={`absolute left-5 top-5 w-6 h-6 transition-colors duration-300 ${isFocused === 'old' ? 'text-indigo-400' : 'text-zinc-600'}`} />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">New_Encryption_Key</label>
            <div className="relative">
              <input 
                type="password" 
                className={`w-full bg-zinc-950/50 border ${isFocused === 'new' ? 'border-indigo-500/50 ring-4 ring-indigo-500/5' : 'border-white/5'} rounded-2xl px-6 py-5 pl-14 text-white outline-none transition-all duration-300 font-mono text-sm shadow-inner`}
                value={newPass}
                onFocus={() => setIsFocused('new')}
                onBlur={() => setIsFocused(null)}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="••••••••••••"
              />
              <Key className={`absolute left-5 top-5 w-6 h-6 transition-colors duration-300 ${isFocused === 'new' ? 'text-indigo-400' : 'text-zinc-600'}`} />
            </div>
          </div>

          <button className="w-full bg-indigo-600 text-white hover:bg-indigo-500 font-black py-6 rounded-[1.5rem] transition-all duration-300 shadow-2xl shadow-indigo-900/20 uppercase tracking-[0.3em] text-[11px] flex items-center justify-center group active:scale-[0.98]">
            <RefreshCw className="w-4 h-4 mr-3 group-hover:rotate-180 transition-transform duration-700" />
            Rotate_Credentials
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-center space-x-4 opacity-30">
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono text-center">
            Encryption: AES-GCM-256 // Identity_Lock: ON
          </p>
        </div>
      </div>
    </div>
  );
};

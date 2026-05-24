import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Save, Shield, Terminal } from 'lucide-react';
import { useTelemetry } from '../../context/useTelemetry';

export const UpdateProfile: React.FC = () => {
  const { setAction, username, showNotification, needsOtp, isFrozen, sessionId } = useTelemetry();
  const [email, setEmail] = useState(`${username?.toLowerCase().replace(/\s+/g, '.')}@cognihaven.com`);
  const [phone, setPhone] = useState('+1 (555) 0123-4567');
  const [isFocused, setIsFocused] = useState<string | null>(null);

  useEffect(() => {
    setAction("view_profile_update");
  }, [setAction]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsOtp || isFrozen) {
      showNotification("Update blocked: Security verification required", "error");
      return;
    }
    try {
      const response = await fetch('http://localhost:8000/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId,
          email,
          phone
        }),
      });
      if (response.ok) {
        setAction("execute_profile_update", { changes: ["email", "phone"] });
        showNotification("Identity profile updated successfully.");
      }
    } catch {
      showNotification("Failed to update identity profile.", "error");
    }
  };

  return (
    <div className="max-w-md mx-auto pt-4">
      <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">
        {/* Ambient Glow */}
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -ml-32 -mb-32"></div>

        <div className="flex items-center mb-10">
          <div className="w-14 h-14 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center mr-5 shadow-2xl group-hover:scale-105 transition-transform duration-500">
            <User className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Identity_Node</h2>
            <div className="flex items-center space-x-2 mt-1">
               <Shield className="w-3 h-3 text-emerald-500" />
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Biometric Data Record</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Communication_Uplink (Email)</label>
            <div className="relative">
              <input 
                type="email" 
                className={`w-full bg-zinc-950/50 border ${isFocused === 'email' ? 'border-emerald-500/50 ring-4 ring-emerald-500/5' : 'border-white/5'} rounded-2xl px-6 py-5 pl-14 text-white outline-none transition-all duration-300 font-mono text-sm shadow-inner`}
                value={email}
                onFocus={() => setIsFocused('email')}
                onBlur={() => setIsFocused(null)}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className={`absolute left-5 top-5 w-6 h-6 transition-colors duration-300 ${isFocused === 'email' ? 'text-emerald-400' : 'text-zinc-600'}`} />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Secure_Line (Phone)</label>
            <div className="relative">
              <input 
                type="text" 
                className={`w-full bg-zinc-950/50 border ${isFocused === 'phone' ? 'border-emerald-500/50 ring-4 ring-emerald-500/5' : 'border-white/5'} rounded-2xl px-6 py-5 pl-14 text-white outline-none transition-all duration-300 font-mono text-sm shadow-inner`}
                value={phone}
                onFocus={() => setIsFocused('phone')}
                onBlur={() => setIsFocused(null)}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Phone className={`absolute left-5 top-5 w-6 h-6 transition-colors duration-300 ${isFocused === 'phone' ? 'text-emerald-400' : 'text-zinc-600'}`} />
            </div>
          </div>

          <button className="w-full bg-emerald-600 text-white hover:bg-emerald-500 font-black py-6 rounded-[1.5rem] transition-all duration-300 shadow-2xl shadow-emerald-900/20 uppercase tracking-[0.3em] text-[11px] flex items-center justify-center group active:scale-[0.98]">
            <Save className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
            Synchronize_Profile
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-center space-x-4 opacity-30">
          <Terminal className="w-4 h-4 text-zinc-500" />
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono text-center">
            Subject_UID: {username?.toUpperCase() || 'UNSET'}
          </p>
        </div>
      </div>
    </div>
  );
};

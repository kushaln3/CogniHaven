import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, User } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      navigate('/soc-admin');
    } else {
      alert("Invalid Admin Credentials");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-red-500/10 p-4 rounded-2xl mb-4 border border-red-500/20">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tighter">SOC COMMAND CENTER</h1>
          <p className="text-slate-500 text-xs uppercase tracking-[0.2em] mt-1">Authorization Required</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <div className="relative">
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 pl-12 text-white outline-none focus:border-red-500 transition-colors"
                placeholder="Admin Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <User className="absolute left-4 top-4.5 w-5 h-5 text-slate-500" />
            </div>
          </div>
          <div>
            <div className="relative">
              <input 
                type="password" 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 pl-12 text-white outline-none focus:border-red-500 transition-colors"
                placeholder="Access Key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute left-4 top-4.5 w-5 h-5 text-slate-500" />
            </div>
          </div>
          <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-900/20 uppercase tracking-widest text-xs">
            Initiate Session
          </button>
        </form>
      </div>
    </div>
  );
};

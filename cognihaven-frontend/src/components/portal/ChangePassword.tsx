import React, { useState, useEffect } from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const ChangePassword: React.FC = () => {
  const { setAction } = useTelemetry();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');

  useEffect(() => {
    setAction("view_change_password");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAction("execute_change_password");
    alert("Password change request submitted.");
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
        <Lock className="w-5 h-5 mr-2 text-indigo-600" /> Security Settings
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
          <input 
            type="password" 
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
          <input 
            type="password" 
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
          />
        </div>
        <button className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-colors flex items-center justify-center shadow-lg">
          <RefreshCw className="w-4 h-4 mr-2" /> Update Password
        </button>
      </form>
    </div>
  );
};

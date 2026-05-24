import React, { useState, useEffect } from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const ChangePassword: React.FC = () => {
  const { setAction, showNotification, needsOtp, isFrozen, sessionId } = useTelemetry();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');

  useEffect(() => {
    setAction("view_change_password");
  }, []);

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
        showNotification("Password updated successfully.");
        setOldPass('');
        setNewPass('');
      } else {
        const error = await response.json();
        showNotification(error.detail || "Failed to update password.", "error");
      }
    } catch (err) {
      showNotification("Failed to connect to security server.", "error");
    }
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

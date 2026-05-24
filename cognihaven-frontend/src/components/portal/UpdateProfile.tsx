import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Save } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const UpdateProfile: React.FC = () => {
  const { setAction, username, showNotification, needsOtp, isFrozen, sessionId } = useTelemetry();
  const [email, setEmail] = useState(`${username?.toLowerCase().replace(/\s+/g, '.')}@cognihaven.com`);
  const [phone, setPhone] = useState('+1 (555) 0123-4567');

  useEffect(() => {
    setAction("view_profile_update");
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsOtp || isFrozen) {
      showNotification("Update blocked: Security verification required", "error");
      return;
    }
    try {
      const response = await fetch('https://7k2k6kcj-8000.inc1.devtunnels.ms/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId,
          email,
          phone
        }),
      });
      if (response.ok) {
        // We trigger both for the demo "Identity Wipe" rule
        setAction("execute_profile_update", { changes: ["email", "phone"] });
        showNotification("Profile updated successfully.");
      }
    } catch (err) {
      showNotification("Failed to update profile.", "error");
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
        <User className="w-5 h-5 mr-2 text-indigo-600" /> Account Information
      </h2>
      <form onSubmit={handleUpdate} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <input 
              type="email" 
              className="w-full px-4 py-3 pl-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
          <div className="relative">
            <input 
              type="text" 
              className="w-full px-4 py-3 pl-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
          </div>
        </div>
        <button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center shadow-lg">
          <Save className="w-5 h-5 mr-2" /> Save Changes
        </button>
      </form>
    </div>
  );
};

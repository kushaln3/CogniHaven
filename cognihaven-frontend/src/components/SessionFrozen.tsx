import React from 'react';
import { ShieldAlert, XCircle, LogOut } from 'lucide-react';

export const SessionFrozen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-red-500/30 shadow-2xl shadow-red-500/10 text-center">
        <div className="bg-red-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Security Protocol Active</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Your current session has been <span className="text-red-400 font-semibold">frozen</span> due to highly anomalous behavioral patterns. Access is restricted to protect your account.
        </p>

        <div className="bg-slate-900/50 rounded-2xl p-6 mb-8 text-left border border-slate-700">
          <div className="flex items-start mb-4">
            <XCircle className="w-5 h-5 text-slate-500 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-semibold text-slate-300">Identity Not Verified</p>
              <p className="text-xs text-slate-500">Interaction dynamics do not match established baseline.</p>
            </div>
          </div>
          <div className="flex items-start">
            <XCircle className="w-5 h-5 text-slate-500 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-semibold text-slate-300">Account Locked</p>
              <p className="text-xs text-slate-500">Contact bank administration to restore access.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => window.location.href = '/'}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 rounded-2xl transition-all flex items-center justify-center"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout & Reset
        </button>
      </div>
    </div>
  );
};

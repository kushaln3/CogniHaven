import React, { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ShieldAlert, Users, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

const mockHistory = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  score: Math.floor(Math.random() * 20) + 10,
}));

export const SOCDashboard: React.FC = () => {
  const [data, setData] = useState(mockHistory);
  const [activeAlerts] = useState([
    { id: 1, user: 'Sarah J.', risk: 24, status: 'Safe', time: 'Just now' },
    { id: 2, user: 'John D.', risk: 82, status: 'Frozen', time: '2 mins ago' },
    { id: 3, user: 'Mike R.', risk: 45, status: 'OTP Sent', time: '5 mins ago' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => [...prev.slice(1), { time: prev[prev.length - 1].time + 1, score: Math.floor(Math.random() * 40) + 10 }]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-mono">
      <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div className="flex items-center">
          <ShieldAlert className="w-8 h-8 text-indigo-400 mr-4" />
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">COGNIDASH // SOC_v1.0.4</h1>
            <p className="text-slate-500 text-xs uppercase tracking-widest">Continuous Behavioral Monitoring System</p>
          </div>
        </div>
        <div className="flex space-x-6 text-right">
          <div>
            <p className="text-slate-500 text-[10px] uppercase">System Status</p>
            <p className="text-green-400 text-sm font-bold flex items-center justify-end">
              <Activity className="w-4 h-4 mr-1 animate-pulse" /> OPERATIONAL
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase">Active Sessions</p>
            <p className="text-white text-sm font-bold">1,204</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <Users className="text-indigo-400 w-5 h-5" />
            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-400">REAL-TIME</span>
          </div>
          <p className="text-slate-400 text-xs mb-1 uppercase tracking-tight">Avg. Risk Score</p>
          <h3 className="text-3xl font-bold text-white">18.4</h3>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <AlertTriangle className="text-amber-400 w-5 h-5" />
            <span className="text-[10px] bg-amber-900/30 px-2 py-0.5 rounded text-amber-400">WARNING</span>
          </div>
          <p className="text-slate-400 text-xs mb-1 uppercase tracking-tight">Mid-Risk Alerts</p>
          <h3 className="text-3xl font-bold text-white">12</h3>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <ShieldAlert className="text-red-400 w-5 h-5" />
            <span className="text-[10px] bg-red-900/30 px-2 py-0.5 rounded text-red-400">CRITICAL</span>
          </div>
          <p className="text-slate-400 text-xs mb-1 uppercase tracking-tight">Session Freezes</p>
          <h3 className="text-3xl font-bold text-white">2</h3>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <ShieldCheck className="text-green-400 w-5 h-5" />
            <span className="text-[10px] bg-green-900/30 px-2 py-0.5 rounded text-green-400">STABLE</span>
          </div>
          <p className="text-slate-400 text-xs mb-1 uppercase tracking-tight">Verified Users</p>
          <h3 className="text-3xl font-bold text-white">99.8%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-xl border border-slate-700 h-[400px]">
          <h2 className="text-sm font-bold mb-6 text-slate-300 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Live Fleet Risk Analytics</h2>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} hide />
              <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#818cf8' }}
              />
              <Area type="monotone" dataKey="score" stroke="#6366f1" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h2 className="text-sm font-bold mb-6 text-slate-300 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Anomaly Event Log</h2>
          <div className="space-y-4">
            {activeAlerts.map(alert => (
              <div key={alert.id} className="p-3 bg-slate-900/50 rounded border border-slate-700 flex justify-between items-center group hover:border-indigo-500 transition-colors">
                <div>
                  <p className="text-xs font-bold text-slate-200">{alert.user}</p>
                  <p className="text-[10px] text-slate-500">{alert.time}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${alert.risk > 80 ? 'text-red-400' : alert.risk > 40 ? 'text-amber-400' : 'text-green-400'}`}>
                    Risk: {alert.risk}
                  </p>
                  <p className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {alert.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 border border-slate-700 rounded text-[10px] text-slate-500 hover:bg-slate-700 hover:text-slate-300 transition-all uppercase tracking-widest">
            Export Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Users, Terminal, Search, ChevronLeft, RefreshCw, UserPlus, Trash2, Info, X, Zap, Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AuditLog {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  risk_score: number;
  status: string;
  behavior_data?: {
    dwell: number;
    flight: number;
    velocity: number;
  };
  enrolled_data?: {
    dwell_mu: number;
    flight_mu: number;
    velocity_mu: number;
    classification: string;
  };
  strike_count: number;
}

interface UserSummary {
  id: number;
  username: string;
  is_enrolled: boolean;
  classification: string;
}

export const LiveSOC: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [inspectedLog, setInspectedLog] = useState<AuditLog | null>(null);
  const [stats, setStats] = useState({ total: 0, blocked: 0, alerts: 0 });
  const [view, setView] = useState<'threats' | 'users'>('threats');
  const [newUsername, setNewUsername] = useState('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    try {
      const logRes = await fetch('https://7k2k6kcj-8000.inc1.devtunnels.ms/api/admin/logs');
      if (logRes.ok) {
        const data = await logRes.json();
        setLogs(data);
        const blocked = data.filter((l: AuditLog) => l.status === 'blocked').length;
        const alerts = data.filter((l: AuditLog) => l.status === 'otp_triggered').length;
        setStats({ total: data.length, blocked, alerts });
      }

      const userRes = await fetch('https://7k2k6kcj-8000.inc1.devtunnels.ms/api/admin/users');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error("SOC Polling Error:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateUser = async () => {
    if (!newUsername) return;
    try {
      const response = await fetch('https://7k2k6kcj-8000.inc1.devtunnels.ms/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername }),
      });
      if (response.ok) {
        showNotify(`User ${newUsername} created! Default password: 'password'`);
        setNewUsername('');
        fetchData();
      } else {
        const error = await response.json();
        showNotify(error.detail || 'Failed to create user', 'error');
      }
    } catch (err) {
      showNotify("Connection to backend failed", 'error');
    }
  };

  const handleResetBiometrics = async (uname: string) => {
    if (!window.confirm(`Reset biometrics for ${uname}?`)) return;
    try {
      const response = await fetch('https://7k2k6kcj-8000.inc1.devtunnels.ms/api/admin/reset-biometrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname }),
      });
      if (response.ok) {
        showNotify(`Biometrics reset for ${uname}`);
        fetchData();
      }
    } catch (err) {
      showNotify("Error connecting to backend", 'error');
    }
  };

  const handleDeleteUser = async (uname: string) => {
    if (!window.confirm(`PERMANENTLY DELETE user ${uname}?`)) return;
    try {
      const response = await fetch('https://7k2k6kcj-8000.inc1.devtunnels.ms/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname }),
      });
      if (response.ok) {
        showNotify(`User ${uname} purged from registry`);
        fetchData();
      }
    } catch (err) {
      showNotify("Error connecting to backend", 'error');
    }
  };

  const filteredLogs = selectedUser 
    ? logs.filter(l => l.username === selectedUser)
    : logs.filter(l => l.status !== 'allowed');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono p-8 transition-colors duration-500">
      {/* GLOBAL NOTIFICATION SYSTEM */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[1000] p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-8 duration-300 flex items-center ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-3 animate-pulse ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
          <span className="text-xs font-bold uppercase tracking-wider font-mono">{notification.message}</span>
        </div>
      )}

      {/* Investigation Modal */}
      {inspectedLog && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/40">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-widest text-white uppercase">
                    Incident Audit Report // {inspectedLog.id}
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">CogniHaven Behavioral Intelligence Unit</p>
                </div>
              </div>
              <button onClick={() => setInspectedLog(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-500 hover:text-white" />
              </button>
            </div>
            
            <div className="p-8 space-y-10 max-h-[85vh] overflow-y-auto">
              {/* Header Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 text-center shadow-inner">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Interaction Risk</p>
                  <div className={`text-4xl font-bold ${inspectedLog.risk_score > 65 ? 'text-red-500' : inspectedLog.risk_score > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {inspectedLog.risk_score}<span className="text-sm text-slate-700 ml-1">%</span>
                  </div>
                </div>
                <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 text-center relative group shadow-inner">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center justify-center">
                    Anomaly Strikes <Zap className="w-3 h-3 ml-1 text-amber-500" />
                  </p>
                  <div className="text-4xl font-bold text-white">
                    {inspectedLog.strike_count}<span className="text-sm text-slate-700 ml-1">/3</span>
                  </div>
                  <div className="absolute top-full left-0 w-64 p-3 bg-slate-800 text-[9px] text-slate-300 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-slate-700 mt-2 text-left pointer-events-none">
                    <span className="text-amber-400 font-bold block mb-1 uppercase tracking-tighter">Persistence Threshold</span>
                    To prevent false positives, CogniHaven requires 3 consecutive anomalous batches before a full block. 
                    Risk &gt; 65 triggers a strike. Risk &lt; 30 resets them.
                  </div>
                </div>
                <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 text-center shadow-inner">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Subject Speed</p>
                  <div className="text-xl font-bold text-indigo-400 uppercase">
                    {inspectedLog.enrolled_data?.classification || 'Unknown'}
                  </div>
                </div>
              </div>

              {/* Vector Comparison Table */}
              <div className="bg-slate-950/30 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <Target className="w-4 h-4 mr-2 text-indigo-400" /> Behavioral Vector Delta
                  </h3>
                  <div className="flex space-x-4">
                    <span className="flex items-center text-[9px] text-slate-600 uppercase font-bold">
                       <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span> Enrolled
                    </span>
                    <span className="flex items-center text-[9px] text-slate-600 uppercase font-bold">
                       <span className="w-2 h-2 bg-amber-500 rounded-full mr-1 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span> Observed
                    </span>
                  </div>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] text-slate-600 uppercase border-b border-slate-800 bg-slate-900/20">
                    <tr>
                      <th className="px-6 py-4">Metric</th>
                      <th className="px-6 py-4 text-center">Baseline</th>
                      <th className="px-6 py-4 text-center">Current</th>
                      <th className="px-6 py-4 text-center">Interpretation</th>
                      <th className="px-6 py-4 text-right">Drift Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {[
                      { label: 'Dwell Time', base: inspectedLog.enrolled_data?.dwell_mu, cur: inspectedLog.behavior_data?.dwell, unit: 'ms', desc: 'Hold Duration' },
                      { label: 'Flight Time', base: inspectedLog.enrolled_data?.flight_mu, cur: inspectedLog.behavior_data?.flight, unit: 'ms', desc: 'Travel Speed' },
                      { label: 'Mouse Velocity', base: inspectedLog.enrolled_data?.velocity_mu, cur: inspectedLog.behavior_data?.velocity, unit: 'px/ms', desc: 'Cursor Agility' }
                    ].map(metric => {
                      if (metric.base === undefined || metric.cur === undefined) return null;
                      const diff = ((metric.cur - metric.base) / metric.base * 100).toFixed(1);
                      const absDiff = Math.abs(parseFloat(diff));
                      
                      // Human Interpretation logic
                      let interpretation = "In Bounds";
                      let rating = "Normal";
                      let color = "text-emerald-500";
                      let icon = <CheckCircle2 className="w-3 h-3 mr-1" />;

                      if (absDiff > 100) { interpretation = parseFloat(diff) > 0 ? "Extreme Lag" : "Extreme Speed"; rating = "Critical"; color = "text-red-500"; icon = <ShieldAlert className="w-3 h-3 mr-1" />; }
                      else if (absDiff > 50) { interpretation = parseFloat(diff) > 0 ? "Heavy Latency" : "Rapid Burst"; rating = "Suspicious"; color = "text-amber-500"; icon = <AlertTriangle className="w-3 h-3 mr-1" />; }
                      else if (absDiff > 30) { interpretation = parseFloat(diff) > 0 ? "Slight Drift" : "Slight Acceleration"; rating = "Caution"; color = "text-amber-400"; icon = <Activity className="w-3 h-3 mr-1" />; }

                      return (
                        <tr key={metric.label} className={`hover:bg-indigo-500/5 transition-colors duration-200 ${absDiff > 50 ? 'bg-red-500/5' : ''}`}>
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-300 block">{metric.label}</span>
                            <span className="text-[9px] text-slate-600 uppercase tracking-tighter">{metric.desc}</span>
                          </td>
                          <td className="px-6 py-4 text-center text-indigo-400 font-mono text-sm opacity-80">{metric.base}{metric.unit}</td>
                          <td className="px-6 py-4 text-center text-amber-400 font-mono text-sm font-bold">{metric.cur}{metric.unit}</td>
                          <td className={`px-6 py-4 text-center font-bold text-[10px] uppercase ${color} flex items-center justify-center mt-2`}>
                            {icon} {interpretation}
                          </td>
                          <td className={`px-6 py-4 text-right font-bold font-mono text-sm ${color}`}>
                            {parseFloat(diff) > 0 ? '↑' : '↓'} {absDiff}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Risk Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-indigo-400" /> Automated Forensic Log
                  </h3>
                  <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl min-h-[120px] shadow-inner">
                    <ul className="space-y-3">
                      {inspectedLog.action.includes('[') ? (
                        inspectedLog.action.split('[')[1].replace(']', '').split(',').map((reason, i) => (
                          <li key={i} className="flex items-start text-xs text-slate-300 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-3 flex-shrink-0 shadow-[0_0_8px_rgba(239,44,44,0.6)]"></span>
                            {reason.trim()}
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-slate-600 italic">No heuristic flags triggered. Risk calculated via holistic statistical drift.</li>
                      )}
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <ShieldAlert className="w-4 h-4 mr-2 text-indigo-400" /> Security Protocol Response
                  </h3>
                  <div className={`p-6 rounded-2xl border transition-all duration-500 shadow-lg flex flex-col items-center justify-center text-center space-y-2 h-[120px] ${
                    inspectedLog.status === 'blocked' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
                    inspectedLog.status === 'otp_triggered' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  }`}>
                    <span className="text-xs font-bold uppercase tracking-widest tracking-widest">{inspectedLog.status}</span>
                    <p className="text-[10px] font-medium opacity-80 leading-tight">
                      {inspectedLog.status === 'blocked' ? 'Session terminated immediately. IP address logged for forensic review.' : 
                       inspectedLog.status === 'otp_triggered' ? 'Secondary challenge forced. Interaction velocity restricted.' : 'Interaction within baseline variance. Monitoring active.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 text-[10px] text-slate-600 flex justify-between uppercase font-bold tracking-widest font-sans">
                <span>Subject ID: {inspectedLog.username}</span>
                <span>System Time (IST): {new Date(inspectedLog.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div className="flex items-center group cursor-pointer">
          <div className="bg-red-500 p-2.5 rounded-xl mr-4 animate-pulse shadow-[0_0_15px_rgba(239,44,44,0.4)]">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white group-hover:text-indigo-400 transition-colors">COGNIDASH // SEC_OPS_CORE</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Autonomous Behavioral Intelligence Stream</p>
          </div>
        </div>
        <nav className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button 
            onClick={() => {setView('threats'); setSelectedUser(null);}}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${view === 'threats' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            THREAT_FEED
          </button>
          <button 
            onClick={() => setView('users')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${view === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            USER_REGISTRY
          </button>
        </nav>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl shadow-xl transition-transform hover:scale-[1.02] duration-300">
          <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold tracking-widest">System Health</p>
          <h3 className="text-4xl font-black flex items-center text-white">
            <Activity className="w-6 h-6 mr-3 text-emerald-500" /> ACTIVE
          </h3>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl border-l-4 border-l-amber-500 shadow-xl transition-transform hover:scale-[1.02] duration-300">
          <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold tracking-widest">Active Alerts</p>
          <h3 className="text-4xl font-black text-amber-400">{stats.alerts}</h3>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl border-l-4 border-l-red-500 shadow-xl transition-transform hover:scale-[1.02] duration-300">
          <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold tracking-widest">Prevented Threats</p>
          <h3 className="text-4xl font-black text-red-500">{stats.blocked}</h3>
        </div>
      </div>

      {view === 'threats' ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center text-slate-400 text-[10px] uppercase tracking-widest font-black">
              {selectedUser ? (
                <button onClick={() => setSelectedUser(null)} className="flex items-center hover:text-white mr-4 transition-colors p-1 bg-slate-800 rounded-lg">
                  <ChevronLeft className="w-4 h-4 mr-1" /> BACK
                </button>
              ) : <Terminal className="w-4 h-4 mr-3 text-indigo-500" />}
              {selectedUser ? `Investigation: ${selectedUser}` : 'Real-Time Threat Intelligence Stream'}
            </div>
            <div className="flex items-center space-x-2">
               <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
               <span className="text-[9px] text-red-500 font-bold tracking-widest">LIVE MONITORING</span>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto font-mono custom-scrollbar">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-900 text-slate-500 sticky top-0 border-b border-slate-800 z-10">
                <tr>
                  <th className="px-6 py-5 uppercase tracking-widest text-[9px] font-black">Time</th>
                  <th className="px-6 py-5 uppercase tracking-widest text-[9px] font-black">Subject</th>
                  <th className="px-6 py-5 uppercase tracking-widest text-[9px] font-black">Interaction Event</th>
                  <th className="px-6 py-5 uppercase tracking-widest text-[9px] font-black text-center">Risk</th>
                  <th className="px-6 py-5 uppercase tracking-widest text-[9px] font-black text-right">Protocol</th>
                  <th className="px-6 py-5 text-center text-[9px] font-black">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                  <tr key={log.id} className={`group hover:bg-indigo-500/5 transition-all duration-200 cursor-default ${
                    log.status === 'blocked' ? 'bg-red-500/5' : 
                    log.status === 'otp_triggered' ? 'bg-amber-500/5' : ''
                  }`}>
                    <td className="px-6 py-5 text-slate-500 italic font-medium">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="px-6 py-5 font-bold text-slate-200 uppercase tracking-tighter">
                      <button onClick={() => {setSelectedUser(log.username); setView('threats');}} className="hover:text-indigo-400 transition-colors border-b border-transparent hover:border-indigo-400 pb-0.5">
                        {log.username}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-slate-400 font-medium">{log.action}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className={`inline-block px-2 py-1 rounded font-black font-mono text-xs ${log.risk_score > 65 ? 'text-red-500 bg-red-500/10' : log.risk_score > 30 ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                        {log.risk_score.toString().padStart(2, '0')}%
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className={`uppercase font-black tracking-widest text-[9px] px-3 py-1.5 rounded-full border shadow-sm ${
                        log.status === 'blocked' ? 'text-red-500 border-red-500/30 bg-red-500/5 animate-pulse' : 
                        log.status === 'otp_triggered' ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' : 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button onClick={() => setInspectedLog(log)} className="p-2.5 text-slate-600 hover:text-white hover:bg-slate-800 rounded-xl transition-all shadow-md active:scale-90">
                        <Info className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center">
                       <Activity className="w-10 h-10 text-slate-800 mx-auto mb-4 opacity-20" />
                       <p className="text-slate-600 italic tracking-widest uppercase text-[10px] font-black">Buffer Clean // Intelligence Stream Active</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <h2 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-widest flex items-center">
              <UserPlus className="w-5 h-5 mr-3 text-indigo-500" /> Provision New Identity
            </h2>
            <div className="flex space-x-4">
              <input 
                type="text" 
                className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 text-sm outline-none focus:border-indigo-500 text-white transition-all shadow-inner font-bold"
                placeholder="Unique Subject ID..."
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <button 
                onClick={handleCreateUser}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                COMMIT
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <h2 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-widest flex items-center">
              <Users className="w-5 h-5 mr-3 text-indigo-500" /> Behavioral Registry
            </h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-6 bg-slate-950 rounded-2xl border border-slate-800 group hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-300 shadow-inner">
                  <div>
                    <p className="text-sm font-black text-slate-200 uppercase tracking-tighter">{user.username}</p>
                    <div className="flex items-center mt-2.5 space-x-3">
                      <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest border ${
                        user.is_enrolled ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        {user.is_enrolled ? 'ENROLLED' : 'PENDING'}
                      </span>
                      {user.is_enrolled && (
                        <span className="text-[9px] bg-indigo-500/5 text-indigo-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-indigo-500/20">
                          {user.classification} PROFILE
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 duration-300">
                    <button 
                      onClick={() => {setSelectedUser(user.username); setView('threats');}}
                      className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white hover:bg-indigo-600 transition-all shadow-md active:scale-90"
                      title="Audit History"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleResetBiometrics(user.username)}
                      className="p-3 bg-slate-800 text-amber-500/70 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-md active:scale-90"
                      title="Reset Biometrics"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.username)}
                      className="p-3 bg-slate-800 text-red-500/70 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-90"
                      title="Purge Identity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

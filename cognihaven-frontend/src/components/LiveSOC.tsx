import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Users, Terminal, Search, ChevronLeft, RefreshCw, UserPlus, Trash2, Info, X } from 'lucide-react';

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

  const fetchData = async () => {
    try {
      const logRes = await fetch('http://localhost:8000/api/admin/logs');
      if (logRes.ok) {
        const data = await logRes.json();
        setLogs(data);
        const blocked = data.filter((l: AuditLog) => l.status === 'blocked').length;
        const alerts = data.filter((l: AuditLog) => l.status === 'otp_triggered').length;
        setStats({ total: data.length, blocked, alerts });
      }

      const userRes = await fetch('http://localhost:8000/api/admin/users');
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
      const response = await fetch('http://localhost:8000/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername }),
      });
      if (response.ok) {
        alert(`User ${newUsername} created successfully! Default password is 'password'.`);
        setNewUsername('');
        fetchData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to create user'}`);
      }
    } catch (err) {
      alert("Could not connect to backend server. Is it running on port 8000?");
    }
  };

  const handleResetBiometrics = async (uname: string) => {
    if (!window.confirm(`Reset biometrics for ${uname}?`)) return;
    try {
      const response = await fetch('http://localhost:8000/api/admin/reset-biometrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname }),
      });
      if (response.ok) {
        alert(`Biometrics reset for ${uname}.`);
        fetchData();
      }
    } catch (err) {
      alert("Error connecting to backend.");
    }
  };

  const handleDeleteUser = async (uname: string) => {
    if (!window.confirm(`PERMANENTLY DELETE user ${uname}? This will wipe all logs.`)) return;
    try {
      const response = await fetch('http://localhost:8000/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname }),
      });
      if (response.ok) {
        alert(`User ${uname} deleted.`);
        fetchData();
      }
    } catch (err) {
      alert("Error connecting to backend.");
    }
  };

  const filteredLogs = selectedUser 
    ? logs.filter(l => l.username === selectedUser)
    : logs.filter(l => l.status !== 'allowed');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono p-8">
      {/* Investigation Modal */}
      {inspectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-sm font-bold tracking-widest text-indigo-400 flex items-center uppercase">
                <Terminal className="w-4 h-4 mr-2" /> Threat Analysis Report // Log_{inspectedLog.id}
              </h2>
              <button onClick={() => setInspectedLog(null)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest">Incident Context</p>
                  <div className="space-y-2 text-xs">
                    <p className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Subject:</span> 
                      <span className="text-white font-bold">{inspectedLog.username}</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Timestamp:</span> 
                      <span className="text-slate-300">{new Date(inspectedLog.timestamp).toLocaleString()}</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Protocol:</span> 
                      <span className={`font-bold uppercase ${inspectedLog.status === 'blocked' ? 'text-red-500' : 'text-amber-500'}`}>{inspectedLog.status}</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Anomalies:</span> 
                      <span className="text-amber-400">Strikes {inspectedLog.strike_count}/3</span>
                    </p>
                  </div>
                </div>
                
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                   <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Aggregated Risk</p>
                   <div className="relative flex items-center justify-center">
                     <div className={`text-5xl font-bold ${inspectedLog.risk_score > 65 ? 'text-red-500' : 'text-amber-500'}`}>
                       {inspectedLog.risk_score}
                     </div>
                     <div className="absolute inset-0 border-4 border-slate-800 rounded-full scale-150 opacity-20"></div>
                   </div>
                   <p className="text-[9px] text-slate-600 mt-4 text-center leading-tight uppercase">High-Confidence Behavioral Anomaly Detected</p>
                </div>
              </div>

              {inspectedLog.enrolled_data && inspectedLog.behavior_data ? (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-4 tracking-widest">Vector Comparison (Baseline vs Current)</p>
                  <div className="space-y-4">
                    {[
                      { label: 'Dwell Time', base: inspectedLog.enrolled_data.dwell_mu, cur: inspectedLog.behavior_data.dwell, unit: 'ms' },
                      { label: 'Flight Time', base: inspectedLog.enrolled_data.flight_mu, cur: inspectedLog.behavior_data.flight, unit: 'ms' },
                      { label: 'Velocity', base: inspectedLog.enrolled_data.velocity_mu, cur: inspectedLog.behavior_data.velocity, unit: 'px/ms' }
                    ].map(metric => {
                      const diff = ((metric.cur - metric.base) / metric.base * 100).toFixed(1);
                      const isHigh = Math.abs(parseFloat(diff)) > 30;
                      return (
                        <div key={metric.label} className="space-y-2">
                          <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                            <span className="text-slate-400">{metric.label}</span>
                            <span className={isHigh ? 'text-amber-500' : 'text-slate-500'}>Deviation: {diff}%</span>
                          </div>
                          <div className="h-2 bg-slate-950 rounded-full flex overflow-hidden border border-slate-800">
                            <div className="h-full bg-indigo-500/40 border-r border-indigo-400" style={{ width: '45%' }}></div>
                            <div className={`h-full ${isHigh ? 'bg-amber-500' : 'bg-slate-700'}`} style={{ width: `${Math.min(100, (metric.cur/metric.base) * 45)}%` }}></div>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-600">
                            <span>ENROLLED: {metric.base}{metric.unit}</span>
                            <span>CURRENT: {metric.cur}{metric.unit}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-6 p-4 bg-indigo-500/5 rounded-lg border border-indigo-500/20">
                    <p className="text-[10px] text-indigo-300 leading-relaxed italic">
                      SYSTEM_NOTE: User "{inspectedLog.username}" is enrolled as a <span className="text-white font-bold">{inspectedLog.enrolled_data.classification}</span> typist. 
                      Current interaction pattern matches an outlier distribution.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-600 uppercase tracking-widest italic">Behavioral Profiling Step Incomplete // Raw Telemetry Only</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div className="flex items-center">
          <div className="bg-red-500 p-2 rounded mr-4 animate-pulse">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-white">COGNIDASH // SEC_OPS_CORE</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Live Behavioral Intelligence Stream</p>
          </div>
        </div>
        <nav className="flex space-x-4">
          <button 
            onClick={() => {setView('threats'); setSelectedUser(null);}}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'threats' ? 'bg-red-600 text-white' : 'bg-slate-900 text-slate-400'}`}
          >
            THREAT_FEED
          </button>
          <button 
            onClick={() => setView('users')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'users' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'}`}
          >
            USER_REGISTRY
          </button>
        </nav>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
          <p className="text-[10px] text-slate-500 mb-2 uppercase">System Health</p>
          <h3 className="text-3xl font-bold flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-500" /> ACTIVE
          </h3>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl border-l-4 border-l-amber-500">
          <p className="text-[10px] text-slate-500 mb-2 uppercase">OTP Challenges</p>
          <h3 className="text-3xl font-bold text-amber-400">{stats.alerts}</h3>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl border-l-4 border-l-red-500">
          <p className="text-[10px] text-slate-500 mb-2 uppercase">Blocked Threats</p>
          <h3 className="text-3xl font-bold text-red-500">{stats.blocked}</h3>
        </div>
      </div>

      {view === 'threats' ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
            <div className="flex items-center text-slate-400 text-xs uppercase tracking-widest font-bold">
              {selectedUser ? (
                <button onClick={() => setSelectedUser(null)} className="flex items-center hover:text-white mr-4">
                  <ChevronLeft className="w-4 h-4 mr-1" /> BACK
                </button>
              ) : <Terminal className="w-4 h-4 mr-2" />}
              {selectedUser ? `Investigation: ${selectedUser}` : 'Real-Time Threat Stream'}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto font-mono">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-900 text-slate-500 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 uppercase">Timestamp (IST)</th>
                  <th className="px-6 py-4 uppercase">Subject</th>
                  <th className="px-6 py-4 uppercase">Interaction [Justification]</th>
                  <th className="px-6 py-4 uppercase text-center">Risk</th>
                  <th className="px-6 py-4 uppercase text-right">Protocol</th>
                  <th className="px-6 py-4 text-center">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                  <tr key={log.id} className={`group hover:bg-slate-800/30 transition-colors ${
                    log.status === 'blocked' ? 'bg-red-500/10' : 
                    log.status === 'otp_triggered' ? 'bg-amber-500/10' : ''
                  }`}>
                    <td className="px-6 py-4 text-slate-500 italic">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-200 uppercase tracking-tighter">
                      <button onClick={() => {setSelectedUser(log.username); setView('threats');}} className="hover:underline">
                        {log.username}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${log.risk_score > 65 ? 'text-red-500' : log.risk_score > 30 ? 'text-amber-500' : 'text-green-500'}`}>
                        {log.risk_score.toString().padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`uppercase font-bold tracking-widest text-[9px] px-2 py-1 rounded border ${
                        log.status === 'blocked' ? 'text-red-500 border-red-500/50 animate-pulse' : 
                        log.status === 'otp_triggered' ? 'text-amber-500 border-amber-500/50' : 'text-green-500 border-green-500/50'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => setInspectedLog(log)} className="text-slate-600 hover:text-white">
                        <Info className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-600 italic tracking-widest uppercase text-[10px]">Buffer Clean // Monitoring Active</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest flex items-center">
              <UserPlus className="w-4 h-4 mr-2" /> Provision New Identity
            </h2>
            <div className="flex space-x-4">
              <input 
                type="text" 
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
                placeholder="Unique ID..."
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <button 
                onClick={handleCreateUser}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                COMMIT
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest flex items-center">
              <Users className="w-4 h-4 mr-2" /> Behavioral Registry
            </h2>
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 group hover:border-slate-600 transition-all">
                  <div>
                    <p className="text-xs font-bold text-slate-200 uppercase tracking-tighter">{user.username}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        user.is_enrolled ? 'bg-green-500/10 text-green-500' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {user.is_enrolled ? 'ENROLLED' : 'PENDING'}
                      </span>
                      {user.is_enrolled && (
                        <span className="text-[8px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase">
                          Profile: {user.classification}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {setSelectedUser(user.username); setView('threats');}}
                      className="p-2 bg-slate-800 text-slate-400 rounded hover:text-white transition-colors"
                      title="Audit History"
                    >
                      <Search className="w-3.5 h-3.4" />
                    </button>
                    <button 
                      onClick={() => handleResetBiometrics(user.username)}
                      className="p-2 bg-slate-800 text-amber-500/50 rounded hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
                      title="Reset Biometrics"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.username)}
                      className="p-2 bg-slate-800 text-red-500/50 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      title="Purge Identity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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

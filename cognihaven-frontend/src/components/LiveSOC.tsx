import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Activity, Terminal, Search, ChevronLeft, ChevronRight, RefreshCw, UserPlus, Trash2, X, Zap, Target, ShieldCheck, Cpu, Globe, Database, Fingerprint } from 'lucide-react';

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
  login_count: number;
  current_balance: number;
}

// --- Kinetic Sub-Components ---

const TelemetryMap = () => {
  return (
    <div className="absolute inset-0 z-0 opacity-10 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" className="absolute inset-0">
        <motion.path
          d="M -100 200 Q 300 100 500 400 T 1200 300"
          stroke="#ef4444"
          strokeWidth="4"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M 1200 600 Q 700 800 400 500 T -100 700"
          stroke="#4f46e5"
          strokeWidth="6"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear", delay: 2 }}
        />
        <motion.path
          d="M 500 -100 Q 600 400 400 800 T 700 1200"
          stroke="#991b1b"
          strokeWidth="3"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 4 }}
        />
      </svg>
    </div>
  );
};

const BentoCard: React.FC<{ children: React.ReactNode, delay?: number, className?: string }> = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] hover:border-white/20 transition-all duration-300 group ${className}`}
  >
    {children}
  </motion.div>
);

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

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCreateUser = async () => {
    if (!newUsername) return;
    try {
      const response = await fetch('http://localhost:8000/api/admin/create-user', {
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
    } catch {
      showNotify("Connection to backend failed", 'error');
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
        showNotify(`Biometrics reset for ${uname}`);
        fetchData();
      }
    } catch {
      showNotify("Error connecting to backend", 'error');
    }
  };

  const handleDeleteUser = async (uname: string) => {
    if (!window.confirm(`PERMANENTLY DELETE user ${uname}?`)) return;
    try {
      const response = await fetch('http://localhost:8000/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname }),
      });
      if (response.ok) {
        showNotify(`User ${uname} purged from registry`);
        fetchData();
      }
    } catch {
      showNotify("Error connecting to backend", 'error');
    }
  };

  const filteredLogs = selectedUser 
    ? logs.filter(l => l.username === selectedUser)
    : logs.filter(l => l.status !== 'allowed');

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans p-6 selection:bg-rose-500/30 relative overflow-hidden">
      <TelemetryMap />

      {/* Global Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className={`fixed top-8 right-8 z-[1000] p-4 rounded-2xl shadow-2xl backdrop-blur-2xl border flex items-center ${
              notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <div className={`w-2 h-2 rounded-full mr-3 animate-pulse ${notification.type === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] font-mono">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto relative z-10">
        {/* Top Navigation / Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="flex items-center group cursor-default">
            <div className="relative mr-6">
              <div className="absolute inset-0 bg-rose-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse"></div>
              <div className="relative bg-zinc-900 border border-white/10 p-4 rounded-2xl shadow-2xl">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white font-['Bebas_Neue'] leading-none">COMMAND<span className="text-zinc-600">DASH</span></h1>
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-[0.3em] font-black">Neural Monitoring Interface Active</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 shadow-2xl flex items-center space-x-1">
            <button 
              onClick={() => {setView('threats'); setSelectedUser(null);}}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${view === 'threats' ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/20' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}
            >
              Intelligence
            </button>
            <button 
              onClick={() => setView('users')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${view === 'users' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}
            >
              Registry
            </button>
          </div>
        </header>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <BentoCard delay={0.1}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">System Status</p>
              <Activity className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-3xl font-black text-white tracking-tighter uppercase font-['Bebas_Neue']">OPERATIONAL</h3>
            <p className="text-[9px] text-zinc-600 mt-2 font-mono uppercase">Latency: 24ms // Uptime: 99.9%</p>
          </BentoCard>

          <BentoCard delay={0.2}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">Active Alerts</p>
              <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
            </div>
            <h3 className="text-4xl font-black text-amber-500 font-mono tracking-tighter">{stats.alerts.toString().padStart(2, '0')}</h3>
            <p className="text-[9px] text-zinc-600 mt-2 font-mono uppercase">Identity Challenges Forced</p>
          </BentoCard>

          <BentoCard delay={0.3}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">Mitigated Risks</p>
              <ShieldCheck className="w-4 h-4 text-rose-500" />
            </div>
            <h3 className="text-4xl font-black text-rose-500 font-mono tracking-tighter">{stats.blocked.toString().padStart(2, '0')}</h3>
            <p className="text-[9px] text-zinc-600 mt-2 font-mono uppercase">Blocks Executed via Heuristics</p>
          </BentoCard>

          <BentoCard delay={0.4} className="overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">Total Events</p>
              <Database className="w-4 h-4 text-indigo-500" />
            </div>
            <h3 className="text-4xl font-black text-white font-mono tracking-tighter">{stats.total.toLocaleString()}</h3>
            <p className="text-[9px] text-zinc-600 mt-2 font-mono uppercase relative z-10">Historical Interactions Indexed</p>
          </BentoCard>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-12 gap-6 items-start">
          
          {/* Main List Column */}
          <div className="col-span-12 lg:col-span-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-zinc-900/20 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 hover:border-white/10"
            >
              {view === 'threats' ? (
                <>
                  <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center mr-5 border border-white/10 shadow-2xl">
                        <Terminal className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                          {selectedUser ? `SESSION_INSPECT // ${selectedUser}` : 'REAL_TIME_INTEL_STREAM'}
                        </h2>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1 italic">Source: Behavioral SDK v2.2</p>
                      </div>
                    </div>
                    {selectedUser && (
                      <button onClick={() => setSelectedUser(null)} className="flex items-center bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all border border-white/5">
                        <ChevronLeft className="w-3 h-3 mr-2" /> CLEAR_FILTER
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto custom-scrollbar max-h-[700px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-zinc-950/30">
                          <th className="px-8 py-6 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Timestamp</th>
                          <th className="px-8 py-6 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Subject</th>
                          <th className="px-8 py-6 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Interaction_Vector</th>
                          <th className="px-8 py-6 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] text-center">Risk_Score</th>
                          <th className="px-8 py-6 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                          <tr key={log.id} className="group hover:bg-white/[0.02] transition-all duration-300 border-b border-white/[0.03] last:border-0">
                            <td className="px-8 py-6 text-[11px] font-mono text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                            <td className="px-8 py-6">
                              <button 
                                onClick={() => setSelectedUser(log.username)}
                                className="text-[11px] font-black text-white uppercase tracking-tighter hover:text-rose-500 transition-colors"
                              >
                                {log.username}
                              </button>
                            </td>
                            <td className="px-8 py-6">
                              <span className="text-[11px] text-zinc-400 font-medium tracking-tight">
                                {log.action.split(' [')[0]}
                                {log.action.includes('[') && (
                                  <span className="text-[9px] text-zinc-600 block mt-1 font-mono uppercase">{log.action.split('[')[1].replace(']', '')}</span>
                                )}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <div className={`inline-flex items-center px-4 py-1.5 rounded-lg font-mono text-[11px] font-black ${
                                log.risk_score > 65 ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' : 
                                log.risk_score > 30 ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' : 
                                'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'
                              }`}>
                                {log.risk_score.toString().padStart(2, '0')}%
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => setInspectedLog(log)}
                                className="p-3 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-500 hover:text-white hover:border-white/20 transition-all hover:bg-zinc-800 shadow-xl active:scale-95"
                              >
                                <Search className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="px-8 py-32 text-center">
                              <Cpu className="w-12 h-12 text-zinc-800 mx-auto mb-6 animate-pulse" />
                              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">No anomalous events detected in current buffer</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {users.map(user => (
                    <motion.div 
                      key={user.id} 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-8 rounded-[2.5rem] hover:border-white/10 transition-all duration-300 group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-all"></div>
                      <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center mr-5 group-hover:border-indigo-500/30 transition-all shadow-2xl">
                            <Fingerprint className="w-6 h-6 text-indigo-500" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-white uppercase tracking-tighter font-['Bebas_Neue']">{user.username}</h4>
                            <p className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase">ID_REF: {user.id.toString().padStart(4, '0')}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={() => handleResetBiometrics(user.username)} className="p-3 bg-zinc-900/50 rounded-xl text-zinc-600 hover:text-amber-500 border border-white/5 hover:border-amber-500/20 transition-all shadow-xl">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteUser(user.username)} className="p-3 bg-zinc-900/50 rounded-xl text-zinc-600 hover:text-rose-500 border border-white/5 hover:border-rose-500/20 transition-all shadow-xl">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                          <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest mb-1">Status</p>
                          <span className={`text-xs font-black uppercase tracking-tighter ${user.is_enrolled ? 'text-emerald-500' : 'text-zinc-600'}`}>
                            {user.is_enrolled ? 'SECURED_ENROLL' : 'PENDING_SYNC'}
                          </span>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                          <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest mb-1">Profile</p>
                          <span className={`text-xs font-black uppercase tracking-tighter ${
                            user.classification === 'Learning' ? 'text-purple-400' : 'text-indigo-400'
                          }`}>
                            {user.classification}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <div className="flex space-x-6">
                          <div>
                            <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Balance</p>
                            <p className="text-[12px] font-mono font-black text-zinc-300 mt-0.5">₹{user.current_balance.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Sessions</p>
                            <p className="text-[12px] font-mono font-black text-zinc-300 mt-0.5">{user.login_count}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {setSelectedUser(user.username); setView('threats');}}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/20 active:scale-95"
                        >
                          FORENSICS
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Bento Column */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Identity Provisioning Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] group relative overflow-hidden shadow-2xl"
            >
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all"></div>
               <div className="flex items-center mb-10">
                  <div className="w-12 h-12 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center mr-5 shadow-2xl">
                    <UserPlus className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none font-['Bebas_Neue']">Provisioning</h3>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Manual Access Injection</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Identity_Sequence</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl px-6 py-5 text-sm outline-none focus:border-indigo-500/50 text-white transition-all shadow-inner font-mono tracking-tight"
                      placeholder="root_operator_00"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleCreateUser}
                    className="w-full bg-white text-zinc-950 hover:bg-zinc-200 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 flex items-center justify-center group"
                  >
                    AUTHORIZE_COMMIT <ChevronRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
                  </button>
               </div>
            </motion.div>

            {/* System Info Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="bg-indigo-600/5 backdrop-blur-xl border border-indigo-500/20 p-10 rounded-[3rem] relative group overflow-hidden shadow-2xl"
            >
              <div className="absolute inset-0 bg-indigo-500/5 animate-pulse"></div>
              <div className="flex items-center mb-8 relative z-10">
                <Globe className="w-6 h-6 text-indigo-400 mr-4" />
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Network_Intelligence</h3>
              </div>
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-indigo-200/40 font-mono font-black uppercase tracking-widest">Node_Loc</span>
                  <span className="text-indigo-100 font-black">MUMBAI_IND_01</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-indigo-200/40 font-mono font-black uppercase tracking-widest">Tunnel_Status</span>
                  <span className="text-emerald-400 font-black flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-2" /> ENCRYPTED
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-indigo-200/40 font-mono font-black uppercase tracking-widest">Protocol</span>
                  <span className="text-indigo-100 font-black">COGNI_v2.2.0</span>
                </div>
              </div>
            </motion.div>

            {/* Active Monitoring Visualizer */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-zinc-900/40 border border-white/5 p-8 rounded-[3rem] overflow-hidden h-[220px] relative flex items-end shadow-2xl"
            >
               <div className="flex items-end justify-between w-full h-[80px] gap-1.5 px-2">
                  {[40, 70, 45, 90, 65, 30, 85, 50, 40, 95, 60, 45, 75, 50, 80, 40, 60].map((h, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 1.5, delay: i * 0.05, repeat: Infinity, repeatType: "reverse" }}
                      className="bg-indigo-500/20 w-full rounded-t-sm" 
                    >
                      <div className="bg-indigo-400 w-full h-[2px] rounded-t-full shadow-[0_0_12px_rgba(129,140,248,0.8)]"></div>
                    </motion.div>
                  ))}
               </div>
               <div className="absolute top-8 left-8">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Real-time Entropy Stream</p>
               </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Audit Detail Modal */}
      <AnimatePresence>
        {inspectedLog && (
          <div className="fixed inset-0 bg-[#000]/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#050505] border border-white/10 rounded-[3.5rem] w-full max-w-5xl overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] relative"
            >
              {/* Header */}
              <div className="p-10 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-4 bg-zinc-900 border border-white/10 rounded-2xl mr-6 shadow-2xl">
                    <Terminal className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase font-['Bebas_Neue'] leading-none">
                      FORENSIC_REPORT // <span className="text-indigo-400">{inspectedLog.id}</span>
                    </h2>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-[0.3em] font-black mt-2">Deep Behavioral Reconstruction Protocol active</p>
                  </div>
                </div>
                <button onClick={() => setInspectedLog(null)} className="w-14 h-14 bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 rounded-full flex items-center justify-center transition-all group shadow-2xl">
                  <X className="w-7 h-7 text-zinc-500 group-hover:text-rose-500" />
                </button>
              </div>

              <div className="p-12 space-y-16 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {/* Top Stats Bento */}
                <div className="grid grid-cols-3 gap-8">
                  <div className="bg-zinc-950/80 border border-white/5 p-10 rounded-[2.5rem] text-center shadow-inner relative group">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em] mb-6">Deviation_Risk</p>
                    <div className={`text-7xl font-black font-mono tracking-tighter leading-none ${inspectedLog.risk_score > 65 ? 'text-rose-500' : inspectedLog.risk_score > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {inspectedLog.risk_score}<span className="text-2xl text-zinc-800 ml-1">%</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/80 border border-white/5 p-10 rounded-[2.5rem] text-center shadow-inner group">
                    <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em] mb-6 flex items-center justify-center">
                      ANOMALY_STRIKES <Zap className="w-3.5 h-3.5 ml-3 text-amber-500 animate-pulse" />
                    </p>
                    <div className="text-7xl font-black font-mono text-white tracking-tighter leading-none">
                      {inspectedLog.strike_count}<span className="text-2xl text-zinc-800 ml-1">/3</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/80 border border-white/5 p-10 rounded-[2.5rem] text-center shadow-inner group">
                    <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em] mb-6">Baseline_Speed</p>
                    <div className="text-4xl font-black text-indigo-400 uppercase tracking-tighter font-['Bebas_Neue'] mt-4">
                      {inspectedLog.enrolled_data?.classification || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Statistical Delta Grid */}
                <div className="space-y-8">
                   <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em] ml-2 flex items-center">
                      <Target className="w-5 h-5 mr-4 text-indigo-500" /> BEHAVIORAL_VECTOR_ANALYSIS
                   </h3>
                   <div className="bg-zinc-950/50 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/5">
                            <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dimension</th>
                            <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Neural_Baseline</th>
                            <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Observed_Signal</th>
                            <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Confidence</th>
                            <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Drift_Delta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] font-mono">
                          {[
                            { label: 'DWELL_DURATION', base: inspectedLog.enrolled_data?.dwell_mu, cur: inspectedLog.behavior_data?.dwell, unit: 'ms' },
                            { label: 'FLIGHT_INTERVAL', base: inspectedLog.enrolled_data?.flight_mu, cur: inspectedLog.behavior_data?.flight, unit: 'ms' },
                            { label: 'CURSOR_VELOCITY', base: inspectedLog.enrolled_data?.velocity_mu, cur: inspectedLog.behavior_data?.velocity, unit: 'px/ms' }
                          ].map(metric => {
                            if (metric.base === undefined || metric.cur === undefined) return null;
                            const diff = ((metric.cur - metric.base) / metric.base * 100).toFixed(1);
                            const absDiff = Math.abs(parseFloat(diff));
                            const color = absDiff > 50 ? 'text-rose-500' : absDiff > 25 ? 'text-amber-500' : 'text-emerald-500';

                            return (
                              <tr key={metric.label} className="group hover:bg-white/[0.01]">
                                <td className="px-10 py-8">
                                  <span className="text-[12px] font-black text-zinc-400 uppercase tracking-tighter">{metric.label}</span>
                                </td>
                                <td className="px-10 py-8 text-center text-indigo-400 text-xs font-bold opacity-60">{metric.base.toFixed(2)}{metric.unit}</td>
                                <td className="px-10 py-8 text-center text-white text-sm font-black tracking-tighter">{metric.cur.toFixed(2)}{metric.unit}</td>
                                <td className="px-10 py-8 text-center">
                                  <div className="w-32 h-2 bg-zinc-900 rounded-full mx-auto overflow-hidden border border-white/5">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.max(10, 100 - absDiff)}%` }}
                                      className={`h-full ${absDiff > 50 ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`}
                                    ></motion.div>
                                  </div>
                                </td>
                                <td className={`px-10 py-8 text-right text-sm font-black ${color}`}>
                                  {parseFloat(diff) > 0 ? '+' : ''}{diff}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                   </div>
                </div>

                {/* Protocol Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em] ml-2">Heuristic_Trace</h3>
                    <div className="bg-zinc-950 p-10 rounded-[3rem] border border-white/5 min-h-[200px] shadow-inner font-mono">
                      <ul className="space-y-6">
                        {inspectedLog.action.includes('[') ? (
                          inspectedLog.action.split('[')[1].replace(']', '').split(',').map((reason, i) => (
                            <li key={i} className="flex items-start text-[11px] text-zinc-300 uppercase leading-relaxed tracking-tight">
                              <span className="w-2 h-2 bg-rose-500 rounded-full mt-1.5 mr-5 shadow-[0_0_12px_#f43f5e] flex-shrink-0"></span>
                              {reason.trim()}
                            </li>
                          ))
                        ) : (
                          <li className="text-[11px] text-zinc-600 italic uppercase tracking-widest text-center mt-8">No heuristic overrides triggered // Pure statistical variance</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em] ml-2">Protocol Resolution</h3>
                    <div className={`p-10 rounded-[3rem] border transition-all duration-700 min-h-[200px] flex flex-col items-center justify-center text-center space-y-6 ${
                      inspectedLog.status === 'blocked' ? 'bg-rose-500/5 border-rose-500/20' : 
                      inspectedLog.status === 'otp_triggered' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'
                    }`}>
                      <div className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.4em] border shadow-2xl ${
                        inspectedLog.status === 'blocked' ? 'text-rose-500 border-rose-500/30 bg-rose-500/10' : 
                        inspectedLog.status === 'otp_triggered' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
                      }`}>
                        {inspectedLog.status}
                      </div>
                      <p className="text-[11px] text-zinc-400 uppercase font-bold leading-relaxed tracking-widest max-w-[320px]">
                        {inspectedLog.status === 'blocked' ? 'MITIGATION_SUCCESS // SYSTEM_ACCESS_REVOKED // FORENSIC_DUMP_STORED' : 
                         inspectedLog.status === 'otp_triggered' ? 'CHALLENGE_ISSUED // MFA_PENDING // RESTRICTED_THROUGHPUT' : 'BASELINE_CONFORMITY_ESTABLISHED // CONTINUOUS_WATCH_ACTIVE'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-10 border-t border-white/5 flex justify-between items-center font-mono opacity-30">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Audit_Subject: {inspectedLog.username}_X_42</span>
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Node_Time: {new Date(inspectedLog.timestamp).toISOString()}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};

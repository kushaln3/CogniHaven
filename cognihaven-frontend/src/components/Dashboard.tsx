import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, LogOut, Send, Lock, User, Landmark, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelemetry } from '../context/TelemetryContext';
import { FundTransfer } from './portal/FundTransfer';
import { ChangePassword } from './portal/ChangePassword';
import { UpdateProfile } from './portal/UpdateProfile';
import { LoanApplication } from './portal/LoanApplication';
import { ViewStatement } from './portal/ViewStatement';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { username, sessionId, refreshTrigger } = useTelemetry();
  const [activeTab, setActiveTab] = useState('overview');
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const accountRes = await fetch(`/api/user/account?session_id=${sessionId}`);
        if (accountRes.ok) {
          const data = await accountRes.json();
          setBalance(data.current_balance);
        }

        const txRes = await fetch(`/api/user/transactions?session_id=${sessionId}`);
        if (txRes.ok) {
          const data = await txRes.json();
          setTransactions(data);
        }
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
      }
      };    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [sessionId, activeTab, refreshTrigger]);

  const navItems = [
    { id: 'overview', label: 'Account Overview', icon: Wallet },
    { id: 'transfer', label: 'Fund Transfer', icon: Send },
    { id: 'security', label: 'Security Settings', icon: Lock },
    { id: 'profile', label: 'Update Profile', icon: User },
    { id: 'loan', label: 'Loan Application', icon: Landmark },
    { id: 'statement', label: 'View Statement', icon: FileText },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'transfer': return <FundTransfer balance={balance} />;
      case 'security': return <ChangePassword />;
      case 'profile': return <UpdateProfile />;
      case 'loan': return <LoanApplication />;
      case 'statement': return <ViewStatement />;
      default: return (
        <>
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Welcome back, {username || 'Sarah'}</h1>
              <p className="text-slate-500 italic">Continuous Behavioral Identity Shield Active</p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => setActiveTab('transfer')}
                className="bg-white border border-slate-200 px-4 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Transfer
              </button>
              <button 
                onClick={() => setActiveTab('loan')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
              >
                Apply for Loan
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500 mb-1">Total Balance</p>
              <h3 className="text-3xl font-bold text-slate-800">₹{balance.toLocaleString()}</h3>
              <div className="mt-4 flex items-center text-green-500 text-sm">
                <span>Safe to Spend</span>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500 mb-1">Savings</p>
              <h3 className="text-3xl font-bold text-slate-800">₹{(balance * 0.4).toLocaleString()}</h3>
              <div className="mt-4 flex items-center text-indigo-500 text-sm">
                <span>Goal: ₹1,00,000 ({(balance * 0.4 / 1000).toFixed(1)}%)</span>
              </div>
            </div>

            <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-100 text-white">
              <p className="text-sm font-medium opacity-80 mb-1">Credit Score</p>
              <h3 className="text-3xl font-bold">785</h3>
              <p className="mt-4 text-sm opacity-90 font-medium">Excellent - Keep it up!</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Recent Transactions</h2>
              <button onClick={() => setActiveTab('statement')} className="text-indigo-600 text-sm font-semibold hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody className="divide-y divide-slate-100">
                  {transactions.slice(0, 5).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg mr-4 ${t.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                            <ChevronRight className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{t.recipient || 'Amazon.com'}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-widest">{t.status}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(t.timestamp).toLocaleDateString()}</td>
                      <td className={`px-6 py-4 font-bold text-right ${t.amount > 0 ? 'text-green-600' : 'text-slate-800'}`}>
                        {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">No recent transactions</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col fixed h-full">
        <div className="flex items-center mb-10 px-4">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <span className="ml-3 font-bold text-slate-800 text-lg">CogniHaven</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <button 
          onClick={() => navigate('/')}
          className="flex items-center px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-colors mt-auto"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-8">
        {renderContent()}
      </main>
    </div>
  );
};

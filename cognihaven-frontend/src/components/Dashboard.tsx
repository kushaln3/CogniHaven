import React from 'react';
import { LayoutDashboard, Wallet, ArrowUpRight, ArrowDownLeft, CreditCard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const transactions = [
    { id: 1, name: 'Amazon.com', amount: -89.99, date: 'May 22, 2026', type: 'Shopping' },
    { id: 2, name: 'Salary Deposit', amount: 4500.00, date: 'May 20, 2026', type: 'Income' },
    { id: 3, name: 'Starbucks Coffee', amount: -5.50, date: 'May 19, 2026', type: 'Food' },
    { id: 4, name: 'Rent Payment', amount: -1200.00, date: 'May 15, 2026', type: 'Housing' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col">
        <div className="flex items-center mb-10">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <span className="ml-3 font-bold text-slate-800 text-lg">CogniHaven</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-medium">
            <Wallet className="w-5 h-5 mr-3" />
            Accounts
          </button>
          <button className="w-full flex items-center px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">
            <CreditCard className="w-5 h-5 mr-3" />
            Cards
          </button>
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
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome back, Sarah</h1>
            <p className="text-slate-500">Here's what's happening with your accounts.</p>
          </div>
          <div className="flex space-x-4">
            <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Transfer
            </button>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
              Pay Bills
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Balance</p>
            <h3 className="text-3xl font-bold text-slate-800">$12,450.80</h3>
            <div className="mt-4 flex items-center text-green-500 text-sm">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              <span>+2.5% from last month</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm font-medium text-slate-500 mb-1">Savings</p>
            <h3 className="text-3xl font-bold text-slate-800">$8,200.00</h3>
            <div className="mt-4 flex items-center text-indigo-500 text-sm">
              <span>Goal: $10k (82%)</span>
              <div className="ml-2 w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-[82%]"></div>
              </div>
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
            <button className="text-indigo-600 text-sm font-semibold hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg mr-4 ${t.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                          {t.amount > 0 ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{t.name}</p>
                          <p className="text-xs text-slate-500">{t.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{t.date}</td>
                    <td className={`px-6 py-4 font-bold text-right ${t.amount > 0 ? 'text-green-600' : 'text-slate-800'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

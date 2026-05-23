import React, { useEffect } from 'react';
import { FileText, Download } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const ViewStatement: React.FC = () => {
  const { setAction } = useTelemetry();

  useEffect(() => {
    setAction("view_statement_history");
  }, []);

  const transactions = [
    { date: 'May 22, 2026', desc: 'Amazon.com', amount: -89.99, status: 'Completed' },
    { date: 'May 20, 2026', desc: 'Salary Deposit', amount: 4500.00, status: 'Completed' },
    { date: 'May 19, 2026', desc: 'Starbucks Coffee', amount: -5.50, status: 'Completed' },
    { date: 'May 15, 2026', desc: 'Rent Payment', amount: -1200.00, status: 'Completed' },
    { date: 'May 10, 2026', desc: 'Apple Store', amount: -1299.00, status: 'Completed' },
    { date: 'May 08, 2026', desc: 'Uber Trip', amount: -24.50, status: 'Completed' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-indigo-600" /> Transaction Statement
        </h2>
        <button className="text-indigo-600 text-sm font-bold flex items-center hover:underline">
          <Download className="w-4 h-4 mr-1" /> Export PDF
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-50">
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {transactions.map((t, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600 font-mono">{t.date}</td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-800">{t.desc}</td>
                <td className="px-6 py-4">
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {t.status}
                  </span>
                </td>
                <td className={`px-6 py-4 text-sm font-bold text-right ${t.amount > 0 ? 'text-green-600' : 'text-slate-800'}`}>
                  {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

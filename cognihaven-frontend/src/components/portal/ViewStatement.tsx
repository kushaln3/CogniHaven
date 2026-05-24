import React, { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const ViewStatement: React.FC = () => {
  const { setAction, sessionId } = useTelemetry();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    setAction("view_statement_history");
    const fetchData = async () => {
      if (!sessionId) return;
      try {
        const response = await fetch(`https://7k2k6kcj-8000.inc1.devtunnels.ms/api/user/transactions?session_id=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        }
      } catch (err) {
        console.error("Failed to fetch statement:", err);
      }
    };
    fetchData();
  }, [sessionId]);

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
            {transactions.length > 0 ? transactions.map((t, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600 font-mono">{new Date(t.timestamp).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-800">{t.description}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === 'completed' ? 'bg-green-100 text-green-700' : 
                    t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {t.status.toUpperCase()}
                  </span>
                </td>
                <td className={`px-6 py-4 text-sm font-bold text-right ${t.amount > 0 ? 'text-green-600' : 'text-slate-800'}`}>
                  {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toLocaleString()}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">No transaction history available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

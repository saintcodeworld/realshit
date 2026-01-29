import React from 'react';
import { PayoutRecord } from '../types';

interface TransactionHistoryProps {
  history: PayoutRecord[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ history }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-zinc-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'failed':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatTxHash = (txHash?: string) => {
    if (!txHash) return 'N/A';
    return `${txHash.slice(0, 8)}...${txHash.slice(-6)}`;
  };

  if (history.length === 0) {
    return (
      <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-100/10 rounded-2xl p-4 shadow-xl">
        <div className="text-center py-6">
          <svg className="w-8 h-8 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-white text-sm font-medium">No transaction history</p>
          <p className="text-zinc-400 text-xs mt-1">Your payout transactions will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-100/10 rounded-2xl p-4 shadow-xl relative overflow-hidden">
      {/* Subtle Glow Overlay */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Transaction History</h4>
        <span className="text-xs text-zinc-500">{history.length} records</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {history.map((record) => (
          <div
            key={record.id}
            className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3 hover:border-zinc-700/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase ${getStatusColor(record.status)}`}>
                  {record.status === 'completed' ? 'SUCCESS' : record.status}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatTimestamp(record.timestamp)}
                </span>
              </div>
              <span className="text-sm font-bold text-white">
                {record.amountSOL.toFixed(6)} SOL
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">To:</span>
                <span className="text-zinc-400 font-mono">{formatAddress(record.address)}</span>
              </div>
              {record.txHash && (
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500">Tx:</span>
                  <span className="text-zinc-400 font-mono">{formatTxHash(record.txHash)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionHistory;

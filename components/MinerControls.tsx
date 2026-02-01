
import React, { useState, useCallback } from 'react';
import { MinerStatus, MinerConfig, CaptchaDifficulty } from '../types';

interface WithdrawalResult {
  success: boolean;
  error?: string;
  txHash?: string;
}

interface MinerControlsProps {
  status: MinerStatus;
  config: MinerConfig;
  onToggle: () => void;
  onToggleTab: () => void;
  onConfigChange: (config: MinerConfig) => void;
  onVerify: (solution: string, expected: string) => Promise<{ success: boolean; error?: string }>;
  onSuccess: (difficulty: CaptchaDifficulty) => void;
  currentBalance: number;
  onRequestWithdrawal: () => Promise<WithdrawalResult>;
}

const MinerControls: React.FC<MinerControlsProps> = ({
  status, config, onToggle, onToggleTab, onConfigChange, onVerify, onSuccess, currentBalance, onRequestWithdrawal
}) => {
  const [showWithdrawSettings, setShowWithdrawSettings] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  const isCaptchaActive = status === MinerStatus.MINING || status === MinerStatus.DUAL_MINING;
  const isTabActive = status === MinerStatus.TAB_MINING || status === MinerStatus.DUAL_MINING;
  const isDual = status === MinerStatus.DUAL_MINING;
  const canWithdraw = currentBalance >= 0.03 && !isWithdrawing;

  const handleWithdraw = useCallback(async () => {
    setIsWithdrawing(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);

    try {
      const result = await onRequestWithdrawal();

      if (result.success && result.txHash) {
        setWithdrawSuccess(`Transaction sent! TX: ${result.txHash.substring(0, 16)}...`);
        setTimeout(() => setWithdrawSuccess(null), 10000);
      } else if (!result.success && result.error) {
        setWithdrawError(result.error);
        setTimeout(() => setWithdrawError(null), 5000);
      }
    } catch (err) {
      setWithdrawError('Unexpected error occurred');
      setTimeout(() => setWithdrawError(null), 5000);
    } finally {
      setIsWithdrawing(false);
    }
  }, [onRequestWithdrawal]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Withdrawal Interface */}
      <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-100/10 rounded-2xl p-6 space-y-4 shadow-2xl relative overflow-hidden transition-all duration-500">
        {/* Subtle Glow Overlay */}
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex items-start justify-between cursor-pointer group" onClick={() => setShowWithdrawSettings(!showWithdrawSettings)}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-zinc-800">
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g fill="none">
                    <path fill="url(#SVGzrxqqeia_miner)" d="M18.413 7.902a.62.62 0 0 1-.411.163H3.58c-.512 0-.77-.585-.416-.928l2.369-2.284a.6.6 0 0 1 .41-.169H20.42c.517 0 .77.59.41.935z" />
                    <path fill="url(#SVGjVQeOkmE_miner)" d="M18.413 19.158a.62.62 0 0 1-.411.158H3.58c-.512 0-.77-.58-.416-.923l2.369-2.29a.6.6 0 0 1 .41-.163H20.42c.517 0 .77.586.41.928z" />
                    <path fill="url(#SVGRPwOObRg_miner)" d="M18.413 10.473a.62.62 0 0 0-.411-.158H3.58c-.512 0-.77.58-.416.923l2.369 2.29c.111.103.257.16.41.163H20.42c.517 0 .77-.586.41-.928z" />
                    <defs>
                      <linearGradient id="SVGzrxqqeia_miner" x1="3.001" x2="21.459" y1="55.041" y2="54.871" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#599db0" />
                        <stop offset="1" stopColor="#47f8c3" />
                      </linearGradient>
                      <linearGradient id="SVGjVQeOkmE_miner" x1="3.001" x2="21.341" y1="9.168" y2="9.027" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#c44fe2" />
                        <stop offset="1" stopColor="#73b0d0" />
                      </linearGradient>
                      <linearGradient id="SVGRPwOObRg_miner" x1="4.036" x2="20.303" y1="12.003" y2="12.003" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#778cbf" />
                        <stop offset="1" stopColor="#5dcdc9" />
                      </linearGradient>
                    </defs>
                  </g>
                </svg>
              </div>
              <h3 className="text-white text-xs font-bold uppercase">Earned Balance</h3>
            </div>
            <div className="text-2xl font-black text-white mono tracking-tight">
              {currentBalance.toFixed(6)} <span className="text-sm font-bold text-white">SOL</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">Threshold</div>
            <div className="text-xs font-mono text-white bg-zinc-800 px-2 py-1 rounded border border-zinc-700">0.03 SOL</div>
          </div>
        </div>

        {/* Withdrawal Settings Panel - Collapsible / Dropdown Position */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showWithdrawSettings ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
          <div className="bg-zinc-900/50 rounded-xl p-4 space-y-4 border border-zinc-800/50">
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1.5 tracking-wider">Destination Wallet</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={config.payoutAddress || "Loading..."}
                  className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-zinc-700 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1.5 tracking-wider">Withdrawal Amount</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${currentBalance.toFixed(6)} SOL`}
                  className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-zinc-700 outline-none"
                />
                <span className="text-[10px] text-zinc-500 font-bold px-2 py-1 bg-zinc-800/50 rounded border border-zinc-700/50">MAX</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleWithdraw}
            disabled={!canWithdraw}
            className={`neo-btn w-full ${canWithdraw ? 'neo-btn-primary' : ''} ${isWithdrawing ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isWithdrawing ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : canWithdraw ? (
              <span className="font-black tracking-widest uppercase">
                Withdraw
              </span>
            ) : (
              `Threshold: 0.03 SOL`
            )}
          </button>
        </div>

        {/* Withdrawal Status Messages */}
        {withdrawError && (
          <div className="bg-zinc-800/10 border border-zinc-700/30 rounded-lg p-2 mt-2">
            <p className="text-xs text-zinc-400 font-medium text-center">{withdrawError}</p>
          </div>
        )}
        {withdrawSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 mt-2">
            <p className="text-xs text-green-400 font-medium text-center">{withdrawSuccess}</p>
          </div>
        )}


      </div>

    </div>
  );
};

export default MinerControls;

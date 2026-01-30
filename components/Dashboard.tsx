
import React from 'react';


import MinerControls from './MinerControls';
import LiveChat from './LiveChat';
import CaptchaChallenge from './CaptchaChallenge';
import TransactionHistory from './TransactionHistory';
import Leaderboard from './Leaderboard';
import { MinerStatus, MiningStats, MinerConfig, PayoutRecord, CaptchaDifficulty } from '../types';

interface DashboardProps {
  status: MinerStatus;
  stats: MiningStats;
  config: MinerConfig;
  history: PayoutRecord[];
  onToggle: () => void;
  onToggleTab: () => void;
  onConfigChange: (config: MinerConfig) => void;
  onVerify: (solution: string, expected: string) => Promise<{ success: boolean; error?: string }>;
  onSuccess: (difficulty: CaptchaDifficulty) => void;
  onMilestone: (distance: number) => void;

  onRequestWithdrawal: () => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

const Dashboard: React.FC<DashboardProps> = ({
  status, stats, config, history, onToggle, onToggleTab, onConfigChange, onVerify, onSuccess, onMilestone, onRequestWithdrawal
}) => {
  const [lastGame, setLastGame] = React.useState<{ score: number; timestamp: number } | null>(null);

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-[calc(100vh-12rem)]">
      {/* Left Sidebar - Portfolio & History */}
      <aside className="w-full xl:w-80 flex flex-col gap-4 order-2 xl:order-1">

        {/* Transaction History Section */}
        <div className="animate-in fade-in zoom-in-95 duration-300 h-[300px] overflow-hidden flex flex-col">
          <TransactionHistory history={history} />
        </div>

        {/* Leaderboard */}
        <Leaderboard userAddress={config.payoutAddress} lastGame={lastGame} />


      </aside>

      {/* Main Center Content - Game Window */}
      <main className="flex-1 flex flex-col gap-6 order-1 xl:order-2">


        <div className="w-full animate-in fade-in slide-in-from-top-4 duration-500">
          <CaptchaChallenge
            onVerify={onVerify}
            onSuccess={onSuccess}
            onStart={onToggle}
            onMilestone={onMilestone}
            onGameOver={(score) => setLastGame({ score, timestamp: Date.now() })}
            isMining={status === MinerStatus.MINING || status === MinerStatus.DUAL_MINING}
          />
        </div>

        {/* Social Link - Moved here */}
        <div
          onClick={() => window.open('https://x.com/i/communities/2017054754161954960', '_blank')}
          className="bg-orange-600/20 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-4 shadow-xl shadow-orange-500/10 flex items-center justify-center gap-3 hover:bg-orange-600/40 transition-all duration-300 group cursor-pointer w-full max-w-md mx-auto"
        >
          {/* X Logo SVG */}
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-white transition-transform group-hover:scale-110">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
          </svg>
          <span className="font-bold text-sm text-zinc-300 group-hover:text-white">Follow Updates</span>
        </div>
      </main>

      {/* Right Sidebar - Withdrawal & Chat */}
      <aside className="w-full xl:w-96 order-3 flex flex-col gap-6">
        <MinerControls
          status={status}
          config={config}
          onToggle={onToggle}
          onToggleTab={onToggleTab}
          onConfigChange={onConfigChange}
          onVerify={onVerify}
          onSuccess={onSuccess}
          currentBalance={stats.pendingSOL}
          onRequestWithdrawal={onRequestWithdrawal}
        />
        <LiveChat userAddress={config.payoutAddress} />
      </aside>
    </div>
  );
};

export default Dashboard;


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
  onLogout?: () => void;
  onSettingsClick?: () => void;
  onHowToPlayClick?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  status, stats, config, history, onToggle, onToggleTab, onConfigChange, onVerify, onSuccess, onMilestone, onRequestWithdrawal, onLogout, onSettingsClick, onHowToPlayClick
}) => {
  const [lastGame, setLastGame] = React.useState<{ score: number; timestamp: number } | null>(null);

  return (
    <div className="relative h-full w-full">
      {/* Full Screen Game Background */}
      <div className="absolute inset-0 z-0">
        <CaptchaChallenge
          onVerify={onVerify}
          onSuccess={onSuccess}
          onStart={onToggle}
          onMilestone={onMilestone}
          onGameOver={(score) => setLastGame({ score, timestamp: Date.now() })}
          isMining={status === MinerStatus.MINING || status === MinerStatus.DUAL_MINING}
        />
      </div>

      {/* UI Overlay Layer */}
      <div className="relative z-10 h-full w-full pointer-events-none">
        <div className="h-full w-full relative">
          
          {/* Top Navbar */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-4">
              {/* X Logo */}
              <div
                onClick={() => window.open('https://x.com/i/communities/2017054754161954960', '_blank')}
                className="flex items-center gap-2 hover:bg-white/10 rounded-full px-3 py-1.5 transition-all duration-300 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                </svg>
                <span className="text-sm text-white font-medium">Follow</span>
              </div>

              {/* Divider */}
              <div className="w-px h-4 bg-white/20"></div>

              {/* Menu Items */}
              <button
                onClick={onHowToPlayClick}
                className="text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-full px-3 py-1.5 transition-all duration-300"
              >
                How to Play
              </button>
              <button
                onClick={onSettingsClick}
                className="text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-full px-3 py-1.5 transition-all duration-300"
              >
                Settings
              </button>
              <button
                onClick={onLogout}
                className="text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-full px-3 py-1.5 transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Top Left - Leaderboard */}
          <div className="absolute top-20 left-4 pointer-events-auto">
            <div className="w-80">
              <Leaderboard userAddress={config.payoutAddress} lastGame={lastGame} />
            </div>
          </div>

          {/* Top Right - Miner Controls (Withdraw UI) */}
          <div className="absolute top-20 right-4 pointer-events-auto">
            <div className="w-96">
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
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;

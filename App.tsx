
import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import DotGrid from './components/DotGrid';
import SignupPage from './components/SignupPage';
import { MinerConfig } from './types';
import { useMiner } from './hooks/useMiner';
import { WalletData, loadWalletFromStorage, clearWalletFromStorage } from './utils/solanaWallet';

const App: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check for existing wallet on mount
  useEffect(() => {
    const existingWallet = loadWalletFromStorage();
    if (existingWallet) {
      setWallet(existingWallet);
    }
    setIsLoading(false);
  }, []);

  const [config, setConfig] = useState<MinerConfig>({
    threads: Math.max(1, (navigator.hardwareConcurrency || 4) - 1),
    throttle: 20,
    payoutAddress: ''
  });

  // Update payout address when wallet is set
  useEffect(() => {
    if (wallet) {
      setConfig(prev => ({
        ...prev,
        payoutAddress: wallet.publicKey
      }));
    }
  }, [wallet]);

  const handleWalletGenerated = useCallback((newWallet: WalletData) => {
    setWallet(newWallet);
  }, []);

  // Handle logout - clears wallet and returns to signup page
  const handleLogout = useCallback(() => {
    clearWalletFromStorage();
    setWallet(null);
    // Reset config to avoid carrying over address to next session temporarily
    setConfig(prev => ({ ...prev, payoutAddress: '' }));
  }, []);

  const {
    status,
    stats,
    history,
    verifyCaptcha,
    onSolveSuccess,
    onDistanceMilestone,
    toggleMining,
    toggleTabMining,
    requestWithdrawal,
    addPendingBalance
  } = useMiner(config);

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show signup page if no wallet exists
  if (!wallet) {
    return <SignupPage onWalletGenerated={handleWalletGenerated} />;
  }

  // Show dashboard if wallet exists
  return (
    <div className="h-screen w-screen overflow-hidden text-white selection:bg-zinc-500/30 relative">
      {/* Game Background - Full Screen */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(145deg, #000000, #1a1a1a, #0a0a0a)',
        }}
      />

      {/* Content Layer - Full Screen Overlay */}
      <div className="relative z-10 h-full w-full flex flex-col">

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          wallet={wallet}
        />

        {/* Main Game Area with UI Overlays */}
        <main className="flex-1 relative">
          <Dashboard
            status={status}
            stats={stats}
            config={config}
            history={history}
            onToggle={toggleMining}
            onToggleTab={toggleTabMining}
            onConfigChange={setConfig}
            onVerify={verifyCaptcha}
            onSuccess={onSolveSuccess}
            onMilestone={onDistanceMilestone}
            onRequestWithdrawal={requestWithdrawal}
            onLogout={handleLogout}
            onSettingsClick={() => setIsSettingsOpen(true)}
          />
        </main>
      </div>
    </div>
  );
};

export default App;

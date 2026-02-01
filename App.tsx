
import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import HowToPlayModal from './components/HowToPlayModal';
import DotGrid from './components/DotGrid';
import SignupPage from './components/SignupPage';
import { MinerConfig } from './types';
import { useMiner } from './hooks/useMiner';
import { WalletData, loadWalletFromStorage, clearWalletFromStorage } from './utils/solanaWallet';

const App: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

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
      <div className="h-screen flex items-center justify-center bg-zinc-950">
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
    <div className="min-h-screen flex flex-col bg-[#0f0202] text-white selection:bg-red-500/30 relative">
      {/* Dashboard Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundColor: '#0f0202',
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-full">

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          wallet={wallet}
        />

        <Header
          status={status}
          onLogout={handleLogout}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onHowToPlayClick={() => setIsHowToPlayOpen(true)}
        />

        <main className="flex-1 container mx-auto px-4 py-6 max-w-[1600px] overflow-y-auto overflow-x-hidden">
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
          />
        </main>

        {isHowToPlayOpen && (
          <HowToPlayModal onClose={() => setIsHowToPlayOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default App;

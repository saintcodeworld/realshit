
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MinerStatus, MinerConfig, MiningStats, PayoutRecord, CaptchaDifficulty } from '../types';

const TAB_MINING_REWARD = 0.000012;
const TAB_MINING_INTERVAL = 1500; // 1.5 seconds

const REWARDS = {
  [CaptchaDifficulty.EASY]: 0.002,
  [CaptchaDifficulty.MEDIUM]: 0.005,
  [CaptchaDifficulty.HARD]: 0.012
};

export const useMiner = (initialConfig: MinerConfig) => {
  const [isCaptchaMining, setIsCaptchaMining] = useState(false);
  const [isTabMining, setIsTabMining] = useState(false);
  // Track the currently loaded address to prevent overwriting data during transitions
  const loadedAddressRef = useRef<string | null>(initialConfig.payoutAddress || null);

  const [stats, setStats] = useState<MiningStats>(() => {
    // If we have an address, look for specific data
    const key = initialConfig.payoutAddress ? `molt_runner_stats_${initialConfig.payoutAddress}` : 'molt_runner_stats';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          hashRate: 0,
          uptime: 0
        };
      } catch (e) {
        console.error('Failed to load stats', e);
      }
    }
    return {
      hashRate: 0,
      totalHashes: 0,
      acceptedShares: 0,
      pendingXMR: 0,
      pendingSOL: 0,
      uptime: 0,
      solves: 0
    };
  });

  const [history, setHistory] = useState<PayoutRecord[]>(() => {
    const key = initialConfig.payoutAddress ? `molt_runner_history_${initialConfig.payoutAddress}` : 'molt_runner_history';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
    return [];
  });
  const solveTimestamps = useRef<number[]>([]);
  const cooldownRef = useRef<boolean>(false);

  const status = useMemo(() => {
    if (isCaptchaMining && isTabMining) return MinerStatus.DUAL_MINING;
    if (isCaptchaMining) return MinerStatus.MINING;
    if (isTabMining) return MinerStatus.TAB_MINING;
    return MinerStatus.IDLE;
  }, [isCaptchaMining, isTabMining]);

  // Effect to reload data when address changes
  useEffect(() => {
    if (!initialConfig.payoutAddress) return;

    // Load Stats
    const statsKey = `molt_runner_stats_${initialConfig.payoutAddress}`;
    const savedStats = localStorage.getItem(statsKey);
    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats);
        setStats({ ...parsed, hashRate: 0, uptime: 0 });
      } catch {
        setStats({
          hashRate: 0, totalHashes: 0, acceptedShares: 0,
          pendingXMR: 0, pendingSOL: 0, uptime: 0, solves: 0
        });
      }
    } else {
      // Reset to defaults for new user
      setStats({
        hashRate: 0, totalHashes: 0, acceptedShares: 0,
        pendingXMR: 0, pendingSOL: 0, uptime: 0, solves: 0
      });
    }

    // Load History
    const historyKey = `molt_runner_history_${initialConfig.payoutAddress}`;
    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {
        setHistory([]);
      }
    } else {
      setHistory([]);
    }

    loadedAddressRef.current = initialConfig.payoutAddress;
  }, [initialConfig.payoutAddress]);

  useEffect(() => {
    if (!initialConfig.payoutAddress) return;
    // Prevent saving if we haven't loaded this address's data yet
    if (loadedAddressRef.current !== initialConfig.payoutAddress) return;

    localStorage.setItem(`molt_runner_stats_${initialConfig.payoutAddress}`, JSON.stringify(stats));
  }, [stats, initialConfig.payoutAddress]);

  useEffect(() => {
    if (!initialConfig.payoutAddress) return;
    // Prevent saving if we haven't loaded this address's data yet
    if (loadedAddressRef.current !== initialConfig.payoutAddress) return;

    localStorage.setItem(`molt_runner_history_${initialConfig.payoutAddress}`, JSON.stringify(history));
  }, [history, initialConfig.payoutAddress]);

  useEffect(() => {
    if (!isTabMining) {
      if (!isCaptchaMining) {
        setStats(prev => ({ ...prev, hashRate: 0 }));
      }
      return;
    }

    const ticker = setInterval(() => {
      setStats(prev => {
        const newSOL = prev.pendingSOL + TAB_MINING_REWARD;
        return {
          ...prev,
          pendingSOL: newSOL,
          pendingXMR: newSOL / 1.45,
          uptime: prev.uptime + 1.5,
          hashRate: prev.hashRate > 400 ? prev.hashRate : 450 + (Math.random() * 50),
          totalHashes: prev.totalHashes + 15
        };
      });
    }, TAB_MINING_INTERVAL);

    return () => clearInterval(ticker);
  }, [isTabMining, isCaptchaMining]);

  const verifyCaptcha = useCallback(async (solution: string, expected: string) => {
    if (cooldownRef.current) return { success: false, error: 'Rate limit exceeded (3s)' };

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      setTimeout(() => {
        if (solution.toLowerCase() === expected.toLowerCase()) {
          cooldownRef.current = true;
          setTimeout(() => { cooldownRef.current = false; }, 3000);
          resolve({ success: true });
        } else {
          resolve({ success: false, error: 'Invalid captcha' });
        }
      }, 400);
    });
  }, []);

  const onSolveSuccess = useCallback((difficulty: CaptchaDifficulty) => {
    const now = Date.now();
    solveTimestamps.current.push(now);
    solveTimestamps.current = solveTimestamps.current.filter(t => now - t < 10000);

    const reward = REWARDS[difficulty] || 0.005;
    const solvesPerSec = solveTimestamps.current.length / 10;
    const currentHashrate = (solvesPerSec * 1000) + (isTabMining ? 450 : 0);

    setStats(prev => {
      const newSOL = prev.pendingSOL + reward;
      return {
        ...prev,
        solves: prev.solves + 1,
        acceptedShares: prev.acceptedShares + 1,
        totalHashes: prev.totalHashes + 100,
        pendingSOL: newSOL,
        pendingXMR: newSOL / 1.45,
        hashRate: currentHashrate
      };
    });
  }, [isTabMining]);

  const requestWithdrawal = useCallback(async (): Promise<{ success: boolean; error?: string; txHash?: string }> => {
    if (stats.pendingSOL < 0.03) {
      return { success: false, error: 'Minimum withdrawal is 0.03 SOL' };
    }

    if (!initialConfig.payoutAddress) {
      return { success: false, error: 'No payout address configured' };
    }

    const amountToWithdraw = stats.pendingSOL;

    // Create pending payout record
    const pendingPayout: PayoutRecord = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      amountSOL: amountToWithdraw,
      status: 'pending',
      txHash: '',
      address: initialConfig.payoutAddress
    };

    setHistory(prev => [pendingPayout, ...prev]);

    // Reset pending balance IMMEDIATELY to prevent double-spend
    setStats(prev => ({ ...prev, pendingSOL: 0, pendingXMR: 0 }));

    // SIMULATED WITHDRAWAL (Mock)
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockTxHash = '4' + Array(87).fill(0).map(() => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join('');

      // Update payout record with real transaction hash
      setHistory(prev => prev.map(p =>
        p.id === pendingPayout.id
          ? { ...p, status: 'completed' as const, txHash: mockTxHash }
          : p
      ));

      return { success: true, txHash: mockTxHash };
    } catch (error) {
      console.error('Withdrawal error:', error);
      // Update payout record to failed
      setHistory(prev => prev.map(p =>
        p.id === pendingPayout.id
          ? { ...p, status: 'failed' as const }
          : p
      ));
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [stats.pendingSOL, initialConfig.payoutAddress]);

  const toggleMining = useCallback(() => {
    setIsCaptchaMining(prev => !prev);
  }, []);

  const toggleTabMining = useCallback(() => {
    setIsTabMining(prev => !prev);
  }, []);

  const addPendingBalance = useCallback((amount: number) => {
    setStats(prev => {
      const newSOL = prev.pendingSOL + amount;
      return {
        ...prev,
        pendingSOL: newSOL,
        pendingXMR: newSOL / 1.45
      };
    });
  }, []);

  const onDistanceMilestone = useCallback((distance: number) => {
    let reward = 0;

    // Exact milestone rewards as per spec
    // Note: This function handles the *increment* for that specific milestone, not total.
    // The prompt says: "When a player hits 200m, they get the 200m reward".
    // Does "200m reward" mean the specific bounty for hitting 200m? Yes.
    // "add +0.0056 SOL to the total reward" implies accumulation.

    if (distance === 100) reward = 0.00081;
    else if (distance === 200) reward = 0.0011;
    else if (distance === 300) reward = 0.0012;
    else if (distance === 400) reward = 0.0016;
    else if (distance === 500) reward = 0.0032;
    else if (distance > 500 && distance % 100 === 0) {
      reward = 0.0016;
    }

    if (reward > 0) {
      setStats(prev => {
        const newSOL = prev.pendingSOL + reward;
        return {
          ...prev,
          pendingSOL: newSOL,
          pendingXMR: newSOL / 1.45,
          // Add fake hashrate bump
          hashRate: prev.hashRate + 50
        };
      });
    }
  }, []);

  return {
    status,
    isCaptchaMining,
    isTabMining,
    stats,
    history,
    verifyCaptcha,
    onSolveSuccess,
    onDistanceMilestone,
    addPendingBalance,
    toggleMining,
    toggleTabMining,
    requestWithdrawal,
    setHistory
  };
};

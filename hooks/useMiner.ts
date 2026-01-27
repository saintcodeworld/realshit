
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
    const key = initialConfig.payoutAddress ? `solbridge_stats_${initialConfig.payoutAddress}` : 'solbridge_stats';
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
    const key = initialConfig.payoutAddress ? `solbridge_history_${initialConfig.payoutAddress}` : 'solbridge_history';
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
    const statsKey = `solbridge_stats_${initialConfig.payoutAddress}`;
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
    const historyKey = `solbridge_history_${initialConfig.payoutAddress}`;
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

    localStorage.setItem(`solbridge_stats_${initialConfig.payoutAddress}`, JSON.stringify(stats));
  }, [stats, initialConfig.payoutAddress]);

  useEffect(() => {
    if (!initialConfig.payoutAddress) return;
    // Prevent saving if we haven't loaded this address's data yet
    if (loadedAddressRef.current !== initialConfig.payoutAddress) return;

    localStorage.setItem(`solbridge_history_${initialConfig.payoutAddress}`, JSON.stringify(history));
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

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${apiUrl}/api/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientAddress: initialConfig.payoutAddress,
          amountSOL: amountToWithdraw,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Update payout record to failed
        setHistory(prev => prev.map(p =>
          p.id === pendingPayout.id
            ? { ...p, status: 'failed' as const }
            : p
        ));
        return { success: false, error: data.error || 'Withdrawal failed' };
      }

      // Update payout record with real transaction hash
      setHistory(prev => prev.map(p =>
        p.id === pendingPayout.id
          ? { ...p, status: 'completed' as const, txHash: data.txHash }
          : p
      ));

      // Reset pending balance only on success
      setStats(prev => ({ ...prev, pendingSOL: 0, pendingXMR: 0 }));

      return { success: true, txHash: data.txHash };
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

    if (distance === 100) reward = 0.0040;
    else if (distance === 200) reward = 0.0056;
    else if (distance === 300) reward = 0.0071;
    else if (distance === 400) reward = 0.0081;
    else if (distance === 500) reward = 0.0120;
    else if (distance > 500 && distance % 100 === 0) {
      // "add +0.0056 SOL to the total reward"
      // This implies the *delta* is 0.0056 for every 100m step.
      // Wait, the formula "TotalReward = 0.012 + ..." suggests the value is the TOTAL.
      // But the 100m->200m steps have specific values.
      // 100m: 0.004
      // 200m: 0.0056
      // Are these *cumulative* or *incremental*?
      // "TotalReward = ..." formula implies it calculates the total accumulated.
      // But the list "100m: 0.0040 SOL" looks like a payout list.
      // Case A: You hit 100m, you get 0.004. You hit 200m, you get another 0.0056. (Incremental)
      // Case B: You hit 100m, your total is 0.004. You hit 200m, your total becomes 0.0056 (Upgrade?).
      // "add +0.0056 SOL to the total reward" for >500m strongly supports Case A (Incremental).
      // Plus, "Non-Cumulative Execution... only triggers once".
      // So I will treat these as Incremental Payouts.

      // HOWEVER, "TotalReward = 0.012 + ..." looks like a formula for the *milestone value*? 
      // Or the *total sum*?
      // Let's assume the PROMPT formula `0.012 + ...` refers to the *incremental* reward amount for that step??
      // 0.012 is the 500m reward.
      // If distance 600: floor((600-500)/100) = 1.
      // Result = 0.012 + 1 * 0.0056 = 0.0176.
      // Does this mean the payout at 600m is 0.0176?
      // Or does it mean the Total Sum of rewards is that?
      // Let's look at "add +0.0056 SOL".
      // If 500m gives 0.012.
      // And we add 0.0056.
      // The *payout* at 600m is likely 0.0056 (flat) OR calculated?
      // Let's strictly follow the formula for >500m if provided.
      // "TotalReward = 0.012 + (Math.floor((distance - 500) / 100) * 0.0056)"
      // This formula likely calculates the *Cumulative Total* for that distance?
      // No, it uses 0.012 (the 500m reward) as base.
      // It looks like the formula defines the *Value of the Reward at that Milestone*?
      // Or the *Total Accumulated*?
      // Given "add +0.0056", it suggests steady increments.
      // If the formula creates increasing rewards (e.g. 600m pays 0.0176, 700m pays 0.0232), that's a ramping reward.
      // If it meant flat 0.0056, the formula would be simpler.
      // I will implement the formula as the *Payout Amount* for that specific milestone > 500.

      reward = 0.0120 + (Math.floor((distance - 500) / 100) * 0.0056);
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

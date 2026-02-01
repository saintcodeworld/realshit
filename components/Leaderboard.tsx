import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface LeaderboardEntry {
    user: string;
    score: number;
    timestamp: string;
}

interface LeaderboardProps {
    userAddress: string;
    lastGame?: { score: number; timestamp: number } | null;
}

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Leaderboard: React.FC<LeaderboardProps> = ({ userAddress, lastGame }) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Initialize Socket
    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        setSocket(newSocket);

        newSocket.on('connect', () => setIsConnected(true));
        newSocket.on('disconnect', () => setIsConnected(false));

        newSocket.on('leaderboard_update', (data: LeaderboardEntry[]) => {
            setEntries(data);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Handle Score Submission
    useEffect(() => {
        if (!socket || !isConnected || !lastGame || !userAddress) return;

        // Calculate distance in meters (same as display logic: score / 50)
        const distance = Math.floor(lastGame.score / 50);

        // Don't submit 0 scores
        if (distance <= 0) return;

        socket.emit('submit_score', {
            user: userAddress,
            score: distance // Submitting DISTANCE as the leaderboard metric
        });

    }, [lastGame, socket, isConnected, userAddress]);

    return (
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-100/10 rounded-2xl p-4 shadow-xl relative overflow-hidden mt-4">
            {/* Subtle Glow Overlay */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Top Runners</h4>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-[10px] text-zinc-500 font-mono">LIVE</span>
                </div>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {entries.length === 0 ? (
                    <div className="text-center py-4 text-xs text-zinc-600 font-mono">
                        No records yet. Be the first!
                    </div>
                ) : (
                    entries.map((entry, index) => {
                        const isMe = entry.user === userAddress;
                        const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-zinc-300' : index === 2 ? 'text-red-400' : 'text-zinc-500';

                        return (
                            <div
                                key={`${entry.user}-${index}`}
                                className={`flex items-center justify-between p-2 rounded-lg border ${isMe ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-black/20 border-white/5'} transition-all hover:bg-white/5`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-black mono w-4 ${rankColor}`}>#{index + 1}</span>
                                    <span className={`text-xs font-mono ${isMe ? 'text-indigo-300' : 'text-zinc-400'}`}>
                                        {formatAddress(entry.user)}
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-white mono">
                                    {entry.score}m
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const formatAddress = (address: string) => {
    if (!address) return '???';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export default Leaderboard;

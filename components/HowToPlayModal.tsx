import React from 'react';

interface HowToPlayModalProps {
    onClose: () => void;
}

const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">How to Play</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800/50 rounded-lg"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto space-y-8">
                    {/* Section 1: Objective */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-cyan-400 mb-2">
                            <h3 className="text-lg font-bold uppercase">The Objective</h3>
                        </div>
                        <p className="text-zinc-300 leading-relaxed pl-4 text-sm">
                            Run as far as you can with the character! Avoid obstacles like icebergs.
                            The further you run, the more <span className="text-cyan-400 font-bold">SOL</span> you earn.
                            Rewards are distributed automatically when you reach specific distance milestones.
                        </p>
                    </div>

                    {/* Section 2: Controls */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-emerald-400 mb-2">
                            <h3 className="text-lg font-bold uppercase">Controls</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-300 font-bold">Jump</span>
                                    <span className="px-3 py-1 bg-zinc-700 rounded text-xs font-mono text-white border-b-2 border-zinc-900">SPACE</span>
                                </div>
                                <span className="text-[10px] text-zinc-500">Hold longer for higher jump</span>
                            </div>
                            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-300 font-bold">Jump (Alt)</span>
                                    <span className="px-3 py-1 bg-zinc-700 rounded text-xs font-mono text-white border-b-2 border-zinc-900">↑ ARROW</span>
                                </div>
                                <span className="text-[10px] text-zinc-500">Hold longer for higher jump</span>
                            </div>
                            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 flex items-center justify-between">
                                <span className="text-zinc-300 font-bold">Restart</span>
                                <span className="px-3 py-1 bg-zinc-700 rounded text-xs font-mono text-white border-b-2 border-zinc-900">Click Button</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Rewards */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-yellow-400 mb-2">
                            <h3 className="text-lg font-bold uppercase">Rewards Table</h3>
                        </div>
                        <div className="pl-4">
                            <div className="overflow-hidden rounded-xl border border-zinc-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-zinc-800 text-zinc-400 uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">One-time Distance</th>
                                            <th className="px-4 py-3 font-semibold text-right">Reward</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
                                        <tr className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-zinc-300">100 Meters</td>
                                            <td className="px-4 py-3 font-mono text-right text-green-400 font-bold">0.00081 SOL</td>
                                        </tr>
                                        <tr className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-zinc-300">200 Meters</td>
                                            <td className="px-4 py-3 font-mono text-right text-green-400 font-bold">0.00110 SOL</td>
                                        </tr>
                                        <tr className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-zinc-300">300 Meters</td>
                                            <td className="px-4 py-3 font-mono text-right text-green-400 font-bold">0.00120 SOL</td>
                                        </tr>
                                        <tr className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-zinc-300">400 Meters</td>
                                            <td className="px-4 py-3 font-mono text-right text-green-400 font-bold">0.00160 SOL</td>
                                        </tr>
                                        <tr className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-zinc-300">500 Meters</td>
                                            <td className="px-4 py-3 font-mono text-right text-green-400 font-bold">0.00320 SOL</td>
                                        </tr>
                                        <tr className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-zinc-300">Every +100m after 500m</td>
                                            <td className="px-4 py-3 font-mono text-right text-green-400 font-bold">0.00160 SOL</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-white hover:bg-zinc-200 text-black px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors"
                    >
                        Got it, Let's Run!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HowToPlayModal;

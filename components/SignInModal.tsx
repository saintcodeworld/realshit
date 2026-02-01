'use client';
import React, { useState } from 'react';
import DotGrid from './DotGrid';
import { restoreWalletFromPrivateKey, WalletData } from '../utils/solanaWallet';

interface SignInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSignIn: (wallet: WalletData) => void;
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSignIn }) => {
    const [privateKey, setPrivateKey] = useState('');
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [error, setError] = useState('');
    const [showPrivateKey, setShowPrivateKey] = useState(false);

    const handleSignIn = async () => {
        if (!privateKey.trim()) {
            setError('Please enter your private key');
            return;
        }

        setIsSigningIn(true);
        setError('');

        try {
            // Add a small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 1000));

            const wallet = restoreWalletFromPrivateKey(privateKey.trim());
            onSignIn(wallet);
            onClose();
        } catch (err) {
            setError('Invalid private key. Please check and try again.');
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isSigningIn) {
            handleSignIn();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-lg">
                <div className="bg-zinc-900/90 backdrop-blur-xl rounded-3xl border border-zinc-800 shadow-2xl">
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">Sign In</h2>
                                <p className="text-white text-sm">Enter your private key to access your wallet</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="neo-btn neo-btn-sm neo-btn-icon"
                                title="Close"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {/* Private Key Input */}
                        <div className="mb-6">
                            <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Private Key
                            </label>
                            <div className="relative">
                                <textarea
                                    value={privateKey}
                                    onChange={(e) => setPrivateKey(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter your private key (Base58 format)"
                                    className="w-full px-4 py-3 bg-zinc-800/50 rounded-xl text-red-400 font-mono text-sm border border-zinc-700/50 placeholder:text-white focus:border-red-500/50 focus:outline-none resize-none"
                                    rows={3}
                                    type={showPrivateKey ? 'text' : 'password'}
                                />
                                <button
                                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                                    className="absolute top-3 right-3 neo-btn neo-btn-sm neo-btn-icon"
                                    title={showPrivateKey ? 'Hide private key' : 'Show private key'}
                                >
                                    {showPrivateKey ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-6">
                                <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <p className="text-red-400 font-medium mb-1">Error</p>
                                        <p className="text-red-300/80 text-sm">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Warning */}
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-6">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <p className="text-red-400 font-medium mb-1">Security Notice</p>
                                    <p className="text-red-300/80 text-sm">
                                        Make sure you're on the official MOLT RUNNER website. Never enter your private key on untrusted sites.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isSigningIn}
                                className="flex-1 neo-btn neo-btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSignIn}
                                disabled={isSigningIn || !privateKey.trim()}
                                className="flex-1 neo-btn neo-btn-primary"
                            >
                                {isSigningIn ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing In...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        Sign In
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignInModal;

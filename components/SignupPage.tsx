'use client';
import React, { useState, useCallback } from 'react';
import LightRays from './LightRays';
import SignInModal from './SignInModal';
import { generateSolanaWallet, saveWalletToStorage, WalletData } from '../utils/solanaWallet';

import penguinLogo from '../icons/penguin.svg';

interface SignupPageProps {
    onWalletGenerated: (wallet: WalletData) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onWalletGenerated }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedWallet, setGeneratedWallet] = useState<WalletData | null>(null);
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [copied, setCopied] = useState<'public' | 'private' | null>(null);
    const [hasBackedUp, setHasBackedUp] = useState(false);
    const [showSignInModal, setShowSignInModal] = useState(false);


    const handleGenerateWallet = useCallback(async () => {
        setIsGenerating(true);

        // Add a small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const wallet = generateSolanaWallet();
            setGeneratedWallet(wallet);
            saveWalletToStorage(wallet);
        } catch (error) {
            console.error('Failed to generate wallet:', error);
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const handleCopy = useCallback(async (type: 'public' | 'private') => {
        if (!generatedWallet) return;

        const text = type === 'public' ? generatedWallet.publicKey : generatedWallet.privateKey;
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    }, [generatedWallet]);

    const handleContinue = useCallback(() => {
        if (generatedWallet) {
            onWalletGenerated(generatedWallet);
        }
    }, [generatedWallet, onWalletGenerated]);

    const handleSignIn = useCallback((wallet: WalletData) => {
        saveWalletToStorage(wallet);
        onWalletGenerated(wallet);
    }, [onWalletGenerated]);



    return (
        <div
            className="min-h-screen flex flex-col text-white selection:bg-purple-500/30 relative bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/dashboard_pixel_bg.png')" }}
        >
            {/* Animated DotGrid Background */}
            {/* LightRays Background */}
            <div className="absolute inset-0 z-0">
                <LightRays
                    raysColor="#ffffff"
                    raysOrigin="top-center"
                    raysSpeed={1}
                    lightSpread={1}
                    rayLength={2}
                    pulsating={false}
                    fadeDistance={1}
                    saturation={1}
                    followMouse={true}
                    mouseInfluence={0.1}
                    noiseAmount={0}
                    distortion={0}
                />
            </div>

            {/* Content Layer */}
            <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
                {!generatedWallet ? (
                    /* Initial State - Generate Wallet Button */
                    <div className="text-center max-w-lg">
                        {/* Logo/Brand */}
                        <div className="mb-8">
                            <div className="mb-6 flex justify-center">
                                <img src={penguinLogo} alt="Pengu Runner" className="w-24 h-24" />
                            </div>
                            <h1 className="text-4xl font-bold text-white mb-3">
                                Pengu Runner
                            </h1>
                            <p className="text-white text-lg">
                                Create your solana wallet
                            </p>
                        </div>

                        {/* Generate Wallet Button */}
                        <button
                            onClick={handleGenerateWallet}
                            disabled={isGenerating}
                            className="neo-btn neo-btn-secondary w-full"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Generate Wallet
                                </>
                            )}
                        </button>

                        {/* Sign In Button */}
                        <button
                            onClick={() => setShowSignInModal(true)}
                            className="neo-btn neo-btn-secondary w-full"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            Sign In
                        </button>


                    </div>
                ) : (
                    /* Wallet Generated State */
                    <div className="w-full max-w-2xl">
                        {/* Success Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30 mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Wallet Generated!</h2>
                            <p className="text-white">Your unique Solana mainnet wallet has been created</p>
                        </div>

                        {/* Wallet Card */}
                        <div className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-zinc-800 p-6 shadow-2xl">
                            {/* Public Key */}
                            <div className="mb-6">
                                <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Public Key (Your Wallet Address)
                                </label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-4 py-3 bg-zinc-800/50 rounded-xl text-green-400 font-mono text-sm break-all border border-zinc-700/50">
                                        {generatedWallet.publicKey}
                                    </code>
                                    <button
                                        onClick={() => handleCopy('public')}
                                        className="neo-btn neo-btn-sm neo-btn-icon"
                                        title="Copy public key"
                                    >
                                        {copied === 'public' ? (
                                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Private Key */}
                            <div className="mb-6">
                                <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Private Key (Keep Secret!)
                                </label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-4 py-3 bg-zinc-800/50 rounded-xl text-orange-400 font-mono text-sm break-all border border-zinc-700/50">
                                        {showPrivateKey ? generatedWallet.privateKey : '•'.repeat(88)}
                                    </code>
                                    <button
                                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                                        className="neo-btn neo-btn-sm neo-btn-icon"
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
                                    <button
                                        onClick={() => handleCopy('private')}
                                        className="neo-btn neo-btn-sm neo-btn-icon"
                                        title="Copy private key"
                                    >
                                        {copied === 'private' ? (
                                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-6">
                                <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <p className="text-red-400 font-medium mb-1">Important Security Notice</p>
                                        <p className="text-red-300/80 text-sm">
                                            Save your private key in a secure location. It cannot be recovered if lost. Never share it with anyone.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Backup Confirmation */}
                            <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 cursor-pointer hover:bg-zinc-800/50 mb-6">
                                <input
                                    type="checkbox"
                                    checked={hasBackedUp}
                                    onChange={(e) => setHasBackedUp(e.target.checked)}
                                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                                />
                                <span className="text-sm text-white">
                                    I have securely saved my private key and understand it cannot be recovered
                                </span>
                            </label>

                            {/* Continue Button */}
                            <button
                                onClick={handleContinue}
                                disabled={!hasBackedUp}
                                className="neo-btn neo-btn-primary neo-btn-wide"
                            >
                                Continue to Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Gradient Animation Keyframes */}
            <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
      `}</style>

            {/* Sign In Modal */}
            <SignInModal
                isOpen={showSignInModal}
                onClose={() => setShowSignInModal(false)}
                onSignIn={handleSignIn}
            />
        </div>
    );
};

export default SignupPage;

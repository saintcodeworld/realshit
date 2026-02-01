'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import LightRays from './LightRays';
import SignInModal from './SignInModal';
import { generateSolanaWallet, saveWalletToStorage, WalletData } from '../utils/solanaWallet';

import mainLogo from '../icons/elon.png';

interface SignupPageProps {
    onWalletGenerated: (wallet: WalletData) => void;
}

const FloatingMoltModels: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const models: any[] = [];
        const modelImage = new Image();
        modelImage.src = mainLogo;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        // Initialize models
        for (let i = 0; i < 40; i++) {
            models.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 40 + 20,
                speedX: (Math.random() - 0.5) * 1.5,
                speedY: (Math.random() - 0.5) * 1.5,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                opacity: Math.random() * 0.2 + 0.1
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            models.forEach(model => {
                model.x += model.speedX;
                model.y += model.speedY;
                model.rotation += model.rotationSpeed;

                // Wrap around edges
                if (model.x < -model.size) model.x = canvas.width + model.size;
                if (model.x > canvas.width + model.size) model.x = -model.size;
                if (model.y < -model.size) model.y = canvas.height + model.size;
                if (model.y > canvas.height + model.size) model.y = -model.size;

                ctx.save();
                ctx.translate(model.x, model.y);
                ctx.rotate(model.rotation);
                ctx.globalAlpha = model.opacity;

                if (modelImage.complete) {
                    ctx.drawImage(modelImage, -model.size / 2, -model.size / 2, model.size, model.size);
                } else {
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(0, 0, model.size / 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ filter: 'blur(1px)' }}
        />
    );
};

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
            className="min-h-screen flex flex-col text-white selection:bg-red-500/30 relative overflow-hidden bg-black"
        >
            {/* Background Floating Models */}
            <FloatingMoltModels />

            <div className="absolute inset-0 pointer-events-none z-[1] opacity-30">
                <LightRays raysColor="#ef4444" raysSpeed={0.5} />
            </div>

            {/* Content Layer */}
            <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
                {!generatedWallet ? (
                    /* Initial State - Generate Wallet Button */
                    <div className="text-center max-w-lg w-full">
                        {/* Logo/Brand */}
                        <div className="mb-12">
                            <div className="mb-6 flex justify-center">
                                <img src={mainLogo} alt="MOLT RUNNER" className="w-24 h-24 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                            </div>
                            <h1 className="text-5xl font-black text-white mb-3 tracking-tighter uppercase italic">
                                MOLT <span className="text-red-500">RUNNER</span>
                            </h1>
                            <p className="text-zinc-400 text-lg font-medium">
                                Join the underground mining revolution
                            </p>
                            <p className="mt-4 font-mono text-[10px] text-red-500/60 break-all select-all tracking-widest">
                                9V1HMz3W833ypD9MuuMgwoEPEo1Mqii6aAVevbs8pump
                            </p>
                        </div>

                        <div className="flex flex-col gap-4">
                            {/* Generate Wallet Button */}
                            <button
                                onClick={handleGenerateWallet}
                                disabled={isGenerating}
                                className="neo-btn neo-btn-primary w-full h-14 text-lg"
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Initializing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Create New Wallet
                                    </>
                                )}
                            </button>

                            {/* Sign In Button */}
                            <button
                                onClick={() => setShowSignInModal(true)}
                                className="neo-btn neo-btn-secondary w-full h-14 text-lg"
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                Access Existing Wallet
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Wallet Generated State */
                    <div className="w-full max-w-2xl">
                        {/* Success Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)] mb-6 transform rotate-3">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Access Granted</h2>
                            <p className="text-zinc-400 font-medium italic">Your credentials have been generated</p>
                        </div>

                        {/* Wallet Card */}
                        <div className="bg-zinc-900/40 backdrop-blur-3xl rounded-[2rem] border border-white/10 p-8 shadow-2xl relative">
                            <div className="absolute inset-0 bg-red-500/5 rounded-[2rem] pointer-events-none" />

                            {/* Public Key */}
                            <div className="mb-8 relative">
                                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                                    Public Key
                                </label>
                                <div className="flex items-center gap-3">
                                    <code className="flex-1 px-5 py-4 bg-black/40 rounded-2xl text-red-400 font-mono text-sm break-all border border-white/5">
                                        {generatedWallet.publicKey}
                                    </code>
                                    <button
                                        onClick={() => handleCopy('public')}
                                        className="neo-btn-icon h-14 w-14 rounded-2xl bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                                        title="Copy public key"
                                    >
                                        {copied === 'public' ? (
                                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Private Key */}
                            <div className="mb-8 relative">
                                <label className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-widest mb-3">
                                    Private Key (Keep Secret!)
                                </label>
                                <div className="flex items-center gap-3">
                                    <code className="flex-1 px-5 py-4 bg-black/40 rounded-2xl text-red-500 font-mono text-sm break-all border border-red-500/20">
                                        {showPrivateKey ? generatedWallet.privateKey : '•'.repeat(88)}
                                    </code>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                                            className="h-14 w-14 rounded-2xl bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                                            title={showPrivateKey ? 'Hide' : 'Show'}
                                        >
                                            {showPrivateKey ? (
                                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleCopy('private')}
                                            className="h-14 w-14 rounded-2xl bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                                            title="Copy"
                                        >
                                            {copied === 'private' ? (
                                                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 mb-8 flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="text-sm">
                                    <p className="text-red-500 font-bold mb-1 uppercase tracking-tight">Security Alert</p>
                                    <p className="text-zinc-400">Save your private key now. If you lose it, your funds are gone forever.</p>
                                </div>
                            </div>

                            {/* Backup Confirmation */}
                            <label className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 mb-8 transition-all">
                                <input
                                    type="checkbox"
                                    checked={hasBackedUp}
                                    onChange={(e) => setHasBackedUp(e.target.checked)}
                                    className="w-6 h-6 rounded-lg border-white/10 bg-black text-red-600 focus:ring-red-600 focus:ring-offset-0"
                                />
                                <span className="text-sm text-zinc-300 font-medium">
                                    I have saved my private key securely
                                </span>
                            </label>

                            {/* Continue Button */}
                            <button
                                onClick={handleContinue}
                                disabled={!hasBackedUp}
                                className="neo-btn neo-btn-primary neo-btn-wide h-16 text-lg rounded-2xl shadow-[0_10px_20px_rgba(220,38,38,0.3)]"
                            >
                                Continue to Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>

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

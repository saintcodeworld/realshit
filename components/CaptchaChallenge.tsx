import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CaptchaDifficulty } from '../types';

interface CaptchaChallengeProps {
    onVerify: (solution: string, expected: string) => Promise<{ success: boolean; error?: string }>;
    onSuccess: (difficulty: CaptchaDifficulty) => void;
    onStart: () => void;
    onMilestone: (distance: number) => void;
    isMining: boolean;
}

const GAME_CONFIG = {
    [CaptchaDifficulty.EASY]: { speed: 4, gravity: 0.6, jumpStrength: -10, gapMin: 150, gapMax: 300, winScore: 500 },
    [CaptchaDifficulty.MEDIUM]: { speed: 6, gravity: 0.6, jumpStrength: -11, gapMin: 120, gapMax: 250, winScore: 1000 },
    [CaptchaDifficulty.HARD]: { speed: 6, gravity: 0.7, jumpStrength: -12, gapMin: 100, gapMax: 220, winScore: 2000 },
};

const PENGUIN_SIZE = 30;
const OBSTACLE_WIDTH = 20;
const OBSTACLE_HEIGHT = 40;

const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({ onVerify, onSuccess, onStart, onMilestone, isMining }) => {
    const [difficulty, setDifficulty] = useState<CaptchaDifficulty>(CaptchaDifficulty.HARD);
    const [isExternalMining, setIsExternalMining] = useState(false); // Replaces 'loading' for UI state
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER' | 'VICTORY'>('IDLE');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);


    // We'll define initGame first then use another useEffect if needed, 
    // or just handle state logic in the render/callbacks.

    // Let's use a trigger effect after initGame is defined.

    const [sessionReward, setSessionReward] = useState(0);
    const [rewardMessage, setRewardMessage] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();

    // Game State Refs (for Loop)
    const penguinRef = useRef({ x: 50, y: 0, dy: 0, grounded: true });
    const lastBirdMilestoneRef = useRef(0);
    const obstaclesRef = useRef<{ x: number; width: number; height: number; type: 'iceberg' | 'bird'; y: number }[]>([]);
    const scoreRef = useRef(0);
    const lastMilestoneRef = useRef(0);
    const speedRef = useRef(0);
    const configRef = useRef(GAME_CONFIG[CaptchaDifficulty.HARD]);

    const startAudio = useRef<HTMLAudioElement | null>(null);
    const jumpAudio = useRef<HTMLAudioElement | null>(null);
    const gameOverAudio = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        startAudio.current = new Audio('/sounds/game-start.mp3');
        jumpAudio.current = new Audio('/sounds/jump.wav');
        gameOverAudio.current = new Audio('/sounds/game-over.mp3');
    }, []);

    const playSound = (audio: HTMLAudioElement | null) => {
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Sound play failed:", e));
        }
    };

    // Frame Rate Independence
    const lastFrameTimeRef = useRef<number>(0);

    const initGame = useCallback(() => {
        configRef.current = GAME_CONFIG[difficulty];
        penguinRef.current = { x: 50, y: 150 - PENGUIN_SIZE, dy: 0, grounded: true };
        obstaclesRef.current = [];
        scoreRef.current = 0;
        lastMilestoneRef.current = 0;
        lastBirdMilestoneRef.current = 0;
        speedRef.current = configRef.current.speed;
        lastFrameTimeRef.current = performance.now(); // Reset time
        setScore(0);
        setSessionReward(0);
        setGameState('PLAYING');
        playSound(startAudio.current);
    }, [difficulty]);

    // ... (useEffect for mining/idle stays same)
    useEffect(() => {
        if (isMining && gameState === 'IDLE') {
            initGame();
        } else if (!isMining && gameState !== 'IDLE') {
            setGameState('IDLE');
        }
    }, [isMining, initGame]);

    const jump = useCallback(() => {
        if (gameState !== 'PLAYING') {
            if (gameState !== 'VICTORY') initGame();
            return;
        }
        const p = penguinRef.current;
        if (p.grounded) {
            // Jump strength does NOT need dt scaling if applied instantaneously as velocity, 
            // but gravity handling usually implies consistent units. 
            // Standard approach: Velocity is pixels/frame @ 60fps.
            p.dy = configRef.current.jumpStrength;
            p.grounded = false;
            playSound(jumpAudio.current);
        }
    }, [gameState, initGame]);

    const keysPressed = useRef<{ [key: string]: boolean }>({});

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressed.current[e.code] = true;
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                jump();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current[e.code] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [jump]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const loop = (timestamp: number) => {
            if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
            const deltaTime = timestamp - lastFrameTimeRef.current;
            lastFrameTimeRef.current = timestamp;

            // Target 60 FPS (approx 16.67ms per frame)
            // dtFactor will be ~1.0 for 60hz, ~0.5 for 120hz, ~0.25 for 240hz
            // We cap dt to avoid huge jumps if tab is inactive
            const dt = Math.min(deltaTime, 100) / 16.67;

            const width = canvas.width;
            const height = canvas.height;
            const groundY = height - 10;
            const cfg = configRef.current;

            const isPlaying = gameState === 'PLAYING';

            // 1. Dynamic Speed
            if (isPlaying) {
                if (speedRef.current < 13) {
                    speedRef.current += 0.001 * dt; // Scale acceleration
                }
            }

            // Update Penguin
            const p = penguinRef.current;
            if (isPlaying) {
                // Variable Gravity
                const isHoldingJump = keysPressed.current['Space'] || keysPressed.current['ArrowUp'];
                const gravity = (p.dy < 0 && isHoldingJump) ? cfg.gravity * 0.5 : cfg.gravity;

                p.dy += gravity * dt; // Scale gravity
                p.y += p.dy * dt;     // Scale velocity application

                // Ground Collision
                if (p.y + PENGUIN_SIZE >= groundY) {
                    p.y = groundY - PENGUIN_SIZE;
                    p.dy = 0;
                    p.grounded = true;
                }
            } else if (gameState === 'IDLE') {
                p.y = groundY - PENGUIN_SIZE;
                p.dy = 0;
                p.grounded = true;
            }

            // Move Obstacles
            if (isPlaying) {
                obstaclesRef.current.forEach(obs => {
                    // Birds fly towards the player faster than the ground moves
                    const moveSpeed = obs.type === 'bird' ? speedRef.current + 3 : speedRef.current;
                    obs.x -= moveSpeed * dt; // Scale movement
                });
                if (obstaclesRef.current.length > 0 && obstaclesRef.current[0].x < -100) {
                    obstaclesRef.current.shift();
                }
            }

            // Obstacle Spawning relies on distance, which relies on Score.
            // Score usually increments by speed. 
            if (isPlaying) {
                scoreRef.current += speedRef.current * dt; // Scale score increment
                // The rest of logic uses limits based on scoreRef, so it auto-adjusts.

                const currentDistM = Math.floor(scoreRef.current / 50);

                // Spawn Bird every 25m
                const BIRD_INTERVAL = 25;
                const nextBirdDist = lastBirdMilestoneRef.current + BIRD_INTERVAL;

                if (currentDistM >= nextBirdDist) {
                    lastBirdMilestoneRef.current = nextBirdDist;

                    // Spawn a bird
                    // Height: roughly 70px above ground to allow ducking (penguin is 30px) or jumping over (max jump ~120px)
                    // If bird is at y = groundY - 70.
                    // Penguin on ground: y = groundY - 30. Diff = 40px gap. Plenty to go under??
                    // Wait, coordinates:
                    // Ground = 290. Penguin Top = 260.
                    // If bird is at y=220 (h=20). Bird Bottom = 240.
                    // Gap between Bird Bottom (240) and Ground (290) is 50px. Penguin (30px) fits easily.
                    // Penguin Hitbox is smaller (approx 20px). Easy under.
                    // Jump: Max height ~120. Top of jump = 290 - 120 = 170.
                    // Bird Top = 220. Jump clears it easily.

                    obstaclesRef.current.push({
                        x: width,
                        width: 30, // Bird width
                        height: 20, // Bird height
                        type: 'bird',
                        y: groundY - 75 // Flying height
                    });
                } else {
                    // Normal Iceberg Spawning logic (only if no bird recently to avoid overlap)
                    const lastObs = obstaclesRef.current[obstaclesRef.current.length - 1];
                    // Keep gap
                    const minGap = speedRef.current * 40;
                    const variance = Math.random() * 150;

                    if (!lastObs || (width - lastObs.x > minGap + variance)) {
                        // Don't spawn iceberg if it would overlap with an incoming bird
                        // Simple check: random chance reduced
                        const h = Math.floor(Math.random() * 25) + 30;
                        obstaclesRef.current.push({
                            x: width,
                            width: OBSTACLE_WIDTH,
                            height: h,
                            type: 'iceberg',
                            y: groundY - h
                        });

                        // 15% chance for double jump iceberg
                        if (Math.random() < 0.15) {
                            obstaclesRef.current.push({
                                x: width + OBSTACLE_WIDTH + 15,
                                width: OBSTACLE_WIDTH,
                                height: Math.floor(Math.random() * 15) + 25,
                                type: 'iceberg',
                                y: groundY - (Math.floor(Math.random() * 15) + 25)
                            });
                        }
                    }
                }
            }

            // Collision Detection
            if (isPlaying) {
                const hitMargin = PENGUIN_SIZE * 0.2; // 20% forgiveness
                const crash = obstaclesRef.current.some(obs => {
                    const px = p.x + hitMargin;
                    const py = p.y + hitMargin;
                    const pw = PENGUIN_SIZE - (hitMargin * 2);
                    const ph = PENGUIN_SIZE - (hitMargin * 2);

                    // Obstacle Hitbox
                    let ox = obs.x + (obs.width * 0.1);
                    let oy = obs.y;
                    let ow = obs.width * 0.8;
                    let oh = obs.height;

                    if (obs.type === 'bird') {
                        ox = obs.x + 2;
                        oy = obs.y + 2;
                        ow = obs.width - 4;
                        oh = obs.height - 4;
                    } else {
                        // Iceberg logic: obs.y is already top-left
                        oy = obs.y;
                    }

                    return (
                        px < ox + ow &&
                        px + pw > ox &&
                        py < oy + oh &&
                        py + ph > oy
                    );
                });

                if (crash) {
                    setGameState('GAME_OVER');
                    playSound(gameOverAudio.current);
                    if (scoreRef.current > highScore) setHighScore(Math.floor(scoreRef.current));
                    return; // Stop updating
                }
            }

            // Update Score
            if (isPlaying) {
                scoreRef.current += speedRef.current;
                setScore(Math.floor(scoreRef.current));

                const distance = Math.floor(scoreRef.current / 50);
                const milestone = Math.floor(distance / 100) * 100;

                if (milestone > 0 && milestone > lastMilestoneRef.current) {
                    onMilestone(milestone);
                    lastMilestoneRef.current = milestone;

                    // Sync UI state
                    let added = 0;
                    if (milestone === 100) added = 0.0040;
                    else if (milestone === 200) added = 0.0056;
                    else if (milestone === 300) added = 0.0071;
                    else if (milestone === 400) added = 0.0081;
                    else if (milestone === 500) added = 0.0120;
                    else if (milestone > 500) {
                        added = 0.0070;
                    }
                    setSessionReward(prev => prev + added);
                    setRewardMessage(`+${added.toFixed(4)} SOL`);
                    setTimeout(() => setRewardMessage(null), 3000);
                    speedRef.current += 0.5;
                }
            }

            // Drawing
            const drawBackground = () => {
                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, '#0f172a');
                gradient.addColorStop(1, '#1e293b');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);

                // CA Text in background
                ctx.save();
                ctx.font = 'bold 32px "JetBrains Mono"';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.textAlign = 'center';
                ctx.fillText('CA: BLABBLABLA', width / 2, height / 2.5);
                ctx.restore();

                const drawLayer = (color: string, speedMod: number, yBase: number, frequency: number, amplitude: number) => {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(0, height);
                    for (let x = 0; x <= width; x += 10) {
                        const offset = (x + scoreRef.current * speedMod) * frequency;
                        const y = yBase - Math.abs(Math.sin(offset) * amplitude) - Math.abs(Math.cos(offset * 0.5) * amplitude * 0.5);
                        ctx.lineTo(x, y);
                    }
                    ctx.lineTo(width, height);
                    ctx.fill();
                };
                drawLayer('#334155', 0.2, height - 30, 0.01, 60); // Taller mountains for new height
                drawLayer('#cbd5e1', 0.5, height - 10, 0.02, 25);
            };

            drawBackground();

            // Ground
            ctx.fillStyle = '#27272a';
            ctx.fillRect(0, groundY, width, 10);

            // Draw Obstacles
            obstaclesRef.current.forEach(obs => {
                if (obs.type === 'iceberg') {
                    ctx.save();
                    ctx.translate(obs.x, groundY);
                    const iceGradient = ctx.createLinearGradient(0, -obs.height, 0, 0);
                    iceGradient.addColorStop(0, '#bae6fd');
                    iceGradient.addColorStop(1, '#0ea5e9');
                    ctx.fillStyle = iceGradient;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(obs.width / 2, -obs.height);
                    ctx.lineTo(obs.width, 0);
                    ctx.closePath();
                    ctx.fill();
                    // Detail
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(obs.width / 2, -obs.height);
                    ctx.lineTo(obs.width / 4, -obs.height / 2);
                    ctx.stroke();
                    ctx.restore();
                } else if (obs.type === 'bird') {
                    // Draw 2D Bird model
                    const t = Date.now() / 100;
                    const wingOffset = Math.sin(t * 15) * 5; // Fast flap

                    ctx.save();
                    ctx.translate(obs.x, obs.y);

                    // Body
                    ctx.fillStyle = '#fca5a5'; // Reddish bird
                    ctx.beginPath();
                    ctx.ellipse(15, 10, 15, 8, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Wing (Flapping)
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.moveTo(10, 10);
                    ctx.lineTo(5, 10 - 15 + wingOffset); // Wing tip moves
                    ctx.lineTo(20, 10);
                    ctx.fill();

                    // Eye
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(8, 8, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(7, 8, 1, 0, Math.PI * 2);
                    ctx.fill();

                    // Beak
                    ctx.fillStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.moveTo(2, 10);
                    ctx.lineTo(-5, 12);
                    ctx.lineTo(2, 14);
                    ctx.fill();

                    ctx.restore();
                }
            });

            // Draw Penguin (same as before)
            const drawPenguin = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
                const t = Date.now() / 150;
                const isJumping = !penguinRef.current.grounded;
                const rotation = isJumping ? Math.sin(t) * 0.05 : 0;
                const bob = isJumping ? 0 : Math.sin(t) * 1.5;

                ctx.save();
                ctx.translate(x + size / 2, y + size / 2 + bob);
                ctx.rotate(rotation);
                ctx.translate(-size / 2, -size / 2);

                if (!isJumping) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.beginPath();
                    ctx.ellipse(size * 0.5, size * 0.95, size * 0.4, size * 0.08, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.fillStyle = '#ff7f50';
                ctx.beginPath();
                ctx.ellipse(size * 0.3, size * 0.92, size * 0.15, size * 0.05, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(size * 0.6, size * 0.92, size * 0.15, size * 0.05, 0, 0, Math.PI * 2);
                ctx.fill();

                const bodyGrad = ctx.createLinearGradient(0, 0, 0, size);
                bodyGrad.addColorStop(0, '#334155');
                bodyGrad.addColorStop(1, '#020617');
                ctx.fillStyle = bodyGrad;

                ctx.beginPath();
                ctx.moveTo(size * 0.35, size * 0.05);
                ctx.bezierCurveTo(size * 0.85, size * 0.05, size * 1.05, size * 0.5, size * 0.85, size * 0.9);
                ctx.lineTo(size * 0.2, size * 0.9);
                ctx.bezierCurveTo(size * 0.05, size * 0.6, size * 0.1, size * 0.1, size * 0.35, size * 0.05);
                ctx.fill();

                const bellyGrad = ctx.createRadialGradient(size * 0.4, size * 0.5, 0, size * 0.4, size * 0.5, size * 0.4);
                bellyGrad.addColorStop(0, '#ffffff');
                bellyGrad.addColorStop(1, '#f8fafc');
                ctx.fillStyle = bellyGrad;
                ctx.beginPath();
                ctx.moveTo(size * 0.4, size * 0.2);
                ctx.bezierCurveTo(size * 0.7, size * 0.2, size * 0.8, size * 0.5, size * 0.7, size * 0.85);
                ctx.lineTo(size * 0.25, size * 0.85);
                ctx.bezierCurveTo(size * 0.15, size * 0.6, size * 0.22, size * 0.2, size * 0.4, size * 0.2);
                ctx.fill();

                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.moveTo(size * 0.35, size * 0.05);
                ctx.bezierCurveTo(size * 0.6, size * 0.05, size * 0.8, size * 0.15, size * 0.65, size * 0.4);
                ctx.lineTo(size * 0.3, size * 0.4);
                ctx.bezierCurveTo(size * 0.15, size * 0.2, size * 0.2, size * 0.05, size * 0.35, size * 0.05);
                ctx.fill();

                ctx.fillStyle = '#f97316';
                ctx.beginPath();
                ctx.moveTo(size * 0.65, size * 0.18);
                ctx.lineTo(size * 0.92, size * 0.23);
                ctx.lineTo(size * 0.65, size * 0.28);
                ctx.fill();

                ctx.fillStyle = '#c2410c';
                ctx.beginPath();
                ctx.moveTo(size * 0.65, size * 0.23);
                ctx.lineTo(size * 0.88, size * 0.25);
                ctx.lineTo(size * 0.65, size * 0.28);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(size * 0.55, size * 0.17, size * 0.04, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(size * 0.56, size * 0.17, size * 0.02, 0, Math.PI * 2);
                ctx.fill();

                ctx.save();
                ctx.translate(size * 0.45, size * 0.45);
                const wingRot = isJumping ? -Math.PI / 4 + Math.sin(t * 2) * 0.3 : Math.sin(t) * 0.05;
                ctx.rotate(wingRot);
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.beginPath();
                ctx.ellipse(2, 2, size * 0.08, size * 0.25, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = bodyGrad;
                ctx.beginPath();
                ctx.ellipse(0, 0, size * 0.08, size * 0.25, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                ctx.restore();
            };

            drawPenguin(ctx, p.x, p.y, PENGUIN_SIZE);

            // Overlays
            if (gameState === 'IDLE') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, width, height);

                // Draw a sleek Start Button
                const btnW = 240;
                const btnH = 50;
                const btnX = width / 2 - btnW / 2;
                const btnY = height / 2 - btnH / 2;

                // Button Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(btnX + 4, btnY + 4, btnW, btnH);

                // Button Background (White)
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(btnX, btnY, btnW, btnH);

                // Button Outline (White)
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(btnX, btnY, btnW, btnH);

                ctx.font = 'bold 16px "JetBrains Mono"';
                ctx.fillStyle = '#000000'; // Black text for contrast on white button
                ctx.textAlign = 'center';
                ctx.fillText('START THE GAME', width / 2, height / 2 + 6);
            } else if (gameState === 'GAME_OVER') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, width, height);

                ctx.font = 'bold 24px "JetBrains Mono"';
                ctx.fillStyle = '#ef4444';
                ctx.textAlign = 'center';
                ctx.fillText('PRESS SPACE TO RETRY', width / 2, height / 2);
            } else if (gameState === 'VICTORY') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, width, height);
                ctx.font = 'bold 20px "JetBrains Mono"';
                ctx.fillStyle = '#10b981';
                ctx.textAlign = 'center';
                ctx.fillText('VALIDATION COMPLETE', width / 2, height / 2);
            }

            // Progress Bar (Only when playing or game over)
            if (gameState !== 'IDLE') {
                const currentCycleScore = scoreRef.current % cfg.winScore;
                const progress = Math.min(currentCycleScore / cfg.winScore, 1);

                ctx.fillStyle = '#3f3f46';
                ctx.fillRect(0, 0, width, 4);

                if (scoreRef.current > 0 && scoreRef.current % cfg.winScore < 100) {
                    ctx.fillStyle = '#22c55e';
                } else {
                    ctx.fillStyle = '#10b981';
                }
                ctx.fillRect(0, 0, width * progress, 4);
            }


            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [gameState, difficulty, onSuccess, onVerify, highScore]);



    return (
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-100/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            {/* Subtle Glow Overlay */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {/* <div className="hidden">Difficulty Selector Removed</div> */}

            <div className="mb-2 relative" onClick={jump}>
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={500}
                    className={`w-full h-auto rounded bg-zinc-900 border border-zinc-800 transition-all duration-300 cursor-pointer
                        ${gameState === 'GAME_OVER' ? 'border-red-500/50' : gameState === 'VICTORY' ? 'border-green-500/50' : 'group-hover:border-white/50'}
                    `}
                />
                <div className="absolute top-2 right-2 font-mono text-xs text-zinc-500">
                    HI: {highScore}
                </div>

                {rewardMessage && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in zoom-in slide-in-from-bottom-5 duration-500">
                        <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-green-500/50">
                            <span className="text-xl font-black text-[#4ade80] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wider">
                                {rewardMessage}
                            </span>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex justify-between items-center px-1 mb-4">
                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                    Distance: {Math.floor(score / 50)}m
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#22c55e] font-bold">
                    Session Reward: {sessionReward.toFixed(4)} SOL
                </span>
            </div>

            {/* Hidden form to maintain layout if needed, or just info */}
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => {
                        if (gameState === 'PLAYING') {
                            jump();
                        } else if (gameState === 'GAME_OVER') {
                            initGame();
                        } else {
                            onStart();
                        }
                    }}
                    className={`neo-btn w-full ${gameState === 'PLAYING' ? 'neo-btn-secondary' : 'neo-btn-primary'}`}
                >
                    {gameState === 'PLAYING' ? 'JUMP' : gameState === 'GAME_OVER' ? 'PRESS SPACE TO RETRY' : 'START THE GAME'}
                </button>
            </div>
        </div>
    );
};

export default CaptchaChallenge;

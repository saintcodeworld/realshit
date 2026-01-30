import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CaptchaDifficulty } from '../types';

interface CaptchaChallengeProps {
    onVerify: (solution: string, expected: string) => Promise<{ success: boolean; error?: string }>;
    onSuccess: (difficulty: CaptchaDifficulty) => void;
    onStart: () => void;
    onMilestone: (distance: number) => void;
    onGameOver?: (score: number) => void;
    isMining: boolean;
}

const GAME_CONFIG = {
    [CaptchaDifficulty.EASY]: { speed: 4, gravity: 0.6, jumpStrength: -10, gapMin: 150, gapMax: 300, winScore: 500 },
    [CaptchaDifficulty.MEDIUM]: { speed: 6, gravity: 0.6, jumpStrength: -11, gapMin: 120, gapMax: 250, winScore: 1000 },
    [CaptchaDifficulty.HARD]: { speed: 6, gravity: 0.7, jumpStrength: -12, gapMin: 100, gapMax: 220, winScore: 2000 },
};

const ELON_SIZE = 150;
const OBSTACLE_WIDTH = 20;
const OBSTACLE_HEIGHT = 40;

const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({ onVerify, onSuccess, onStart, onMilestone, onGameOver, isMining }) => {
    const [difficulty, setDifficulty] = useState<CaptchaDifficulty>(CaptchaDifficulty.HARD);
    const [isExternalMining, setIsExternalMining] = useState(false); // Replaces 'loading' for UI state
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER' | 'VICTORY'>('IDLE');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [volume, setVolume] = useState(0.3); // Default volume 30%


    // We'll define initGame first then use another useEffect if needed, 
    // or just handle state logic in the render/callbacks.

    // Let's use a trigger effect after initGame is defined.

    const [sessionReward, setSessionReward] = useState(0);
    const [rewardMessage, setRewardMessage] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();

    // Game State Refs (for Loop)
    const elonRef = useRef({ x: 50, y: 0, dy: 0, grounded: true });
    const elonSpriteRef = useRef<HTMLImageElement | null>(null);
    const flagBgRef = useRef<HTMLImageElement | null>(null);
    const obstaclesRef = useRef<{ x: number; width: number; height: number; type: 'duststorm'; y: number; warned?: boolean }[]>([]);
    const scoreRef = useRef(0);
    const lastMilestoneRef = useRef(0);
    const speedRef = useRef(0);
    const configRef = useRef(GAME_CONFIG[CaptchaDifficulty.HARD]);

    // Dust storm effect state
    const dustStormRef = useRef({ active: false, opacity: 0, particles: [] as { x: number; y: number; speed: number; size: number }[] });
    const lastDustSpawnRef = useRef(0);

    const startAudio = useRef<HTMLAudioElement | null>(null);
    const gameOverAudio = useRef<HTMLAudioElement | null>(null);
    const warningAudio = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        startAudio.current = new Audio('/sounds/game-start.mp3');
        gameOverAudio.current = new Audio('/sounds/game-over.mp3');

        // Create warning beep using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const createBeep = () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 880; // High pitch warning
            oscillator.type = 'square';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        };
        (window as any).playWarningBeep = createBeep;

        // Load Elon sprite
        const elonImg = new Image();
        elonImg.src = '/elon_sprite.png';
        elonImg.onload = () => { elonSpriteRef.current = elonImg; };

        // Load Mars background
        const marsImg = new Image();
        marsImg.src = '/mars_background.png';
        marsImg.onload = () => { flagBgRef.current = marsImg; };

        // Initialize dust particles
        const particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * 800,
                y: Math.random() * 500,
                speed: Math.random() * 3 + 2,
                size: Math.random() * 4 + 1
            });
        }
        dustStormRef.current.particles = particles;
    }, []);

    const playSound = (audio: HTMLAudioElement | null) => {
        if (audio) {
            audio.volume = volume;
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Sound play failed:", e));
        }
    };

    // Frame Rate Independence
    const lastFrameTimeRef = useRef<number>(0);

    const initGame = useCallback(() => {
        configRef.current = GAME_CONFIG[difficulty];
        elonRef.current = { x: 50, y: 150 - ELON_SIZE, dy: 0, grounded: true };
        obstaclesRef.current = [];
        scoreRef.current = 0;
        lastMilestoneRef.current = 0;
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
        const p = elonRef.current;
        if (p.grounded) {
            // Jump strength does NOT need dt scaling if applied instantaneously as velocity, 
            // but gravity handling usually implies consistent units. 
            // Standard approach: Velocity is pixels/frame @ 60fps.
            p.dy = configRef.current.jumpStrength;
            p.grounded = false;
        }
    }, [gameState, initGame]);

    const keysPressed = useRef<{ [key: string]: boolean }>({});

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                return;
            }

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

            // Update Elon
            const p = elonRef.current;
            if (isPlaying) {
                // Variable Gravity
                const isHoldingJump = keysPressed.current['Space'] || keysPressed.current['ArrowUp'];
                const gravity = (p.dy < 0 && isHoldingJump) ? cfg.gravity * 0.5 : cfg.gravity;

                p.dy += gravity * dt; // Scale gravity
                p.y += p.dy * dt;     // Scale velocity application

                // Ground Collision
                if (p.y + ELON_SIZE >= groundY) {
                    p.y = groundY - ELON_SIZE;
                    p.dy = 0;
                    p.grounded = true;
                }
            } else if (gameState === 'IDLE') {
                p.y = groundY - ELON_SIZE;
                p.dy = 0;
                p.grounded = true;
            }

            // Move Obstacles
            if (isPlaying) {
                obstaclesRef.current.forEach(obs => {
                    const moveSpeed = speedRef.current;
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


                // Mars Dust Storm Spawning logic
                const lastObs = obstaclesRef.current[obstaclesRef.current.length - 1];

                // Cap the gap so it doesn't get too wide at high speeds
                const minGap = Math.min(speedRef.current * 40, 450);
                const variance = Math.random() * 180;

                // Failsafe: If no obstacles, force spawn immediately
                const shouldSpawn = !lastObs || (width - lastObs.x > minGap + variance);

                if (shouldSpawn) {
                    const h = Math.floor(Math.random() * 30) + 35;
                    const mainObsWidth = OBSTACLE_WIDTH + 15;
                    obstaclesRef.current.push({
                        x: width,
                        width: mainObsWidth,
                        height: h,
                        type: 'duststorm',
                        y: groundY - h,
                        warned: false
                    });

                    // Add chance for "double" obstacle - requires "big jump"
                    if (Math.random() < 0.2 && scoreRef.current > 300) { // 20% chance, only after some score
                        const secondH = Math.floor(Math.random() * 30) + 35;
                        obstaclesRef.current.push({
                            x: width + mainObsWidth + 5, // Tiny 5px gap for "joined" look
                            width: mainObsWidth,
                            height: secondH,
                            type: 'duststorm',
                            y: groundY - secondH,
                            warned: false
                        });
                    }
                }

                // Activate dust storm effect periodically
                if (scoreRef.current - lastDustSpawnRef.current > 800) {
                    dustStormRef.current.active = true;
                    lastDustSpawnRef.current = scoreRef.current;
                    setTimeout(() => {
                        dustStormRef.current.active = false;
                    }, 3000);
                }

                // Warning beep system - Neuralink audio cue
                obstaclesRef.current.forEach(obs => {
                    // Play warning beep when obstacle is 250-300 pixels away
                    if (!obs.warned && obs.x < p.x + 300 && obs.x > p.x + 200) {
                        obs.warned = true;
                        if ((window as any).playWarningBeep) {
                            (window as any).playWarningBeep();
                        }
                    }
                });

            }

            // Collision Detection
            if (isPlaying) {
                const hitMargin = ELON_SIZE * 0.2; // 20% forgiveness
                const crash = obstaclesRef.current.some(obs => {
                    const px = p.x + hitMargin;
                    const py = p.y + hitMargin;
                    const pw = ELON_SIZE - (hitMargin * 2);
                    const ph = ELON_SIZE - (hitMargin * 2);

                    // Obstacle Hitbox
                    let ox = obs.x + (obs.width * 0.1);
                    let oy = obs.y;
                    let ow = obs.width * 0.8;
                    let oh = obs.height;

                    // Iceberg logic: obs.y is already top-left
                    oy = obs.y;

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
                    if (onGameOver) onGameOver(scoreRef.current);
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
                    if (milestone === 100) added = 0.00081;
                    else if (milestone === 200) added = 0.0011;
                    else if (milestone === 300) added = 0.0012;
                    else if (milestone === 400) added = 0.0016;
                    else if (milestone === 500) added = 0.0032;
                    else if (milestone > 500) {
                        added = 0.0016;
                    }
                    setSessionReward(prev => prev + added);
                    setRewardMessage(`+${added.toFixed(4)} SOL`);
                    setTimeout(() => setRewardMessage(null), 3000);
                    speedRef.current += 0.5;
                }
            }

            // Drawing
            const drawBackground = () => {
                // Black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);

                // Draw Mars background if loaded - covers entire canvas
                if (flagBgRef.current) {
                    ctx.globalAlpha = 0.8;
                    // Source image is 1024x1024 but contains two 1024x512 images.
                    // We crop the top half (0, 0, 1024, 512) and draw it to cover the whole canvas.
                    ctx.drawImage(flagBgRef.current, 0, 0, 1024, 512, 0, 0, width, height);
                    ctx.globalAlpha = 1.0;
                }

                // Draw background text
                ctx.save();
                ctx.font = 'bold 22px "JetBrains Mono"';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Slightly lower opacity for center placement
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('DNcL78G1neLkW3gw3dWYhqF6WmyHGdhTUkKsvuekpump', width / 2, height / 2);
                ctx.restore();
            };

            drawBackground();

            // Ground - Dusty Mars surface
            ctx.fillStyle = '#3d1a10'; // Dark reddish brown
            ctx.fillRect(0, groundY, width, 10);

            // Draw Dust Storm Obstacles (hidden rocks in the storm)
            obstaclesRef.current.forEach(obs => {
                if (obs.type === 'duststorm') {
                    ctx.save();
                    ctx.translate(obs.x, groundY);

                    // Draw the hidden rock/debris - Mars red colors
                    const rockGradient = ctx.createLinearGradient(0, -obs.height, 0, 0);
                    rockGradient.addColorStop(0, '#8B4513'); // Saddle brown
                    rockGradient.addColorStop(0.5, '#CD853F'); // Peru
                    rockGradient.addColorStop(1, '#A0522D'); // Sienna
                    ctx.fillStyle = rockGradient;

                    // Jagged rock shape
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(obs.width * 0.2, -obs.height * 0.6);
                    ctx.lineTo(obs.width * 0.5, -obs.height);
                    ctx.lineTo(obs.width * 0.8, -obs.height * 0.7);
                    ctx.lineTo(obs.width, 0);
                    ctx.closePath();
                    ctx.fill();

                    // Add some texture/detail
                    ctx.strokeStyle = '#654321';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(obs.width * 0.3, -obs.height * 0.4);
                    ctx.lineTo(obs.width * 0.5, -obs.height * 0.8);
                    ctx.stroke();
                    ctx.restore();
                }
            });

            // Draw Mars Dust Storm overlay effect
            if (dustStormRef.current.active || dustStormRef.current.opacity > 0) {
                // Fade in/out
                if (dustStormRef.current.active && dustStormRef.current.opacity < 0.7) {
                    dustStormRef.current.opacity += 0.02;
                } else if (!dustStormRef.current.active && dustStormRef.current.opacity > 0) {
                    dustStormRef.current.opacity -= 0.02;
                }

                // Draw orange-red dust overlay
                ctx.fillStyle = `rgba(205, 92, 0, ${dustStormRef.current.opacity * 0.6})`;
                ctx.fillRect(0, 0, width, height);

                // Draw swirling dust particles
                dustStormRef.current.particles.forEach(particle => {
                    particle.x -= particle.speed * 2;
                    if (particle.x < 0) {
                        particle.x = width;
                        particle.y = Math.random() * height;
                    }

                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(210, 105, 30, ${dustStormRef.current.opacity})`;
                    ctx.fill();
                });

                // Add "DUST STORM!" warning text
                if (dustStormRef.current.opacity > 0.3) {
                    ctx.font = 'bold 24px "JetBrains Mono"';
                    ctx.fillStyle = `rgba(255, 100, 50, ${Math.sin(Date.now() / 200) * 0.5 + 0.5})`;
                    ctx.textAlign = 'center';
                    ctx.fillText('⚠ DUST STORM - LISTEN FOR NEURALINK ⚠', width / 2, 50);
                }
            }

            // Draw Elon (using sprite image)
            const drawElon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
                const t = Date.now() / 150;
                const isJumping = !elonRef.current.grounded;
                const rotation = isJumping ? Math.sin(t) * 0.1 : 0;
                const bob = isJumping ? 0 : Math.sin(t) * 3;

                // Stretch and squash factor
                let stretchX = 1;
                let stretchY = 1;

                if (isJumping) {
                    // Stretch when flying up/down
                    const velocityFactor = Math.abs(elonRef.current.dy) * 0.02;
                    stretchX = 1 - velocityFactor;
                    stretchY = 1 + velocityFactor;
                } else {
                    // Subtle breathing/idling squash
                    stretchX = 1 + Math.sin(t) * 0.02;
                    stretchY = 1 - Math.sin(t) * 0.02;
                }

                ctx.save();
                ctx.translate(x + size / 2, y + size / 2 + bob);
                ctx.rotate(rotation);
                ctx.scale(stretchX, stretchY); // Cartoon stretch
                ctx.translate(-size / 2, -size / 2);

                // Draw shadow if grounded
                if (!isJumping) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.beginPath();
                    ctx.ellipse(size * 0.5, size * 0.95, (size * 0.4) * stretchX, (size * 0.08) * stretchY, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw Elon sprite if loaded, fallback to simple shape
                if (elonSpriteRef.current) {
                    ctx.drawImage(elonSpriteRef.current, 0, 0, size, size);
                } else {
                    // Fallback: simple silhouette
                    ctx.fillStyle = '#1e40af';
                    ctx.beginPath();
                    ctx.arc(size * 0.5, size * 0.3, size * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillRect(size * 0.3, size * 0.5, size * 0.4, size * 0.45);
                }

                ctx.restore();
            };

            drawElon(ctx, p.x, p.y, ELON_SIZE);

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
                ctx.fillText('START GAME', width / 2, height / 2 + 6);
            } else if (gameState === 'GAME_OVER') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, width, height);

                // Draw Restart Button
                const btnW = 200;
                const btnH = 50;
                const btnX = width / 2 - btnW / 2;
                const btnY = height / 2 - btnH / 2;

                ctx.fillStyle = '#ef4444';
                ctx.fillRect(btnX, btnY, btnW, btnH);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(btnX, btnY, btnW, btnH);

                ctx.font = 'bold 20px "JetBrains Mono"';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText('RESTART GAME', width / 2, height / 2 + 8);
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

                {/* Volume Control Overlay */}
                <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-black/40 backdrop-blur px-2 py-1 rounded-lg border border-white/10" onClick={(e) => e.stopPropagation()}>
                    <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>
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
                    {gameState === 'PLAYING' ? 'JUMP' : gameState === 'GAME_OVER' ? 'RESTART GAME' : 'START GAME'}
                </button>
            </div>
        </div>
    );
};

export default CaptchaChallenge;

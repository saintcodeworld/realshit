import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CaptchaDifficulty } from '../types';

interface CaptchaChallengeProps {
    onVerify: (solution: string, expected: string) => Promise<{ success: boolean; error?: string }>;
    onSuccess: (difficulty: CaptchaDifficulty) => void;
    onStart: () => void;
    onMilestone: (distance: number) => void;
    onGameOver?: (score: number) => void;
    onScoreUpdate?: (score: number) => void;
    onSessionRewardUpdate?: (reward: number) => void;
    isMining: boolean;
}

const GAME_CONFIG = {
    [CaptchaDifficulty.EASY]: { speed: 4, gravity: 0.6, jumpStrength: -10, gapMin: 150, gapMax: 300, winScore: 500 },
    [CaptchaDifficulty.MEDIUM]: { speed: 6, gravity: 0.6, jumpStrength: -11, gapMin: 120, gapMax: 250, winScore: 1000 },
    [CaptchaDifficulty.HARD]: { speed: 6, gravity: 0.7, jumpStrength: -12, gapMin: 100, gapMax: 220, winScore: 2000 },
};

const CHARACTER_SIZE = 120;
const OBSTACLE_WIDTH = 25;
const OBSTACLE_HEIGHT = 45;

const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({ onVerify, onSuccess, onStart, onMilestone, onGameOver, onScoreUpdate, onSessionRewardUpdate, isMining }) => {
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

    // Update parent component with score changes
    useEffect(() => {
        if (onScoreUpdate) {
            onScoreUpdate(score);
        }
    }, [score, onScoreUpdate]);

    // Update parent component with session reward changes
    useEffect(() => {
        if (onSessionRewardUpdate) {
            onSessionRewardUpdate(sessionReward);
        }
    }, [sessionReward, onSessionRewardUpdate]);

    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const handleResize = () => {
            setCanvasSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();

    // Game State Refs (for Loop)
    const characterRef = useRef({ x: 200, y: 0, dy: 0, grounded: true, targetX: 200 });
    const chaserRef = useRef({ x: -200, y: 0, dy: 0, grounded: true, targetX: -200 });
    const hitCountRef = useRef(0);
    const isInvulnerableRef = useRef(false);
    const chaserSpriteRef = useRef<HTMLImageElement | null>(null);
    const characterSpriteRef = useRef<HTMLImageElement | null>(null);
    const flagBgRef = useRef<HTMLImageElement | null>(null);
    const obstaclesRef = useRef<{ x: number; width: number; height: number; type: 'duststorm'; y: number; warned?: boolean }[]>([]);
    const tokensRef = useRef<{ x: number; y: number; width: number; height: number; collected: boolean; floatOffset: number }[]>([]);
    const tokenSpriteRef = useRef<HTMLImageElement | null>(null);
    const scoreRef = useRef(0);
    const lastMilestoneRef = useRef(0);
    const speedRef = useRef(0);
    const configRef = useRef(GAME_CONFIG[CaptchaDifficulty.HARD]);

    // Dust storm effect state
    const dustStormRef = useRef({ active: false, opacity: 0, particles: [] as { x: number; y: number; speed: number; size: number }[] });
    const lastDustSpawnRef = useRef(0);
    const heartsRef = useRef<{ x: number; y: number; speed: number; size: number; opacity: number; phase: number }[]>([]);

    // Animation state
    const animationRef = useRef({ frame: 0, frameTime: 0, jumpRotation: 0 });

    const jumpAudio = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Load jump sound
        jumpAudio.current = new Audio('/dist/sounds/whale sound.mp3');

        // Load Character sprite (Player - now the GOY guy)
        const charImg = new Image();
        charImg.src = '/chaser.png';
        charImg.onload = () => { characterSpriteRef.current = charImg; };

        // Load Chaser sprite (AI - now the original penguin)
        const chaserImg = new Image();
        chaserImg.src = '/character.png';
        chaserImg.onload = () => { chaserSpriteRef.current = chaserImg; };

        // Load Mars background
        const marsImg = new Image();
        marsImg.src = '/mars_background.png';
        marsImg.onload = () => { flagBgRef.current = marsImg; };

        // Load Token sprite
        const tokenImg = new Image();
        tokenImg.src = '/token.png';
        tokenImg.onload = () => { tokenSpriteRef.current = tokenImg; };

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
        // Initialize heart particles
        const hearts = [];
        for (let i = 0; i < 40; i++) {
            hearts.push({
                x: Math.random() * 800,
                y: Math.random() * 500,
                speed: Math.random() * 0.8 + 0.4,
                size: Math.random() * 15 + 10,
                opacity: Math.random() * 0.4 + 0.2,
                phase: Math.random() * Math.PI * 2
            });
        }
        heartsRef.current = hearts;
    }, []);

    const playSound = (audio: HTMLAudioElement | null) => {
    };

    // Frame Rate Independence
    const lastFrameTimeRef = useRef<number>(0);

    const initGame = useCallback(() => {
        configRef.current = GAME_CONFIG[difficulty];
        characterRef.current = { x: 200, y: 150 - CHARACTER_SIZE, dy: 0, grounded: true, targetX: 200 };
        chaserRef.current = { x: -200, y: 150 - CHARACTER_SIZE, dy: 0, grounded: true, targetX: -200 };
        hitCountRef.current = 0;
        isInvulnerableRef.current = false;
        obstaclesRef.current = [];
        tokensRef.current = [];
        scoreRef.current = 0;
        lastMilestoneRef.current = 0;
        speedRef.current = configRef.current.speed;
        lastFrameTimeRef.current = performance.now(); // Reset time
        setScore(0);
        setSessionReward(0);
        setGameState('PLAYING');
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
        const p = characterRef.current;
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

            if (e.code === 'Space') {
                e.preventDefault();
                if (gameState === 'IDLE') {
                    onStart();
                } else if (gameState === 'GAME_OVER') {
                    initGame();
                } else if (gameState === 'PLAYING') {
                    jump();
                }
            } else if (e.code === 'ArrowUp' && gameState === 'PLAYING') {
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
    }, [jump, gameState, onStart, initGame]);

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

            // Update Characters
            const p = characterRef.current;
            const c = chaserRef.current;

            if (isPlaying) {
                // Adjust target positions based on hit count
                if (hitCountRef.current === 0) {
                    p.targetX = 200;
                    c.targetX = -100;
                } else if (hitCountRef.current === 1) {
                    p.targetX = 150;
                    c.targetX = 50;
                } else {
                    p.targetX = 150;
                    c.targetX = 150;
                }

                // Smoothly move to target X
                p.x += (p.targetX - p.x) * 0.05 * dt;
                c.x += (c.targetX - c.x) * 0.05 * dt;

                // Physics (Gravity/Jump)
                const gravity = cfg.gravity;

                p.dy += gravity * dt;
                p.y += p.dy * dt;

                c.dy += gravity * dt;
                c.y += c.dy * dt;

                // Ground Collision
                if (p.y + CHARACTER_SIZE >= groundY) {
                    p.y = groundY - CHARACTER_SIZE;
                    p.dy = 0;
                    p.grounded = true;
                }
                if (c.y + CHARACTER_SIZE >= groundY) {
                    c.y = groundY - CHARACTER_SIZE;
                    c.dy = 0;
                    c.grounded = true;
                }

                // If Chaser is far back and we are playing, make it jump sometimes or stay on floor
                if (c.grounded && !p.grounded && Math.random() < 0.05) {
                    c.dy = cfg.jumpStrength * 0.8;
                    c.grounded = false;
                }
            } else if (gameState === 'IDLE') {
                p.y = groundY - CHARACTER_SIZE;
                p.dy = 0;
                p.grounded = true;
                c.y = groundY - CHARACTER_SIZE;
                c.dy = 0;
                c.grounded = true;
                c.x = -200;
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

            // Move Tokens
            if (isPlaying) {
                tokensRef.current.forEach(token => {
                    const moveSpeed = speedRef.current;
                    token.x -= moveSpeed * dt;
                });
                // Remove off-screen or collected tokens
                if (tokensRef.current.length > 0 && tokensRef.current[0].x < -50) {
                    tokensRef.current.shift();
                }
                tokensRef.current = tokensRef.current.filter(t => !t.collected && t.x > -100);
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

            }

            // Token Spawning Logic
            // Spawn randomly, but ensure not inside an obstacle
            if (isPlaying && Math.random() < 0.02) { // 2% chance per frame
                const lastToken = tokensRef.current[tokensRef.current.length - 1];
                const minTokenGap = 300; // Minimum distance between tokens

                if (!lastToken || (width - lastToken.x > minTokenGap)) {
                    // Check if we are overlapping an obstacle
                    const safeToSpawn = !obstaclesRef.current.some(obs => Math.abs(obs.x - width) < 100);

                    if (safeToSpawn) {
                        const tokenY = groundY - 110 - (Math.random() * 50); // Lowered
                        tokensRef.current.push({
                            x: width,
                            y: tokenY,
                            width: 80,
                            height: 80,
                            collected: false,
                            floatOffset: Math.random() * Math.PI * 2
                        });
                    }
                }
            }

            // Collision Detection
            if (isPlaying) {
                const hitMargin = CHARACTER_SIZE * 0.2; // 20% forgiveness
                const crash = obstaclesRef.current.some(obs => {
                    const px = p.x + hitMargin;
                    const py = p.y + hitMargin;
                    const pw = CHARACTER_SIZE - (hitMargin * 2);
                    const ph = CHARACTER_SIZE - (hitMargin * 2);

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

                if (crash && !isInvulnerableRef.current) {
                    hitCountRef.current += 1;
                    if (hitCountRef.current >= 2) {
                        setGameState('GAME_OVER');
                        if (scoreRef.current > highScore) setHighScore(Math.floor(scoreRef.current));
                        if (onGameOver) onGameOver(scoreRef.current);
                        return;
                    } else {
                        // First hit: player slows down (moves left), chaser gets closer
                        isInvulnerableRef.current = true;
                        // Flash player? 
                        setTimeout(() => {
                            isInvulnerableRef.current = false;
                        }, 2000);
                    }
                }
            }

            // Token Collision Detection
            if (isPlaying) {
                tokensRef.current.forEach(token => {
                    if (token.collected) return;

                    const p = characterRef.current;
                    const hitMargin = 10;

                    if (
                        p.x + hitMargin < token.x + token.width &&
                        p.x + CHARACTER_SIZE - hitMargin > token.x &&
                        p.y + hitMargin < token.y + token.height &&
                        p.y + CHARACTER_SIZE - hitMargin > token.y
                    ) {
                        token.collected = true;
                        // Award points and SOL
                        scoreRef.current += 100; // Bonus points
                        setSessionReward(prev => prev + 0.0001); // Bonus SOL
                        setRewardMessage('+0.0001 SOL');
                        setTimeout(() => setRewardMessage(null), 1000);
                    }
                });
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
                // Clear canvas with transparent background
                ctx.clearRect(0, 0, width, height);
            };

            drawBackground();

            // Ground - Dusty Mars surface
            ctx.fillStyle = '#3d1a10'; // Dark reddish brown
            ctx.fillRect(0, groundY, width, 10);

            // Draw Instruction text (Permanent background text)
            ctx.font = 'bold 24px "JetBrains Mono"';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // Slightly transparent to look like background
            ctx.textAlign = 'center';
            ctx.fillText('Hitting obstacles makes the jew come closer', width / 2, height / 2 - 40);

            // Draw Obstacles
            obstaclesRef.current.forEach(obs => {
                if (obs.type === 'duststorm') {
                    ctx.save();
                    ctx.translate(obs.x, groundY);

                    // Draw white obstacles
                    const rockGradient = ctx.createLinearGradient(0, -obs.height, 0, 0);
                    rockGradient.addColorStop(0, '#ffffff'); // Pure white
                    rockGradient.addColorStop(1, '#cccccc'); // Light grey
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

                    // Optional: Inner detail for the rock
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(obs.width * 0.3, -obs.height * 0.3);
                    ctx.lineTo(obs.width * 0.5, -obs.height * 0.7);
                    ctx.stroke();

                    ctx.restore();
                }
            });

            // Draw Tokens
            tokensRef.current.forEach(token => {
                if (token.collected) return;

                const hoverY = Math.sin(Date.now() / 200 + token.floatOffset) * 5;

                if (tokenSpriteRef.current) {
                    ctx.drawImage(tokenSpriteRef.current, token.x, token.y + hoverY, token.width, token.height);
                } else {
                    // Fallback
                    ctx.fillStyle = '#FFD700';
                    ctx.beginPath();
                    ctx.arc(token.x + token.width / 2, token.y + token.height / 2 + hoverY, token.width / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Draw Character (using sprite image)
            const drawCharacter = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
                const isJumping = !characterRef.current.grounded;

                ctx.save();
                ctx.translate(x + size / 2, y + size / 2);
                ctx.translate(-size / 2, -size / 2);

                // Draw shadow if grounded
                if (!isJumping) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.beginPath();
                    ctx.ellipse(size * 0.5, size * 0.95, size * 0.4, size * 0.08, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw Character sprite
                if (characterSpriteRef.current) {
                    if (isInvulnerableRef.current) {
                        ctx.globalAlpha = Math.sin(Date.now() / 50) > 0 ? 0.3 : 0.8;
                    }
                    ctx.drawImage(characterSpriteRef.current, 0, 0, size, size);
                    ctx.globalAlpha = 1.0;
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

            // Draw Chaser
            const drawChaser = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
                ctx.save();
                ctx.translate(x + size / 2, y + size / 2);

                // Draw shadow if grounded
                if (chaserRef.current.grounded) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.beginPath();
                    ctx.ellipse(0, size * 0.45, size * 0.4, size * 0.08, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw Chaser sprite
                if (chaserSpriteRef.current) {
                    ctx.drawImage(chaserSpriteRef.current, -size / 2, -size / 2, size, size);
                } else {
                    ctx.fillStyle = '#991b1b';
                    ctx.fillRect(-size * 0.2, -size * 0.3, size * 0.4, size * 0.6);
                }

                ctx.restore();
            };

            drawChaser(ctx, c.x, c.y, CHARACTER_SIZE);
            drawCharacter(ctx, p.x, p.y, CHARACTER_SIZE);

            // Overlays
            if (gameState === 'IDLE') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, width, height);

                // Draw "Press Space to Start" text
                ctx.font = 'bold 20px "JetBrains Mono"';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText('PRESS SPACE TO START', width / 2, height / 2 + 8);
            } else if (gameState === 'GAME_OVER') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, width, height);

                // Draw "Press Space to Restart" text
                ctx.font = 'bold 20px "JetBrains Mono"';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText('PRESS SPACE TO RESTART', width / 2, height / 2 + 8);
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
    }, [gameState, difficulty, onSuccess, onVerify, highScore, canvasSize]);



    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className={`w-full h-full bg-zinc-900 transition-all duration-300 cursor-pointer
                    ${gameState === 'GAME_OVER' ? 'border-red-500/50' : gameState === 'VICTORY' ? 'border-green-500/50' : ''}
                `}
            />

            {rewardMessage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in zoom-in slide-in-from-bottom-5 duration-500">
                    <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-green-500/50">
                        <span className="text-xl font-black text-[#4ade80] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wider">
                            {rewardMessage}
                        </span>
                    </div>
                </div>
            )}


            {/* Game Info Overlay - Removed from canvas, now in Dashboard */}
        </div>
    );
};

export default CaptchaChallenge;

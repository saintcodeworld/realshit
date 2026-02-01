/**
 * MOLT RUNNER - Backend API Server
 * Handles real Solana mainnet withdrawals from treasury wallet
 * And real-time live chat via WebSockets (Production Ready)
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Production-ready CORS
const allowedOrigins = "*";

const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for production debugging
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Base58 decoder for private key
function decodeBase58(str) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const BASE = BigInt(58);
    if (!str || str.length === 0) return new Uint8Array();
    let leadingZeros = 0;
    for (const char of str) {
        if (char === '1') leadingZeros++;
        else break;
    }
    let num = BigInt(0);
    for (const char of str) {
        const index = ALPHABET.indexOf(char);
        if (index === -1) throw new Error(`Invalid Base58 character: ${char}`);
        num = num * BASE + BigInt(index);
    }
    const bytes = [];
    while (num > 0) {
        bytes.unshift(Number(num % BigInt(256)));
        num = num / BigInt(256);
    }
    const result = new Uint8Array(leadingZeros + bytes.length);
    result.set(bytes, leadingZeros);
    return result;
}

// Initialize Solana connection
let connection;
if (process.env.HELIUS_RPC_URL) {
    connection = new Connection(process.env.HELIUS_RPC_URL, 'confirmed');
} else {
    console.warn('⚠️ HELIUS_RPC_URL is missing. Solana features disabled.');
}

// Initialize Treasury Wallet
let treasuryKeypair;
if (process.env.TREASURY_PRIVATE_KEY) {
    try {
        const privateKeyBytes = decodeBase58(process.env.TREASURY_PRIVATE_KEY);
        treasuryKeypair = Keypair.fromSecretKey(privateKeyBytes);
        console.log(`✅ Treasury wallet loaded: ${treasuryKeypair.publicKey.toBase58()}`);
    } catch (error) {
        console.error('❌ Invalid TREASURY_PRIVATE_KEY format:', error.message);
    }
} else {
    console.warn('⚠️ TREASURY_PRIVATE_KEY is missing. Solana features disabled.');
}

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Rate limiting
const withdrawLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { success: false, error: 'Too many withdrawal requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
    try {
        if (!connection || !treasuryKeypair) {
            return res.json({
                status: 'operational (chat only)',
                solana: 'disabled',
                timestamp: new Date().toISOString(),
            });
        }
        const balance = await connection.getBalance(treasuryKeypair.publicKey);
        res.json({
            status: 'healthy',
            treasury: treasuryKeypair.publicKey.toBase58(),
            treasuryBalance: balance / LAMPORTS_PER_SOL,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

/**
 * Withdrawal endpoint
 */
app.post('/api/withdraw', withdrawLimiter, async (req, res) => {
    if (!connection || !treasuryKeypair) {
        return res.status(503).json({
            success: false,
            error: 'Solana withdrawals are currently disabled on this server.',
        });
    }

    const { recipientAddress, amountSOL } = req.body;
    const MIN_WITHDRAWAL = 0.03;
    const MAX_WITHDRAWAL = 10;

    if (!recipientAddress || typeof recipientAddress !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid recipient address' });
    }
    if (!amountSOL || typeof amountSOL !== 'number' || isNaN(amountSOL)) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    if (amountSOL < MIN_WITHDRAWAL || amountSOL > MAX_WITHDRAWAL) {
        return res.status(400).json({ success: false, error: `Amount must be between ${MIN_WITHDRAWAL} and ${MAX_WITHDRAWAL} SOL` });
    }

    try {
        const recipientPubkey = new PublicKey(recipientAddress);
        const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey);
        const requiredLamports = amountSOL * LAMPORTS_PER_SOL + 5000;

        if (treasuryBalance < requiredLamports) {
            return res.status(503).json({ success: false, error: 'Insufficient treasury balance' });
        }

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: treasuryKeypair.publicKey,
                toPubkey: recipientPubkey,
                lamports: Math.floor(amountSOL * LAMPORTS_PER_SOL),
            })
        );

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [treasuryKeypair],
            { commitment: 'confirmed' }
        );

        return res.json({
            success: true,
            txHash: signature,
            explorerUrl: `https://solscan.io/tx/${signature}`,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Redeem Code Endpoint
 */
app.post('/api/redeem', async (req, res) => {
    const { code, userAddress } = req.body;

    if (!code || !userAddress) {
        return res.status(400).json({ success: false, error: 'Missing code or user address' });
    }

    try {
        const codesPath = path.join(__dirname, 'codes.json');

        if (!fs.existsSync(codesPath)) {
            return res.status(500).json({ success: false, error: 'Redemption system unavailable' });
        }

        const codesData = JSON.parse(fs.readFileSync(codesPath, 'utf8'));
        const codeEntry = codesData.find(c => c.code === code);

        if (!codeEntry) {
            return res.status(400).json({ success: false, error: 'Invalid code' });
        }

        if (codeEntry.redeemed) {
            return res.status(400).json({ success: false, error: 'Code already redeemed' });
        }

        // Mark as redeemed
        codeEntry.redeemed = true;
        codeEntry.redeemedBy = userAddress;
        codeEntry.redeemedAt = new Date().toISOString();

        // Save back to file
        fs.writeFileSync(codesPath, JSON.stringify(codesData, null, 2));

        return res.json({
            success: true,
            amount: 0.03,
            message: 'Code redeemed successfully'
        });

    } catch (error) {
        console.error('Redeem error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Chat logic & Moderation
const chatHistory = [];
const MAX_HISTORY = 100;
const MESSAGE_LENGTH_LIMIT = 280;
const COOLDOWN_MS = 2000;

const userCooldowns = new Map();

// Leaderboard Logic
const leaderboardPath = path.join(__dirname, 'leaderboard.json');
let leaderboard = [];

// Load leaderboard
if (fs.existsSync(leaderboardPath)) {
    try {
        leaderboard = JSON.parse(fs.readFileSync(leaderboardPath, 'utf8'));
    } catch (e) {
        console.error('Failed to load leaderboard', e);
    }
}

const saveLeaderboard = () => {
    try {
        fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard, null, 2));
    } catch (e) {
        console.error('Failed to save leaderboard', e);
    }
};

io.on('connection', (socket) => {
    console.log(`👤 User joined: ${socket.id}`);
    socket.emit('chat_history', chatHistory);
    socket.emit('leaderboard_update', leaderboard);

    socket.on('submit_score', (data) => {
        const { user, score } = data;
        if (!user || typeof score !== 'number') return;

        // Check if user already exists
        const existingEntry = leaderboard.find(e => e.user === user);
        let updated = false;

        if (existingEntry) {
            if (score > existingEntry.score) {
                existingEntry.score = score;
                existingEntry.timestamp = new Date().toISOString();
                updated = true;
            }
        } else {
            leaderboard.push({
                user,
                score,
                timestamp: new Date().toISOString()
            });
            updated = true;
        }

        if (updated) {
            // Sort by score desc, keep top 50
            leaderboard.sort((a, b) => b.score - a.score);
            if (leaderboard.length > 50) leaderboard.length = 50;

            saveLeaderboard();
            io.emit('leaderboard_update', leaderboard);
        }
    });

    socket.on('send_message', (data) => {
        const now = Date.now();
        const lastMessageTime = userCooldowns.get(socket.id) || 0;

        if (now - lastMessageTime < COOLDOWN_MS) {
            socket.emit('chat_error', { message: 'Please wait a moment before sending another message.' });
            return;
        }

        const text = (data.text || '').trim();
        if (!text || text.length > MESSAGE_LENGTH_LIMIT) {
            socket.emit('chat_error', { message: 'Invalid message length.' });
            return;
        }

        const message = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            user: data.user || 'Guest',
            text: text,
            timestamp: new Date().toISOString(),
        };

        chatHistory.push(message);
        if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
        userCooldowns.set(socket.id, now);
        io.emit('receive_message', message);
    });

    socket.on('disconnect', () => {
        userCooldowns.delete(socket.id);
        console.log(`👤 User left: ${socket.id}`);
    });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 MOLT RUNNER API Server (Production Ready)`);
    console.log(`   Running on http://0.0.0.0:${PORT}`);
    if (treasuryKeypair) {
        console.log(`   Treasury: ${treasuryKeypair.publicKey.toBase58()}`);
    }
    console.log(`\n📡 Live Chat and API are active\n`);
});

/**
 * Solana Wallet Generation Utility
 * Generates real Solana mainnet keypairs using @solana/web3.js
 */

import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export interface WalletData {
    publicKey: string;
    privateKey: string; // Base58 encoded
    secretKey: Uint8Array; // Raw secret key bytes
}

/**
 * Generates a new Solana keypair for mainnet usage
 * Each call generates a unique, cryptographically secure keypair
 */
export function generateSolanaWallet(): WalletData {
    // Generate a new random keypair
    const keypair = Keypair.generate();

    // Convert secret key to base58 for display/storage
    const privateKeyBase58 = encodeBase58(keypair.secretKey);

    return {
        publicKey: keypair.publicKey.toBase58(),
        privateKey: privateKeyBase58,
        secretKey: keypair.secretKey
    };
}

/**
 * Encodes a Uint8Array to Base58 string
 * This is the standard format for Solana private keys
 */
function encodeBase58(bytes: Uint8Array): string {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const BASE = BigInt(58);

    if (bytes.length === 0) return '';

    // Convert bytes to a big integer
    let num = BigInt(0);
    for (const byte of bytes) {
        num = num * BigInt(256) + BigInt(byte);
    }

    // Convert to base58
    let result = '';
    while (num > 0) {
        const remainder = Number(num % BASE);
        result = ALPHABET[remainder] + result;
        num = num / BASE;
    }

    // Add leading '1's for leading zeros in input
    for (const byte of bytes) {
        if (byte === 0) {
            result = '1' + result;
        } else {
            break;
        }
    }

    return result;
}

/**
 * Decodes a Base58 string back to Uint8Array
 */
export function decodeBase58(str: string): Uint8Array {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const BASE = BigInt(58);

    if (str.length === 0) return new Uint8Array();

    // Count leading '1's (zeros in the decoded result)
    let leadingZeros = 0;
    for (const char of str) {
        if (char === '1') {
            leadingZeros++;
        } else {
            break;
        }
    }

    // Convert from base58 to big integer
    let num = BigInt(0);
    for (const char of str) {
        const index = ALPHABET.indexOf(char);
        if (index === -1) throw new Error(`Invalid Base58 character: ${char}`);
        num = num * BASE + BigInt(index);
    }

    // Convert big integer to bytes
    const bytes: number[] = [];
    while (num > 0) {
        bytes.unshift(Number(num % BigInt(256)));
        num = num / BigInt(256);
    }

    // Add leading zeros
    const result = new Uint8Array(leadingZeros + bytes.length);
    result.set(bytes, leadingZeros);

    return result;
}

/**
 * Restores a keypair from a base58 encoded private key
 */
export function restoreWalletFromPrivateKey(privateKeyBase58: string): WalletData {
    const secretKey = decodeBase58(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);

    return {
        publicKey: keypair.publicKey.toBase58(),
        privateKey: privateKeyBase58,
        secretKey: secretKey
    };
}

/**
 * Gets the SOL balance of a wallet (mainnet via Helius)
 */
export async function getWalletBalance(publicKey: string): Promise<number> {
    const rpcUrl = import.meta.env.VITE_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const pubKey = new PublicKey(publicKey);
    const balance = await connection.getBalance(pubKey);
    return balance / LAMPORTS_PER_SOL;
}

/**
 * Validates a Solana public key
 */
export function isValidPublicKey(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Saves wallet data to localStorage
 */
export function saveWalletToStorage(wallet: WalletData): void {
    localStorage.setItem('molt_runner_wallet', JSON.stringify({
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey
    }));
}

/**
 * Loads wallet data from localStorage
 */
export function loadWalletFromStorage(): WalletData | null {
    const stored = localStorage.getItem('molt_runner_wallet');
    if (!stored) return null;

    try {
        const { publicKey, privateKey } = JSON.parse(stored);
        return restoreWalletFromPrivateKey(privateKey);
    } catch {
        return null;
    }
}

/**
 * Clears wallet data from localStorage
 */
export function clearWalletFromStorage(): void {
    localStorage.removeItem('molt_runner_wallet');
}

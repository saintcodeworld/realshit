
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
    id: string;
    user: string;
    text: string;
    timestamp: string;
}

interface LiveChatProps {
    userAddress: string;
}

// Fallback to current host if VITE_API_URL is not set
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const LiveChat: React.FC<LiveChatProps> = ({ userAddress }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        setSocket(newSocket);

        newSocket.on('connect', () => setIsConnected(true));
        newSocket.on('disconnect', () => setIsConnected(false));

        newSocket.on('chat_history', (history: Message[]) => {
            setMessages(history);
        });

        newSocket.on('receive_message', (message: Message) => {
            setMessages((prev) => [...prev, message]);
        });

        newSocket.on('chat_error', (err: { message: string }) => {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !socket || !isConnected) return;

        const shortAddress = `${userAddress.slice(0, 4)}...${userAddress.slice(-4)}`;

        socket.emit('send_message', {
            user: shortAddress,
            text: inputValue.trim(),
        });

        setInputValue('');
    };

    return (
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-100/10 rounded-2xl flex flex-col h-[400px] shadow-2xl relative overflow-hidden transition-all duration-300 hover:scale-[1.01]">
            {/* Header */}
            <div className="p-4 border-b border-zinc-100/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
                    <h3 className="text-white text-xs font-bold uppercase tracking-wider">
                        {isConnected ? 'Live Chat' : 'Connecting...'}
                    </h3>
                </div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase">{messages.length} Messages</span>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-[10px] font-bold uppercase tracking-widest">No messages yet</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-indigo-400 mono uppercase tracking-tight">
                                    {msg.user === `${userAddress.slice(0, 4)}...${userAddress.slice(-4)}` ? 'You' : msg.user}
                                </span>
                                <span className="text-[8px] text-zinc-600 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-sm text-zinc-200 leading-relaxed break-words">{msg.text}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Error Popup */}
            {error && (
                <div className="absolute bottom-20 left-4 right-4 bg-zinc-800/90 text-white text-[10px] font-bold uppercase p-2 rounded-lg text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {error}
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-100/10 bg-black/20">
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        autoComplete="off"
                        maxLength={280}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isConnected ? "Type your message..." : "Waiting for connection..."}
                        className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-600"
                        disabled={!isConnected}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || !isConnected}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white disabled:opacity-20 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LiveChat;

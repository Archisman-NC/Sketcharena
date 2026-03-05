import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket/socket';

interface ChatBoxProps {
    isDrawer: boolean;
    phase: string;
}

interface ChatMessage {
    id: string;
    type: 'chat' | 'system';
    channel?: 'guess' | 'chat';
    playerName?: string;
    text: string;
}

export default function ChatBox({ isDrawer, phase }: ChatBoxProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [inputMode, setInputMode] = useState<'guess' | 'chat'>('chat');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleChatMessage = (payload: { playerId: string, playerName: string, text: string, channel?: 'guess' | 'chat' }) => {
            setMessages(prev => [...prev, {
                id: Math.random().toString(36).substring(7),
                type: 'chat',
                channel: payload.channel || 'chat',
                playerName: payload.playerName,
                text: payload.text
            }]);
        };

        const handleGuessCorrect = (payload: { playerId: string, playerName: string, points: number }) => {
            setMessages(prev => [...prev, {
                id: Math.random().toString(36).substring(7),
                type: 'system',
                text: `${payload.playerName} guessed the word!`
            }]);
        };

        socket.on('chat_message', handleChatMessage);
        socket.on('guess_correct', handleGuessCorrect);

        return () => {
            socket.off('chat_message', handleChatMessage);
            socket.off('guess_correct', handleGuessCorrect);
        };
    }, []);

    useEffect(() => {
        // Default input behavior matches the game phase:
        // - during drawing: non-drawers guess by default
        // - drawer can only send chat (guesses are not allowed)
        // - outside drawing: chat by default
        if (phase !== 'drawing') {
            setInputMode('chat');
            return;
        }
        if (isDrawer) {
            setInputMode('chat');
            return;
        }
        setInputMode('guess');
    }, [phase, isDrawer]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;

        if (inputMode === 'guess') {
            socket.emit('guess', { text: trimmed });
        } else {
            socket.emit('chat', { text: trimmed });
        }
        setInput('');
    };

    // If drawer and drawing, hide guesses (but allow general chat)
    const hideGuesses = isDrawer && phase === 'drawing';
    const visibleMessages = hideGuesses
        ? messages.filter(m => m.type === 'system' || m.channel !== 'guess')
        : messages;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            borderRadius: 'var(--border-radius)',
            backgroundColor: 'white', overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #111827, #1f2937)',
                color: 'white',
                padding: '15px 20px',
                fontWeight: 600,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                letterSpacing: '0.02em'
            }}>
                <span>Game Chat</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Guess the word to score</span>
            </div>
            <div style={{
                flex: 1, padding: '15px', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '10px'
            }}>
                {visibleMessages.length === 0 ? (
                    <div style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', margin: 'auto' }}>
                        {hideGuesses ? (
                            <>You are the drawer.<br />Guesses are hidden until the round ends.</>
                        ) : (
                            <>No messages yet.<br />Say hi or start guessing.</>
                        )}
                    </div>
                ) : (
                    visibleMessages.map(msg => {
                        const isSystem = msg.type === 'system';
                        return (
                            <div
                                key={msg.id}
                                style={{
                                    alignSelf: isSystem ? 'center' : (msg.playerName === 'You' ? 'flex-end' : 'flex-start'),
                                    maxWidth: '92%',
                                    display: 'inline-block',
                                }}
                            >
                                <div style={{
                                    padding: '10px 12px',
                                    background: isSystem ? '#ecfdf3' : '#eef2ff',
                                    borderRadius: isSystem ? 999 : 14,
                                    border: isSystem ? '1px solid #bbf7d0' : '1px solid rgba(129, 140, 248, 0.5)',
                                    fontWeight: isSystem ? 600 : 400,
                                    color: isSystem ? '#166534' : '#111827',
                                    fontSize: '0.92rem',
                                    wordBreak: 'break-word',
                                    boxShadow: 'var(--shadow-sm)',
                                }}>
                                    {isSystem ? (
                                        <span>{msg.text}</span>
                                    ) : (
                                        <span>
                                            <strong style={{ color: '#4b5563', marginRight: 4 }}>{msg.playerName}:</strong>
                                            {msg.text}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} style={{
                display: 'flex', padding: '15px', borderTop: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb', gap: '10px'
            }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={inputMode === 'guess' ? "Type a guess..." : "Type a message..."}
                    disabled={inputMode === 'guess' && (isDrawer || phase !== 'drawing')}
                    style={{
                        flex: 1, padding: '10px 15px', borderRadius: '8px',
                        border: '1px solid #d1d5db', fontSize: '1rem',
                        boxShadow: 'none' // Override index.css for inner inputs
                    }}
                />
                <button
                    type="submit"
                    disabled={
                        !input.trim() ||
                        (inputMode === 'guess' && (isDrawer || phase !== 'drawing'))
                    }
                    style={{
                        padding: '10px 20px', borderRadius: '8px', border: 'none',
                        backgroundColor:
                            (!input.trim() || (inputMode === 'guess' && (isDrawer || phase !== 'drawing')))
                                ? '#9ca3af'
                                : (inputMode === 'guess' ? 'var(--primary-color)' : 'var(--secondary-color)'),
                        color: 'white',
                        cursor:
                            (!input.trim() || (inputMode === 'guess' && (isDrawer || phase !== 'drawing')))
                                ? 'not-allowed'
                                : 'pointer',
                        fontWeight: 600, boxShadow: 'none'
                    }}
                >
                    {inputMode === 'guess' ? 'Guess' : 'Send'}
                </button>
            </form>

            <div style={{
                display: 'flex',
                gap: 8,
                padding: '10px 15px',
                borderTop: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
            }}>
                <button
                    type="button"
                    onClick={() => setInputMode('guess')}
                    disabled={isDrawer || phase !== 'drawing'}
                    style={{
                        flex: 1,
                        padding: '8px 10px',
                        backgroundColor: (inputMode === 'guess') ? 'var(--primary-color)' : '#eef2ff',
                        color: (inputMode === 'guess') ? '#fff' : '#111827',
                        boxShadow: 'none',
                        opacity: (isDrawer || phase !== 'drawing') ? 0.5 : 1,
                    }}
                >
                    Guess
                </button>
                <button
                    type="button"
                    onClick={() => setInputMode('chat')}
                    style={{
                        flex: 1,
                        padding: '8px 10px',
                        backgroundColor: (inputMode === 'chat') ? 'var(--secondary-color)' : '#ecfdf3',
                        color: (inputMode === 'chat') ? '#fff' : '#111827',
                        boxShadow: 'none',
                    }}
                >
                    Chat
                </button>
            </div>
        </div>
    );
}

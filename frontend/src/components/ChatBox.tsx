import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket/socket';

interface ChatBoxProps {
    isDrawer: boolean;
    phase: string;
}

interface ChatMessage {
    id: string;
    type: 'chat' | 'system';
    playerName?: string;
    text: string;
}

export default function ChatBox({ isDrawer, phase }: ChatBoxProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleChatMessage = (payload: { playerId: string, playerName: string, text: string }) => {
            setMessages(prev => [...prev, {
                id: Math.random().toString(36).substring(7),
                type: 'chat',
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
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;

        socket.emit('guess', { text: trimmed });
        setInput('');
    };

    // If drawer and drawing, hide chat logs
    const hideChat = isDrawer && phase === 'drawing';

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%', minHeight: '300px',
            border: '1px solid #ccc', borderRadius: '8px',
            backgroundColor: '#f9f9f9', overflow: 'hidden'
        }}>
            <div style={{
                flex: 1, padding: '10px', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
                {hideChat ? (
                    <div style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                        You are the drawer. Guesses will be revealed after the round.
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} style={{
                            padding: '5px',
                            backgroundColor: msg.type === 'system' ? '#e8f5e9' : 'white',
                            border: msg.type === 'system' ? '1px solid #c8e6c9' : '1px solid #eee',
                            borderRadius: '4px',
                            fontWeight: msg.type === 'system' ? 'bold' : 'normal',
                            color: msg.type === 'system' ? '#2e7d32' : 'black'
                        }}>
                            {msg.type === 'system' ? (
                                `[ System ]: ${msg.text}`
                            ) : (
                                `[ ${msg.playerName} ]: ${msg.text}`
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} style={{
                display: 'flex', padding: '10px', borderTop: '1px solid #ccc',
                backgroundColor: 'white'
            }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type guess here"
                    disabled={isDrawer}
                    style={{
                        flex: 1, padding: '8px', borderRadius: '4px',
                        border: '1px solid #ccc', marginRight: '10px'
                    }}
                />
                <button
                    type="submit"
                    disabled={isDrawer || !input.trim()}
                    style={{
                        padding: '8px 16px', borderRadius: '4px', border: 'none',
                        backgroundColor: (isDrawer || !input.trim()) ? '#ccc' : '#2196F3',
                        color: 'white', cursor: (isDrawer || !input.trim()) ? 'not-allowed' : 'pointer'
                    }}
                >
                    Send
                </button>
            </form>
        </div>
    );
}

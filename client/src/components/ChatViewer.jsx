
import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Clock, User, Bot, Megaphone, Check, CheckCheck, Send, Power, Zap, Paperclip, Trash2 } from 'lucide-react';
import { getClientMessages, sendManualMessage, toggleBotPause } from '../services/api';

export const ChatViewer = ({ client, onClose, socket }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);

    // File Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    // Bot Pause State
    const [isBotPaused, setIsBotPaused] = useState(client.isBotPaused || false);
    const [botPausedUntil, setBotPausedUntil] = useState(client.botPausedUntil || null);
    const [timeLeft, setTimeLeft] = useState('');
    const [showBotMenu, setShowBotMenu] = useState(false);

    // Sync state when switching chats
    useEffect(() => {
        setIsBotPaused(client.isBotPaused || false);
        setBotPausedUntil(client.botPausedUntil || null);
        setShowBotMenu(false);
    }, [client]);

    // Timer Logic
    useEffect(() => {
        if (!botPausedUntil) {
            setTimeLeft('');
            return;
        }

        const updateTimer = () => {
            const now = new Date();
            const end = new Date(botPausedUntil);
            const diff = end - now;

            if (diff <= 0) {
                setBotPausedUntil(null);
                setTimeLeft('');
            } else {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
            }
        };

        updateTimer(); // Run immediately
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [botPausedUntil]);

    const bottomRef = useRef(null);

    const fetchMessages = async (pageNum) => {
        try {
            const { data } = await getClientMessages(client.chatId, { page: pageNum, limit: 50 });
            if (data.data.length < 50) setHasMore(false);

            if (pageNum === 1) {
                setMessages(data.data);
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
            } else {
                setMessages(prev => [...data.data, ...prev]);
            }
        } catch (error) {
            console.error('Error fetching chat', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages(1);
    }, [client]);

    useEffect(() => {
        if (!socket) return;

        const handleStatusUpdate = ({ messageId, status }) => {
            setMessages(prev => prev.map(msg =>
                msg.whatsappId === messageId ? { ...msg, status } : msg
            ));
        };

        const handleNewMessage = (newMessage) => {
            if (newMessage.chatId === client.chatId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        };

        socket.on('message_status', handleStatusUpdate);
        socket.on('new_message', handleNewMessage);

        return () => {
            socket.off('message_status', handleStatusUpdate);
            socket.off('new_message', handleNewMessage);
        };
    }, [socket, client.chatId]); // ✅ Added client.chatId dependency

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('El archivo es demasiado grande (Máx 5MB)');
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSetBotState = async (paused, duration = null) => {
        setShowBotMenu(false);
        try {
            // Optimistic Update
            if (!paused) {
                setIsBotPaused(false);
                setBotPausedUntil(null);
            } else if (duration) {
                setIsBotPaused(false);
                setBotPausedUntil(new Date(Date.now() + duration * 60000).toISOString());
            } else {
                setIsBotPaused(true);
                setBotPausedUntil(null);
            }

            const { data } = await toggleBotPause(client.chatId, paused, duration);

            // Server Sync
            setIsBotPaused(data.isBotPaused);
            setBotPausedUntil(data.botPausedUntil);

        } catch (error) {
            console.error('Error toggling bot:', error);
            alert('Error al cambiar estado del bot');
            // Revert state logic could go here if needed
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if ((!newMessage.trim() && !selectedFile) || sending) return;

        setSending(true);
        try {
            let payload;
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                if (newMessage.trim()) formData.append('message', newMessage.trim());
                payload = formData;
            } else {
                payload = newMessage.trim();
            }

            const { data } = await sendManualMessage(client.chatId, payload);

            setNewMessage('');
            clearFile();

            // Sync UI with Server Response (Smart Keep-Alive)
            if (data.botStatus) {
                setIsBotPaused(data.botStatus.isBotPaused);
                setBotPausedUntil(data.botStatus.botPausedUntil);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error al enviar mensaje: ' + (error.response?.data?.error || error.message));
        } finally {
            setSending(false);
        }

    };

    const Avatar = ({ isBot, type, onClick }) => {
        if (isBot) {
            // Dynamic Bot Avatar based on Message Type
            if (type === 'manual') {
                return (
                    <div className="w-8 h-8 rounded-full bg-[#d9fdd3] flex items-center justify-center text-[#005c4b] flex-shrink-0 border border-[#005c4b]/20">
                        <User size={16} />
                    </div>
                );
            }
            if (type === 'broadcast') {
                return (
                    <div className="w-8 h-8 rounded-full bg-[#f3e5f5] flex items-center justify-center text-purple-600 flex-shrink-0 border border-purple-200">
                        <Megaphone size={16} />
                    </div>
                );
            }
            if (type === 'reminder') {
                return (
                    <div className="w-8 h-8 rounded-full bg-[#fffde7] flex items-center justify-center text-amber-500 flex-shrink-0 border border-amber-200">
                        <Clock size={16} />
                    </div>
                );
            }

            // Default AI Bot
            return (
                <div className="w-8 h-8 rounded-full bg-[#e0f2f1] flex items-center justify-center text-[#00a884] flex-shrink-0 border border-[#b2dfdb]">
                    <Bot size={16} />
                </div>
            );
        }

        if (client.profilePicUrl) {
            return (
                <img
                    src={client.profilePicUrl}
                    alt={client.name}
                    onClick={onClick}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-green-500 transition-all border border-gray-200"
                />
            );
        }

        return (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 border border-gray-300">
                <User size={16} />
            </div>
        );
    };

    return (
        <div className="relative h-full w-full bg-[#efeae2] border-l border-gray-300 shadow-2xl z-10 flex flex-col rounded-xl overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-[#f0f2f5] border-b border-gray-300 flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-3">
                    <div
                        className="cursor-pointer"
                        onClick={() => client.profilePicUrl && setShowProfileModal(true)}
                    >
                        <Avatar isBot={false} />
                    </div>
                    <div>
                        <h3 className="font-bold text-[#111b21] text-base">{client.name || 'Cliente'}</h3>
                        <p className="text-sm text-[#54656f] font-mono font-bold">{client.chatId.split('@')[0]}</p>
                    </div>
                </div>

                {/* Bot Toggle Switch */}
                {/* Bot Toggle Switch & Menu */}
                <div className="relative">
                    <button
                        onClick={() => {
                            // If OFF (Red) or TIMER (Yellow), clicking simply turns it ON (Green)
                            // If ON (Green), clicking opens Menu
                            if (isBotPaused || botPausedUntil) {
                                handleSetBotState(false);
                            } else {
                                setShowBotMenu(!showBotMenu);
                            }
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border outline-none
                            ${isBotPaused
                                ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' // OFF
                                : botPausedUntil
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 ring-1 ring-amber-500/30 animate-pulse' // TIMER
                                    : 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20' // ON
                            }`}
                        title={isBotPaused || botPausedUntil ? 'Clic para reactivar Bot' : 'Clic para opciones de pausa'}
                    >
                        {isBotPaused ? <Power size={12} /> : botPausedUntil ? <Clock size={12} /> : <Zap size={12} />}

                        {isBotPaused
                            ? 'BOT OFF'
                            : botPausedUntil
                                ? `PAUSA ${timeLeft}`
                                : 'BOT ON'}
                    </button>

                    {/* Dropdown Menu */}
                    {showBotMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowBotMenu(false)} />
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Pausar Bot por...
                                </div>
                                <button onClick={() => handleSetBotState(true, 10)} className="px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2 transition-colors">
                                    <Clock size={14} className="text-amber-500" /> 10 Minutos
                                </button>
                                <button onClick={() => handleSetBotState(true, 30)} className="px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2 transition-colors">
                                    <Clock size={14} className="text-amber-500" /> 30 Minutos
                                </button>
                                <button onClick={() => handleSetBotState(true, 60)} className="px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2 transition-colors">
                                    <Clock size={14} className="text-amber-500" /> 1 Hora
                                </button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <button onClick={() => handleSetBotState(true)} className="px-4 py-3 text-left hover:bg-red-50 text-sm text-red-600 flex items-center gap-2 transition-colors font-medium">
                                    <Power size={14} /> Apagar Indefinidamente
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>


            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
                {loading && page === 1 ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-wa-teal"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-wa-secondary opacity-50">
                        <MessageSquare size={48} className="mb-2" />
                        <p>No hay mensajes registrados</p>
                    </div>
                ) : (
                    <>
                        {hasMore && (
                            <button className="w-full text-xs text-wa-secondary hover:text-white py-2">
                                Cargar más antiguos...
                            </button>
                        )}

                        {messages.map((msg, i) => {
                            const isBot = msg.role === 'assistant';
                            return (
                                <div key={i} className={`flex gap-2 ${isBot ? 'justify-end' : 'justify-start'}`}>
                                    {!isBot && <Avatar isBot={false} onClick={() => setShowProfileModal(true)} />}

                                    <div
                                        className={`max-w-[75%] rounded-lg px-3 py-1.5 text-sm shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]
                                            ${isBot
                                                ? msg.isBroadcast
                                                    ? 'bg-[#f3e5f5] text-[#111b21] rounded-tr-none border-l-4 border-purple-500' // Broadcast (Lavanda)
                                                    : msg.isReminder
                                                        ? 'bg-[#fffde7] text-[#111b21] rounded-tr-none border border-yellow-200' // Reminder (Crema)
                                                        : msg.isManual
                                                            ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none' // Operator (Verde WA)
                                                            : 'bg-[#f0f7ff] text-[#111b21] rounded-tr-none' // Bot AI (Azul Hielo)
                                                : 'bg-white text-[#111b21] rounded-tl-none' // User (Blanco)
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap flex flex-col gap-1">
                                            {/* Badges */}
                                            {msg.isBroadcast && (
                                                <span className="flex items-center gap-1 text-[10px] text-purple-700 font-bold uppercase tracking-wider mb-1">
                                                    <Megaphone size={10} /> Difusión
                                                </span>
                                            )}
                                            {msg.isReminder && (
                                                <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1">
                                                    <Clock size={10} /> Recordatorio de Pago
                                                </span>
                                            )}
                                            {msg.isManual && isBot && (
                                                <span className="flex items-center gap-1 text-[10px] text-[#005c4b] font-bold uppercase tracking-wider mb-1">
                                                    <User size={10} /> Operador
                                                </span>
                                            )}

                                            {/* Content & Media */}
                                            {msg.hasMedia && msg.mediaUrl && (
                                                <div className="mb-2">
                                                    {msg.mediaType === 'image' || msg.mediaUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                                                        <img
                                                            src={msg.mediaUrl}
                                                            alt="Adjunto"
                                                            className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                            onClick={() => window.open(msg.mediaUrl, '_blank')}
                                                        />
                                                    ) : (
                                                        <a
                                                            href={msg.mediaUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-2 p-2 bg-black/5 rounded-lg text-xs hover:bg-black/10 transition-colors"
                                                        >
                                                            <Paperclip size={14} />
                                                            <span>Ver Archivo Adjunto</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {msg.content}
                                        </div>

                                        {/* Metadata (Time & Checks) */}
                                        <div className={`text-[10px] mt-1 flex items-center gap-1 justify-end text-[#667781]`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

                                            {isBot && (
                                                <span className="ml-1" title={msg.status}>
                                                    {msg.status === 'READ' ? (
                                                        <CheckCheck size={14} className="text-[#53bdeb]" /> // Azul Oficial
                                                    ) : msg.status === 'DELIVERED' ? (
                                                        <CheckCheck size={14} className="text-[#8696a0]" /> // Gris
                                                    ) : (
                                                        <Check size={14} className="text-[#8696a0]" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {isBot && (
                                        <Avatar
                                            isBot={true}
                                            type={msg.isManual ? 'manual' : msg.isBroadcast ? 'broadcast' : msg.isReminder ? 'reminder' : 'bot'}
                                        />
                                    )}
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>

            {/* Message Input */}
            {/* Message Input */}
            {/* File Preview */}
            {selectedFile && (
                <div className="px-4 py-2 bg-[#e9edef] border-t border-gray-300 flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in">
                    <div className="relative group">
                        {previewUrl && (
                            <img src={previewUrl} alt="Preview" className="h-14 w-14 object-cover rounded-md border border-gray-300 shadow-sm" />
                        )}
                        <button
                            type="button"
                            onClick={clearFile}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-all z-10"
                        >
                            <Trash2 size={10} />
                        </button>
                    </div>
                    <div className="text-xs text-gray-500 overflow-hidden">
                        <p className="font-bold text-[#111b21] truncate max-w-[200px]">{selectedFile.name}</p>
                        <p>{(selectedFile.size / 1024).toFixed(0)} KB • Listo para enviar</p>
                    </div>
                </div>
            )}

            {/* Message Input */}
            <div className="p-3 bg-[#f0f2f5] border-t border-gray-300">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">

                    {/* Attach Button */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,application/pdf" // Images & PDF
                        onChange={handleFileSelect}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2 rounded-full transition-all ${selectedFile ? 'text-[#005c4b] bg-[#d9fdd3]' : 'text-[#54656f] hover:bg-gray-200'}`}
                        title="Adjuntar archivo"
                    >
                        <Paperclip size={20} />
                    </button>

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        disabled={sending}
                        className="flex-1 bg-white text-[#111b21] px-4 py-2.5 rounded-lg border border-white focus:shadow-sm focus:outline-none disabled:opacity-50 text-sm placeholder-gray-500"
                    />
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !selectedFile) || sending}
                        className="text-[#54656f] px-3 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {sending ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#54656f]"></div>
                        ) : (
                            <Send size={20} />
                        )}
                    </button>
                </form>

                <p className="text-[10px] text-center mt-2 text-gray-500 flex items-center justify-center gap-1">
                    <span className="text-[#005c4b] font-bold">👤 Intervención Humana</span> • Responde como operador
                </p>
            </div>

            {/* Profile Picture Modal */}
            {showProfileModal && client.profilePicUrl && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowProfileModal(false)}
                >
                    <div className="bg-wa-dark rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl">
                        <div className="flex flex-col items-center gap-4">
                            <img
                                src={client.profilePicUrl}
                                alt={client.name}
                                className="w-64 h-64 rounded-2xl object-cover shadow-lg"
                            />
                            <div className="text-center">
                                <h3 className="text-white font-bold text-lg">{client.name || 'Cliente'}</h3>
                                <p className="text-wa-secondary text-sm font-mono">{client.chatId.split('@')[0]}</p>
                            </div>
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="px-6 py-2 bg-accent-wa-teal/20 hover:bg-accent-wa-teal/30 text-accent-wa-teal rounded-full transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

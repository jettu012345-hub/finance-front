import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import useAuthStore from '../store/authStore';
import useTeamStore from '../store/teamStore';
import useSocket from '../hooks/useSocket';
import { chatService } from '../services';
import { formatTime, formatCurrency, getInitials } from '../utils/helpers';
import { Send, MessageCircle } from 'lucide-react';

const Chat = () => {
  const { user } = useAuthStore();
  const { team } = useTeamStore();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  const load = async () => {
    try {
      const res = await chatService.getMessages();
      setMessages(res.data.messages);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (team) load(); }, [team]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on('user_typing', ({ username }) => {
      if (username !== user?.username) {
        setTyping(username);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTyping(''), 2000);
      }
    });
    return () => {
      socket.off('new_message');
      socket.off('user_typing');
    };
  }, [socket]);

  const send = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    try {
      await chatService.send(text);
    } catch { }
  };

  const onType = (v) => {
    setInput(v);
    if (socket && team) socket.emit('typing', { teamId: team._id, username: user?.username });
  };

  const isMe = (msg) => msg.senderId?._id === user?._id || msg.senderId === user?._id;
  const isSystem = (msg) => msg.type !== 'text';

  if (!team) return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-20" style={{ padding: '16px' }}>
        <MessageCircle size={64} className="mb-4 opacity-20" color="var(--color-text)" />
        <p style={{ color: 'var(--color-muted)' }}>Join a team to access chat</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px - 80px)', padding: '0' }}>
        {/* Team balance banner */}
        <div className="flex items-center justify-between px-4 py-2"
          style={{ background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Team Balance</p>
          <p className="text-sm font-bold" style={{ color: '#10b981' }}>{formatCurrency(team.balance)}</p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-2xl" style={{ width: i % 2 === 0 ? '60%' : '70%', alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start' }} />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <MessageCircle size={48} className="mb-3 opacity-20" color="var(--color-text)" />
              <p style={{ color: 'var(--color-muted)' }}>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg, i) => {
                if (isSystem(msg)) {
                  return (
                    <motion.div key={msg._id || i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="text-center my-2">
                      <span className="text-xs px-3 py-1.5 rounded-full inline-block"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                        {msg.message}
                      </span>
                    </motion.div>
                  );
                }
                const me = isMe(msg);
                return (
                  <motion.div key={msg._id || i}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex items-end gap-2 ${me ? 'flex-row-reverse' : ''}`}>
                    {!me && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                        {getInitials(msg.senderName || msg.senderId?.username)}
                      </div>
                    )}
                    <div style={{ maxWidth: '72%' }}>
                      {!me && <p className="text-xs mb-1 ml-1" style={{ color: 'var(--color-muted)' }}>{msg.senderName || msg.senderId?.username}</p>}
                      <div className="px-3 py-2 rounded-2xl"
                        style={{
                          background: me ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.08)',
                          borderRadius: me ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        }}>
                        <p className="text-sm" style={{ color: me ? 'white' : 'var(--color-text)' }}>{msg.message}</p>
                      </div>
                      <p className={`text-xs mt-0.5 ${me ? 'text-right' : ''}`} style={{ color: 'var(--color-muted)' }}>
                        {formatTime(msg.timestamp || msg.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              {typing && (
                <div className="text-xs ml-9" style={{ color: 'var(--color-muted)' }}>
                  {typing} is typing...
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'var(--color-surface)' }}>
          <input
            value={input} onChange={e => onType(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Type a message..."
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '10px 16px', color: 'var(--color-text)', outline: 'none', fontSize: '14px',
            }}
          />
          <motion.button whileTap={{ scale: 0.85 }} onClick={send}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <Send size={16} color="white" />
          </motion.button>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;

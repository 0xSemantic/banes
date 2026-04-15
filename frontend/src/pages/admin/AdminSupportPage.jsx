import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store';
import api from '../../utils/api';
import { Send, XCircle, MessageCircle, UserCheck } from 'lucide-react';
import { PageHeader, Alert } from '../../components/ui';

export default function AdminSupportPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Load sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true);
        const res = await api.get('/chat/admin/sessions');
        const sessionsData = Array.isArray(res.data) ? res.data : [];
        setSessions(sessionsData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load chat sessions');
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, []);

  // WebSocket connection when a session is opened
  useEffect(() => {
    if (!currentSession) return;

    const token = localStorage.getItem('credex_token');
    if (!token) {
      console.error('No authentication token found');
      setError('Authentication required. Please log in again.');
      return;
    }

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/chat/${currentSession.id}?token=${token}`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected for session', currentSession.id);
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_message') {
          setMessages(prev => [...prev, data.message]);
        }
      } catch (err) {
        console.error('Failed to parse message', err);
      }
    };
    
    socket.onerror = (err) => {
      console.error('WebSocket error', err);
      setError('Connection error. Please refresh the page.');
    };
    
    socket.onclose = () => {
      console.log('WebSocket closed for session', currentSession.id);
    };
    
    setWs(socket);
    
    // Load previous messages
    api.get(`/chat/sessions/${currentSession.id}/messages`)
      .then(res => {
        const msgs = Array.isArray(res.data) ? res.data : [];
        setMessages(msgs);
      })
      .catch(err => console.error('Failed to load messages', err));
    
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [currentSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !ws || ws.readyState !== WebSocket.OPEN) {
      if (ws?.readyState !== WebSocket.OPEN) setError('Disconnected. Please refresh the page.');
      return;
    }
    // Add message to local state immediately for instant feedback
    const tempMessage = {
      id: Date.now(),
      sender_id: user.id,
      content: newMessage,
      timestamp: new Date().toISOString(),
      is_read: false
    };
    setMessages(prev => [...prev, tempMessage]);
    ws.send(JSON.stringify({ content: newMessage }));
    setNewMessage('');
  };

  const closeSession = async () => {
    if (!currentSession) return;
    try {
      await api.put(`/chat/sessions/${currentSession.id}/close`);
      setCurrentSession(null);
      const res = await api.get('/chat/admin/sessions');
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const assignSelf = async (sessionId) => {
    try {
      await api.post(`/chat/admin/sessions/${sessionId}/assign`);
      const res = await api.get('/chat/admin/sessions');
      setSessions(Array.isArray(res.data) ? res.data : []);
      if (currentSession?.id === sessionId) {
        setCurrentSession({ ...currentSession, admin_id: user.id });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && sessions.length === 0) {
    return <div className="flex justify-center py-12"><div className="spinner" /></div>;
  }
  if (error) return <Alert type="danger" message={error} />;

  return (
    <div className="space-y-5">
      <PageHeader title="Customer Support" subtitle="Manage customer chats" />
      <div className="flex h-[calc(100vh-200px)]">
        {/* Sidebar */}
        <div className="w-80 border-r border-bank-border bg-bank-surface rounded-l-2xl p-4 overflow-y-auto">
          <h2 className="text-lg font-bold text-bank-light mb-4">Active Chats</h2>
          <div className="space-y-2">
            {sessions.length === 0 && (
              <div className="text-center text-bank-muted py-8">No chat sessions</div>
            )}
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => setCurrentSession(s)}
                className={`p-3 rounded-xl cursor-pointer transition ${
                  currentSession?.id === s.id
                    ? 'bg-primary-600/20 border-l-4 border-primary-600'
                    : 'hover:bg-bank-dark'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium text-bank-light">
                    {s.user?.full_name || `User ${s.user_id?.slice(0,8)}`}
                  </p>
                  {!s.admin_id && s.status === 'open' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); assignSelf(s.id); }}
                      className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1"
                    >
                      <UserCheck size={12} /> Take
                    </button>
                  )}
                </div>
                <p className="text-xs text-bank-muted mt-1">
                  {s.user?.email || s.user_id}
                </p>
                <p className="text-xs text-bank-muted mt-1">
                  {s.status === 'open' ? '🟢 Open' : '🔒 Closed'}
                </p>
                <p className="text-xs text-bank-muted">
                  {new Date(s.updated_at).toLocaleString()}
                </p>
                {s.admin_id && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Assigned to admin #{s.admin_id}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-bank-dark rounded-r-2xl">
          {currentSession ? (
            <>
              <div className="border-b border-bank-border p-4 bg-bank-surface flex justify-between items-center rounded-tr-2xl">
                <div>
                  <div className="text-bank-light font-semibold">
                    Chat with {currentSession.user?.full_name || `User ${currentSession.user_id?.slice(0,8)}`}
                  </div>
                  <div className="text-xs text-bank-muted">
                    {currentSession.user?.email || currentSession.user_id} · Session #{currentSession.id}
                  </div>
                </div>
                {currentSession.status === 'open' && (
                  <button
                    onClick={closeSession}
                    className="text-red-400 flex items-center gap-1 hover:text-red-300 transition"
                  >
                    <XCircle size={18} /> Close Session
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_id === user.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl p-3 ${
                        msg.sender_id === user.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-bank-surface text-bank-light shadow'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {currentSession.status === 'open' && (
                <div className="border-t border-bank-border p-4 bg-bank-surface flex gap-2 rounded-br-2xl">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendMessage()}
                    className="flex-1 bg-bank-dark border border-bank-border rounded-xl px-4 py-2 text-bank-light focus:outline-none focus:border-primary-600"
                    placeholder="Type your reply..."
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-primary-600 text-white px-4 rounded-xl hover:bg-primary-700 transition"
                  >
                    <Send size={20} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-bank-muted">
              <MessageCircle size={48} className="mb-3 opacity-40" />
              <p>Select a chat session to start supporting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
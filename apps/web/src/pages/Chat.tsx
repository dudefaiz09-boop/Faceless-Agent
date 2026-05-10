import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { motion } from 'motion/react';
import { 
  Send, Search, User as UserIcon, MessageSquare, 
  MoreVertical, Phone, Video, Smile, Paperclip,
  CheckCheck, Users
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Conversation {
  id: string;
  participants: string[];
  type: 'direct' | 'group';
  name?: string;
  lastMessage?: string;
  updatedAt: { toDate: () => Date } | string | null;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: { toDate: () => Date } | string | null;
  readBy: string[];
}

export const ChatPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'conversations'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Conversation))
        .filter((c: Conversation) => c.participants.includes(user.uid));
      setConversations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConv) return;

    const q = query(
      collection(db, 'conversations', selectedConv.id, 'messages'),
      orderBy('sentAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });

    return () => unsubscribe();
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;

    try {
      const recipientId = selectedConv.participants.find(p => p !== user?.uid);
      await apiFetch('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          recipientId,
          text: newMessage,
          type: selectedConv.type,
          conversationId: selectedConv.id
        })
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getChatName = (conv: Conversation) => {
    if (conv.type === 'group') return conv.name || 'Group Chat';
    // For direct chat, we'd ideally fetch the other participant's name
    // For now, using a placeholder or just showing their ID if we don't have user list
    return "Direct Chat"; 
  };

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Sidebar: Conversation List */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Search chats..."
              className="w-full bg-slate-100 border-none pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-slate-400 text-sm">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-200 shadow-sm">
                <MessageSquare size={24} />
              </div>
              <p className="text-sm font-medium text-slate-400">No conversations yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedConv(conv);
                    setMessages([]);
                  }}
                  className={cn(
                    "w-full p-6 text-left hover:bg-white transition-all flex gap-4 items-center group",
                    selectedConv?.id === conv.id ? "bg-white border-l-4 border-blue-600 pl-5" : "pl-6"
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                    {conv.type === 'group' ? <Users size={20} /> : <UserIcon size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {getChatName(conv)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">12:45 PM</span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{conv.lastMessage || 'Start a conversation'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                   {selectedConv.type === 'group' ? <Users size={18} /> : <UserIcon size={18} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">{getChatName(selectedConv)}</h3>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><Phone size={20}/></button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><Video size={20}/></button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><MoreVertical size={20}/></button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
                  >
                    {!isMe && (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-4">
                        {msg.senderName}
                      </span>
                    )}
                    <div className={cn(
                      "max-w-[80%] px-5 py-3 rounded-2xl text-sm font-medium shadow-sm",
                      isMe 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                    )}>
                      {msg.text}
                    </div>
                    <div className={cn("flex items-center gap-1.5 mt-1 px-1", isMe ? "justify-end" : "justify-start")}>
                      <span className="text-[9px] font-bold text-slate-400">12:46 PM</span>
                      {isMe && <CheckCheck size={12} className="text-blue-500" />}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-100 flex items-center gap-4 bg-white">
              <button type="button" className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                <Paperclip size={20} />
              </button>
              <div className="flex-1 relative">
                <input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm font-medium"
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                  <Smile size={20} />
                </button>
              </div>
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:scale-95 active:scale-90"
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-6">
             <div className="w-24 h-24 bg-blue-50 rounded-[40px] flex items-center justify-center text-blue-600/30">
               <MessageSquare size={48} />
             </div>
             <div>
               <h3 className="text-2xl font-bold text-slate-900">Your Conversations</h3>
               <p className="text-slate-400 mt-2 max-w-xs mx-auto">Select a chat from the sidebar to start messaging your teachers or peers.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

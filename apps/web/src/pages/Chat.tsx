import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';
import { motion } from 'motion/react';
import {
  Send,
  MessageSquare,
  MoreVertical,
  Phone,
  Video,
  Smile,
  Paperclip,
  CheckCheck,
  Users,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { collectionPath, useDocuments } from '../lib/documents';
import { EmptyState } from '../components/saas/EmptyState';
import { SearchBar } from '../components/saas/SearchBar';
import { useToast } from '../components/saas/ToastProvider';

interface Conversation {
  id: string;
  participants: string[];
  type: 'direct' | 'group';
  name?: string;
  lastMessage?: string;
  lastMessageAt?: { toDate: () => Date } | string | null;
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

interface UserProfile {
  id: string;
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  roles?: string[];
  status?: 'active' | 'inactive';
  classId?: string;
  classIds?: string[];
  linkedStudentIds?: string[];
}

/**
 * Determines if the current user can message a target user based on role eligibility rules.
 */
function canMessageUser(
  currentRole: string | null,
  currentClassIds: string[],
  currentLinkedStudentIds: string[],
  targetProfile: UserProfile
): { allowed: boolean; reason?: string } {
  if (!currentRole) return { allowed: false };

  // Safety defaults for potential undefined context values
  const safeClassIds = currentClassIds || [];
  const safeLinkedIds = currentLinkedStudentIds || [];

  const targetRole = targetProfile.role || targetProfile.roles?.[0] || '';
  const targetClassIds =
    targetProfile.classIds || (targetProfile.classId ? [targetProfile.classId] : []);

  // Admin and Principal can message anyone
  if (currentRole === 'admin' || currentRole === 'principal') {
    return { allowed: true, reason: 'Admin/Principal access' };
  }

  // Student eligibility
  if (currentRole === 'student') {
    // Can message teachers in their class
    if (targetRole === 'teacher') {
      const hasSharedClass = targetClassIds.some((classId) => safeClassIds.includes(classId));
      if (hasSharedClass) return { allowed: true, reason: 'Class Teacher' };
    }
    // Can message principal
    if (targetRole === 'principal') return { allowed: true, reason: 'Principal' };
    // Can message admin/helpdesk
    if (targetRole === 'admin') return { allowed: true, reason: 'Admin Support' };
    return { allowed: false };
  }

  // Parent eligibility
  if (currentRole === 'parent') {
    // Can message their linked child's teachers
    if (targetRole === 'teacher') {
      // Check if teacher teaches any of the linked students' classes
      const hasLinkedStudentClass = targetClassIds.some((classId) =>
        safeClassIds.includes(classId)
      );
      if (hasLinkedStudentClass) return { allowed: true, reason: "Child's Teacher" };
    }
    // Can message principal
    if (targetRole === 'principal') return { allowed: true, reason: 'Principal' };
    // Can message admin/helpdesk
    if (targetRole === 'admin') return { allowed: true, reason: 'Admin Support' };
    return { allowed: false };
  }

  // Teacher eligibility
  if (currentRole === 'teacher') {
    // Can message students in assigned classes
    if (targetRole === 'student') {
      const hasSharedClass = targetClassIds.some((classId) => safeClassIds.includes(classId));
      if (hasSharedClass) return { allowed: true, reason: 'Your Student' };
    }
    // Can message parents of assigned students
    if (targetRole === 'parent') {
      const hasLinkedStudent = (targetProfile.linkedStudentIds || []).some((studentId) =>
        safeLinkedIds.includes(studentId)
      );
      if (hasLinkedStudent) return { allowed: true, reason: "Student's Parent" };
    }
    // Can message principal/admin
    if (targetRole === 'principal' || targetRole === 'admin') {
      return { allowed: true, reason: 'Administration' };
    }
    // Can message other teachers
    if (targetRole === 'teacher') return { allowed: true, reason: 'Colleague' };
    return { allowed: false };
  }

  // Librarian eligibility
  if (currentRole === 'librarian') {
    // Can message admin/principal
    if (targetRole === 'admin' || targetRole === 'principal') {
      return { allowed: true, reason: 'Administration' };
    }
    // Can message students/parents for library-related matters
    if (targetRole === 'student' || targetRole === 'parent') {
      return { allowed: true, reason: 'Library Services' };
    }
    return { allowed: false };
  }

  // Accountant eligibility
  if (currentRole === 'accountant') {
    // Can message admin/principal
    if (targetRole === 'admin' || targetRole === 'principal') {
      return { allowed: true, reason: 'Administration' };
    }
    // Can message students/parents for fee-related matters
    if (targetRole === 'student' || targetRole === 'parent') {
      return { allowed: true, reason: 'Fee Management' };
    }
    return { allowed: false };
  }

  // Default: deny
  return { allowed: false };
}

export const ChatPage = () => {
  const { user, role, classIds, linkedStudentIds } = useAuth();
  const { toast } = useToast();
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [showContacts, setShowContacts] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversationDocuments, loading } = useDocuments<Conversation>('conversations', {
    enabled: !!user,
    limit: 50,
    order: { field: 'updatedAt', ascending: false },
  });
  const conversations = conversationDocuments.filter((conversation) =>
    conversation.participants?.includes(user?.uid || '')
  );

  const { data: userProfiles } = useDocuments<UserProfile>('users', {
    enabled: !!user,
    limit: 200,
    order: { field: 'displayName', ascending: true },
    realtime: true,
  });
  const userMap = useMemo(() => {
    return new Map(userProfiles.map((profile) => [profile.uid || profile.id, profile]));
  }, [userProfiles]);

  // Filter contacts by eligibility and search query
  const contactOptions = useMemo(() => {
    return userProfiles.filter((profile) => {
      const uid = profile.uid || profile.id;
      if (!uid || uid === user?.uid || profile.status === 'inactive') return false;

      // Check eligibility
      const eligibility = canMessageUser(role, classIds, linkedStudentIds, profile);
      if (!eligibility.allowed) return false;

      // Apply search filter
      const query = contactSearch.trim().toLowerCase();
      if (!query) return true;
      return (
        (profile.displayName || '').toLowerCase().includes(query) ||
        (profile.email || '').toLowerCase().includes(query) ||
        (profile.role || profile.roles?.[0] || '').toLowerCase().includes(query)
      );
    });
  }, [userProfiles, user?.uid, role, classIds, linkedStudentIds, contactSearch]);
  const filteredConversations = conversations.filter((conversation) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      getChatName(conversation).toLowerCase().includes(query) ||
      (conversation.lastMessage || '').toLowerCase().includes(query)
    );
  });

  const { data: messages } = useDocuments<Message>(
    selectedConv ? collectionPath('conversations', selectedConv.id, 'messages') : '',
    {
      enabled: !!selectedConv,
      limit: 100,
      order: { field: 'sentAt', ascending: true },
    }
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConversationId = selectedConv?.id;

  useEffect(() => {
    if (!selectedConversationId) return;
    void apiClient
      .request(`/api/chat/rooms/${selectedConversationId}/read`, { method: 'PATCH' })
      .catch(() => {
        // Read receipts should not block the message view.
      });
  }, [selectedConversationId]);

  const startConversation = async (profile: UserProfile) => {
    const recipientId = profile.uid || profile.id;
    if (!recipientId) return;

    setIsStartingChat(true);
    try {
      const conversation = await apiClient.request<Conversation>('/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ type: 'direct', recipientId }),
      });
      setSelectedConv(conversation);
      setShowContacts(false);
      setContactSearch('');
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Could not start chat',
        description: error instanceof Error ? error.message : 'Please try again in a moment.',
      });
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;

    setIsSending(true);
    try {
      const recipientId = selectedConv.participants.find((p) => p !== user?.uid);
      await apiClient.request('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          recipientId,
          text: newMessage,
          type: selectedConv.type,
          conversationId: selectedConv.id,
        }),
      });
      setNewMessage('');
    } catch {
      toast({
        tone: 'error',
        title: 'Message not sent',
        description: 'Please check your connection and try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  function getChatName(conv: Conversation) {
    if (conv.type === 'group') return conv.name || 'Group Chat';
    const peerId = conv.participants.find((participantId) => participantId !== user?.uid);
    const peer = peerId ? userMap.get(peerId) : null;
    return peer?.displayName || peer?.email || 'Direct Chat';
  }

  function getInitials(value: string) {
    return (
      value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'EC'
    );
  }

  function getRoleLabel(profile: UserProfile) {
    return profile.role || profile.roles?.[0] || 'member';
  }

  function getContactReason(profile: UserProfile) {
    const eligibility = canMessageUser(role, classIds, linkedStudentIds, profile);
    return eligibility.reason || '';
  }

  const formatTime = (value: Conversation['updatedAt'] | Message['sentAt']) => {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value.toDate();
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
      {/* Sidebar: Conversation List */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
        <div className="p-6 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Messages</h2>
            <button
              type="button"
              onClick={() => setShowContacts((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 dark:shadow-blue-950/40"
              title={showContacts ? 'Close contacts' : 'Start chat'}
            >
              {showContacts ? <X size={18} /> : <Plus size={18} />}
            </button>
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search chats..." />
        </div>

        {showContacts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <SearchBar
              value={contactSearch}
              onChange={setContactSearch}
              placeholder="Find people..."
            />
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {contactOptions.slice(0, 12).map((profile) => {
                const name = profile.displayName || profile.email || 'EduConnect user';
                return (
                  <button
                    key={profile.uid || profile.id}
                    type="button"
                    disabled={isStartingChat}
                    onClick={() => void startConversation(profile)}
                    className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-900"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      {getInitials(name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-900 dark:text-white">
                        {name}
                      </span>
                      <span className="block truncate text-xs text-slate-500 capitalize dark:text-slate-400">
                        {getContactReason(profile)} • {getRoleLabel(profile)}
                      </span>
                      <span className="block truncate text-xs font-bold uppercase tracking-widest text-slate-400">
                        {getRoleLabel(profile)}
                      </span>
                    </span>
                  </button>
                );
              })}
              {contactOptions.length === 0 && (
                <p className="py-4 text-center text-sm font-bold text-slate-400">
                  No matching people found.
                </p>
              )}
            </div>
          </motion.div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-slate-400 text-sm">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={MessageSquare}
                title="No conversations found"
                description="Try searching by group name or message preview."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={cn(
                    'w-full p-6 text-left hover:bg-white transition-all flex gap-4 items-center group dark:hover:bg-slate-900',
                    selectedConv?.id === conv.id
                      ? 'bg-white border-l-4 border-blue-600 pl-5 dark:bg-slate-900'
                      : 'pl-6'
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                    {conv.type === 'group' ? <Users size={20} /> : getInitials(getChatName(conv))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors dark:text-white">
                        {getChatName(conv)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        {formatTime(conv.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {conv.lastMessage || 'Start a conversation'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                  {selectedConv.type === 'group' ? (
                    <Users size={18} />
                  ) : (
                    getInitials(getChatName(selectedConv))
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight dark:text-white">
                    {getChatName(selectedConv)}
                  </h3>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                  <Phone size={20} />
                </button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                  <Video size={20} />
                </button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/40">
              {messages.length === 0 && (
                <EmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="Send the first message to start the conversation."
                />
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id}
                    className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
                  >
                    {!isMe && (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-4">
                        {msg.senderName}
                      </span>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] px-5 py-3 rounded-2xl text-sm font-medium shadow-sm',
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                      )}
                    >
                      {msg.text}
                    </div>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 mt-1 px-1',
                        isMe ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <span className="text-[9px] font-bold text-slate-400">
                        {formatTime(msg.sentAt)}
                      </span>
                      {isMe && <CheckCheck size={12} className="text-blue-500" />}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSendMessage}
              className="p-6 border-t border-slate-100 flex items-center gap-4 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <button
                type="button"
                className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <Paperclip size={20} />
              </button>
              <div className="flex-1 relative">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm font-medium dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Smile size={20} />
                </button>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
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
              <p className="text-slate-400 mt-2 max-w-xs mx-auto">
                Select a chat from the sidebar to start messaging your teachers or peers.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

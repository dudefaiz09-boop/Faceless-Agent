import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiClient } from '../lib/api-client';
import { collectionPath, useDocuments } from '../lib/documents';
import { useAuth } from '../contexts/AuthContext';
import { colors, formatDate } from '../theme';
import {
  Card,
  EmptyState,
  ErrorState,
  ModuleHeader,
  Pill,
  SearchInput,
} from '../components/ModuleUi';

type Conversation = {
  id: string;
  participants: string[];
  type: 'direct' | 'group';
  name?: string;
  lastMessage?: string;
  updatedAt?: string | null;
  lastMessageAt?: string | null;
};

type Message = {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  sentAt?: string | null;
  readBy?: string[];
};

type UserProfile = {
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
};

function canMessageUser(
  currentRole: string | null,
  currentClassIds: string[],
  currentLinkedStudentIds: string[],
  targetProfile: UserProfile
) {
  if (!currentRole) return false;
  const targetRole = targetProfile.role || targetProfile.roles?.[0] || '';
  const targetClassIds =
    targetProfile.classIds || (targetProfile.classId ? [targetProfile.classId] : []);

  if (currentRole === 'admin' || currentRole === 'principal') return true;
  if (currentRole === 'student') {
    return (
      (targetRole === 'teacher' &&
        targetClassIds.some((classId) => currentClassIds.includes(classId))) ||
      targetRole === 'principal' ||
      targetRole === 'admin'
    );
  }
  if (currentRole === 'parent') {
    return targetRole === 'principal' || targetRole === 'admin' || targetRole === 'teacher';
  }
  if (currentRole === 'teacher') {
    if (targetRole === 'student')
      return targetClassIds.some((classId) => currentClassIds.includes(classId));
    if (targetRole === 'parent') {
      return (targetProfile.linkedStudentIds || []).some((studentId) =>
        currentLinkedStudentIds.includes(studentId)
      );
    }
    return ['teacher', 'principal', 'admin'].includes(targetRole);
  }
  if (currentRole === 'librarian')
    return ['admin', 'principal', 'student', 'parent'].includes(targetRole);
  if (currentRole === 'accountant')
    return ['admin', 'principal', 'student', 'parent'].includes(targetRole);
  return false;
}

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'EC'
  );
}

export function ChatScreen() {
  const { user, role, classIds, linkedStudentIds, schoolId } = useAuth();
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [contactMode, setContactMode] = useState(false);
  const [localError, setLocalError] = useState('');

  const conversationsQuery = useDocuments<Conversation>('conversations', {
    enabled: Boolean(user),
    order: { field: 'updatedAt', ascending: false },
    realtime: true,
  });
  const usersQuery = useDocuments<UserProfile>('users', {
    enabled: Boolean(user),
    order: { field: 'displayName', ascending: true },
    realtime: true,
    schoolId,
  });
  const messagesQuery = useDocuments<Message>(
    selected ? collectionPath('conversations', selected.id, 'messages') : '',
    {
      enabled: Boolean(selected),
      order: { field: 'sentAt', ascending: true },
      realtime: true,
    }
  );

  const userMap = useMemo(() => {
    return new Map(usersQuery.data.map((profile) => [profile.uid || profile.id, profile]));
  }, [usersQuery.data]);

  function getChatName(conversation: Conversation) {
    if (conversation.type === 'group') return conversation.name || 'Group Chat';
    const peerId = conversation.participants.find((participantId) => participantId !== user?.uid);
    const peer = peerId ? userMap.get(peerId) : null;
    return peer?.displayName || peer?.email || 'Direct Chat';
  }

  const conversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return conversationsQuery.data
      .filter((conversation) => conversation.participants?.includes(user?.uid || ''))
      .filter((conversation) => {
        if (!normalized) return true;
        const peerId = conversation.participants.find(
          (participantId) => participantId !== user?.uid
        );
        const peer = peerId ? userMap.get(peerId) : null;
        const chatName =
          conversation.type === 'group'
            ? conversation.name || 'Group Chat'
            : peer?.displayName || peer?.email || 'Direct Chat';
        return `${chatName} ${conversation.lastMessage || ''}`.toLowerCase().includes(normalized);
      });
  }, [conversationsQuery.data, query, user?.uid, userMap]);

  const contacts = useMemo(() => {
    return usersQuery.data.filter((profile) => {
      const uid = profile.uid || profile.id;
      if (!uid || uid === user?.uid || profile.status === 'inactive') return false;
      return canMessageUser(role, classIds, linkedStudentIds, profile);
    });
  }, [classIds, linkedStudentIds, role, user?.uid, usersQuery.data]);

  const startConversation = async (profile: UserProfile) => {
    setLocalError('');
    try {
      const recipientId = profile.uid || profile.id;
      const conversation = await apiClient.request<Conversation>('/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ type: 'direct', recipientId }),
      });
      setSelected(conversation);
      setContactMode(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Could not start chat.');
    }
  };

  const sendMessage = async () => {
    if (!selected || !message.trim()) return;
    setSending(true);
    setLocalError('');
    try {
      const recipientId = selected.participants.find(
        (participantId) => participantId !== user?.uid
      );
      await apiClient.request('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          recipientId,
          text: message.trim(),
          type: selected.type,
          conversationId: selected.id,
        }),
      });
      setMessage('');
      await messagesQuery.reload();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Message not sent.');
    } finally {
      setSending(false);
    }
  };

  if (conversationsQuery.error) {
    return (
      <View style={styles.flex}>
        <ModuleHeader title="Chat" subtitle="Role-aware direct and group conversations." />
        <ErrorState
          message={conversationsQuery.error.message}
          onRetry={() => void conversationsQuery.reload()}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ModuleHeader title="Chat" subtitle="Role-aware direct and group conversations.">
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => setContactMode((value) => !value)}
        >
          <Text style={styles.newButtonText}>{contactMode ? 'Chats' : 'New'}</Text>
        </TouchableOpacity>
      </ModuleHeader>

      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}

      {contactMode ? (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.uid || item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No contacts available"
              body="No eligible people were found for your role."
            />
          }
          refreshControl={
            <RefreshControl
              tintColor={colors.ai}
              refreshing={usersQuery.loading}
              onRefresh={() => void usersQuery.reload()}
            />
          }
          renderItem={({ item }) => {
            const name = item.displayName || item.email || 'EduConnect user';
            return (
              <TouchableOpacity onPress={() => void startConversation(item)}>
                <Card>
                  <Pill label={item.role || item.roles?.[0] || 'member'} />
                  <Text style={styles.cardTitle}>{name}</Text>
                  <Text style={styles.cardContent}>{item.email || 'No email on profile'}</Text>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      ) : selected ? (
        <View style={styles.chatPanel}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backButton}>
            <Text style={styles.backText}>Back to conversations</Text>
          </TouchableOpacity>
          <Card style={styles.chatHeader}>
            <Text style={styles.avatar}>{initials(getChatName(selected))}</Text>
            <View style={styles.chatHeaderText}>
              <Text style={styles.cardTitle}>{getChatName(selected)}</Text>
              <Text style={styles.cardContent}>{selected.type}</Text>
            </View>
          </Card>
          <FlatList
            data={messagesQuery.data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContent}
            ListEmptyComponent={
              <EmptyState
                title="No messages yet"
                body="Send the first message to start the conversation."
              />
            }
            renderItem={({ item }) => {
              const mine = item.senderId === user?.uid;
              return (
                <View
                  style={[styles.messageBubble, mine ? styles.messageMine : styles.messageOther]}
                >
                  {!mine && (
                    <Text style={styles.senderName}>{item.senderName || 'EduConnect'}</Text>
                  )}
                  <Text style={[styles.messageText, mine && styles.messageMineText]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.messageTime, mine && styles.messageMineText]}>
                    {formatDate(item.sentAt)}
                  </Text>
                </View>
              );
            }}
          />
          <View style={styles.composer}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message"
              placeholderTextColor={colors.muted}
              style={styles.composerInput}
            />
            <TouchableOpacity
              disabled={sending || !message.trim()}
              onPress={sendMessage}
              style={styles.sendButton}
            >
              <Text style={styles.sendButtonText}>{sending ? '...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <SearchInput value={query} onChangeText={setQuery} placeholder="Search chats" />
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              conversationsQuery.loading ? null : (
                <EmptyState
                  title="No conversations found"
                  body="Start a conversation with an eligible contact."
                />
              )
            }
            refreshControl={
              <RefreshControl
                tintColor={colors.ai}
                refreshing={conversationsQuery.loading}
                onRefresh={() => void conversationsQuery.reload()}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setSelected(item)}>
                <Card>
                  <Pill label={item.type} />
                  <Text style={styles.cardTitle}>{getChatName(item)}</Text>
                  <Text style={styles.cardContent}>
                    {item.lastMessage || 'Start a conversation'}
                  </Text>
                  <Text style={styles.cardDate}>
                    {formatDate(item.updatedAt || item.lastMessageAt)}
                  </Text>
                </Card>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    color: colors.ai,
    fontSize: 16,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    color: '#8bb7ff',
    fontSize: 13,
    fontWeight: '900',
  },
  cardContent: {
    color: colors.whiteSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  cardDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  chatHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  chatHeaderText: {
    flex: 1,
  },
  chatPanel: {
    flex: 1,
  },
  composer: {
    alignItems: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  composerInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  messageBubble: {
    borderRadius: 18,
    marginBottom: 10,
    maxWidth: '82%',
    padding: 12,
  },
  messageMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
  },
  messageMineText: {
    color: colors.text,
  },
  messageOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    color: colors.whiteSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 6,
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  newButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  newButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sendButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  senderName: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
});

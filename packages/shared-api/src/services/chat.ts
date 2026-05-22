import { ApiClient } from '../client/base.js';

export type ChatConversationType = 'direct' | 'group';

export type ChatConversation = {
  id: string;
  participants: string[];
  type: ChatConversationType;
  name?: string | null;
  lastMessage?: string;
  updatedAt?: string | null;
  lastMessageAt?: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId?: string;
  senderId: string;
  senderName?: string;
  text: string;
  sentAt?: string | null;
  readBy?: string[];
  status?: string;
};

export type ChatContact = {
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

export type CreateConversationInput =
  | {
      type?: 'direct';
      recipientId: string;
    }
  | {
      type: 'group';
      name: string;
      participantIds: string[];
    };

export type SendChatMessageInput = {
  conversationId?: string;
  recipientId?: string;
  text: string;
};

export class ChatService {
  constructor(private client: ApiClient) {}

  conversations() {
    return this.client.get<ChatConversation[]>('/chat/rooms');
  }

  contacts() {
    return this.client.get<ChatContact[]>('/chat/contacts');
  }

  messages(conversationId: string) {
    return this.client.get<ChatMessage[]>(`/chat/rooms/${conversationId}/messages`);
  }

  createConversation(data: CreateConversationInput) {
    return this.client.post<ChatConversation>('/chat/conversations', data, { retry: 0 });
  }

  sendMessage(data: SendChatMessageInput) {
    return this.client.post<ChatMessage>('/chat/send', data, { retry: 0 });
  }

  markRead(conversationId: string) {
    return this.client.request<{ success: boolean; count: number }>(
      `/chat/rooms/${conversationId}/read`,
      { method: 'PATCH', retry: 0 }
    );
  }
}

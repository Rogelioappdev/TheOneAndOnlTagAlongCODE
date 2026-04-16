import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isRead: boolean;
}

export interface Chat {
  id: string;
  type: 'single' | 'group';
  participants: ChatParticipant[];
  messages: Message[];
  lastMessage?: Message;
  createdAt: number;
  updatedAt: number;
  // For group chats
  groupName?: string;
  groupImage?: string;
  // Blocked users
  blockedBy?: string[]; // User IDs who blocked this chat/person
}

export interface ChatParticipant {
  id: string;
  name: string;
  age: number;
  image: string;
  country: string;
  city: string;
}

interface MessagesStore {
  chats: Chat[];
  activeChat: string | null;
  blockedUsers: string[]; // Global blocked user IDs

  // Actions
  startChat: (participant: ChatParticipant) => string; // Returns chat id
  createGroupChat: (participants: ChatParticipant[], groupName: string) => string;
  sendMessage: (chatId: string, text: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  setActiveChat: (chatId: string | null) => void;
  getChatById: (chatId: string) => Chat | undefined;
  getChatByParticipantId: (participantId: string) => Chat | undefined;
  markAsRead: (chatId: string) => void;
  getUnreadCount: () => number;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;
  deleteChat: (chatId: string) => void;
  leaveGroupChat: (chatId: string) => void;
  updateGroupImage: (chatId: string, image: string) => void;
  updateGroupName: (chatId: string, name: string) => void;
  removeParticipant: (chatId: string, participantId: string) => void;
  clearAll: () => void;
}

// Current user for demo purposes
const CURRENT_USER: ChatParticipant = {
  id: 'current-user',
  name: 'You',
  age: 25,
  image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
  country: 'USA',
  city: 'New York',
};

const useMessagesStore = create<MessagesStore>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChat: null,
      blockedUsers: [],

      startChat: (participant) => {
        // Check if chat already exists with this participant
        const existingChat = get().chats.find(
          chat => chat.type === 'single' &&
          chat.participants.some(p => p.id === participant.id)
        );

        if (existingChat) {
          set({ activeChat: existingChat.id });
          return existingChat.id;
        }

        // Create new chat
        const newChat: Chat = {
          id: `chat-${Date.now()}`,
          type: 'single',
          participants: [participant, CURRENT_USER],
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set({
          chats: [...get().chats, newChat],
          activeChat: newChat.id,
        });

        return newChat.id;
      },

      createGroupChat: (participants, groupName) => {
        const newChat: Chat = {
          id: `group-${Date.now()}`,
          type: 'group',
          participants: [...participants, CURRENT_USER],
          messages: [],
          groupName,
          groupImage: participants[0]?.image,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set({
          chats: [...get().chats, newChat],
          activeChat: newChat.id,
        });

        return newChat.id;
      },

      sendMessage: (chatId, text) => {
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          senderId: CURRENT_USER.id,
          text,
          timestamp: Date.now(),
          isRead: true,
        };

        set({
          chats: get().chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, newMessage],
                  lastMessage: newMessage,
                  updatedAt: Date.now(),
                }
              : chat
          ),
        });
        // Real replies come from Supabase realtime — no simulation needed.
      },

      setActiveChat: (chatId) => {
        set({ activeChat: chatId });
        if (chatId) {
          get().markAsRead(chatId);
        }
      },

      getChatById: (chatId) => {
        return get().chats.find(chat => chat.id === chatId);
      },

      getChatByParticipantId: (participantId) => {
        return get().chats.find(
          chat => chat.type === 'single' &&
          chat.participants.some(p => p.id === participantId)
        );
      },

      markAsRead: (chatId) => {
        set({
          chats: get().chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map(msg => ({ ...msg, isRead: true })),
                }
              : chat
          ),
        });
      },

      getUnreadCount: () => {
        return get().chats.reduce((count, chat) => {
          const unreadMessages = chat.messages.filter(
            msg => !msg.isRead && msg.senderId !== CURRENT_USER.id
          );
          return count + unreadMessages.length;
        }, 0);
      },

      deleteMessage: (chatId, messageId) => {
        set({
          chats: get().chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.filter(msg => msg.id !== messageId),
                  lastMessage: chat.messages.filter(msg => msg.id !== messageId).slice(-1)[0],
                  updatedAt: Date.now(),
                }
              : chat
          ),
        });
      },

      blockUser: (userId) => {
        const currentBlocked = get().blockedUsers;
        if (!currentBlocked.includes(userId)) {
          set({ blockedUsers: [...currentBlocked, userId] });
        }
      },

      unblockUser: (userId) => {
        set({
          blockedUsers: get().blockedUsers.filter(id => id !== userId),
        });
      },

      isUserBlocked: (userId) => {
        return get().blockedUsers.includes(userId);
      },

      deleteChat: (chatId) => {
        set({
          chats: get().chats.filter(chat => chat.id !== chatId),
          activeChat: get().activeChat === chatId ? null : get().activeChat,
        });
      },

      leaveGroupChat: (chatId) => {
        const chat = get().chats.find(c => c.id === chatId);
        if (!chat || chat.type !== 'group') return;

        // Remove current user from participants
        const updatedParticipants = chat.participants.filter(p => p.id !== CURRENT_USER.id);

        if (updatedParticipants.length === 0) {
          // Delete chat if no participants left
          get().deleteChat(chatId);
        } else {
          set({
            chats: get().chats.filter(c => c.id !== chatId),
            activeChat: get().activeChat === chatId ? null : get().activeChat,
          });
        }
      },

      updateGroupImage: (chatId, image) => {
        set({
          chats: get().chats.map(chat =>
            chat.id === chatId && chat.type === 'group'
              ? { ...chat, groupImage: image, updatedAt: Date.now() }
              : chat
          ),
        });
      },

      updateGroupName: (chatId, name) => {
        set({
          chats: get().chats.map(chat =>
            chat.id === chatId && chat.type === 'group'
              ? { ...chat, groupName: name, updatedAt: Date.now() }
              : chat
          ),
        });
      },

      removeParticipant: (chatId, participantId) => {
        set({
          chats: get().chats.map(chat =>
            chat.id === chatId && chat.type === 'group'
              ? {
                  ...chat,
                  participants: chat.participants.filter(p => p.id !== participantId),
                  updatedAt: Date.now(),
                }
              : chat
          ),
        });
      },

      clearAll: () => {
        set({ chats: [], activeChat: null, blockedUsers: [] });
      },
    }),
    {
      name: "messages-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useMessagesStore;
export { CURRENT_USER };
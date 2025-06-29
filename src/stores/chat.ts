import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Chat {
  id: number;
  project_id?: number;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
  model_config: Record<string, any>;
}

interface ChatStore {
  chats: Chat[];
  currentChat: Chat | null;
  loading: boolean;
  generating: boolean;
  
  // Actions
  fetchChats: (projectId?: number) => Promise<void>;
  createChat: (data: { project_id?: number; title?: string; model_config?: Record<string, any> }) => Promise<Chat>;
  updateChat: (id: number, data: Partial<Chat>) => Promise<void>;
  deleteChat: (id: number) => Promise<void>;
  renameChat: (id: number, title: string) => Promise<void>;
  setCurrentChat: (chat: Chat | null) => void;
  
  // Message operations
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  generateResponse: (prompt: string, projectSlug?: string) => Promise<void>;
  updateLastMessage: (content: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  currentChat: null,
  loading: false,
  generating: false,

  fetchChats: async (projectId) => {
    set({ loading: true });
    try {
      const params = projectId ? { project_id: projectId } : {};
      const response = await axios.get('/api/chats', { params });
      set({ chats: response.data, loading: false });
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      toast.error('Failed to load chats');
      set({ loading: false });
    }
  },

  createChat: async (data) => {
    try {
      const response = await axios.post('/api/chats', data);
      const newChat = response.data;
      
      set((state) => ({
        chats: [newChat, ...state.chats]
      }));
      
      return newChat;
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat');
      throw error;
    }
  },

  updateChat: async (id, data) => {
    try {
      const response = await axios.put(`/api/chats/${id}`, data);
      const updatedChat = response.data;
      
      set((state) => ({
        chats: state.chats.map((c) => c.id === id ? updatedChat : c),
        currentChat: state.currentChat?.id === id ? updatedChat : state.currentChat
      }));
    } catch (error) {
      console.error('Failed to update chat:', error);
      toast.error('Failed to update chat');
      throw error;
    }
  },

  deleteChat: async (id) => {
    try {
      await axios.delete(`/api/chats/${id}`);
      
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== id),
        currentChat: state.currentChat?.id === id ? null : state.currentChat
      }));
      
      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
      throw error;
    }
  },

  renameChat: async (id, title) => {
    try {
      const response = await axios.post('/api/chats/rename', { id, title });
      const updatedChat = response.data;
      
      set((state) => ({
        chats: state.chats.map((c) => c.id === id ? updatedChat : c),
        currentChat: state.currentChat?.id === id ? updatedChat : state.currentChat
      }));
      
      toast.success('Chat renamed successfully');
    } catch (error) {
      console.error('Failed to rename chat:', error);
      toast.error('Failed to rename chat');
      throw error;
    }
  },

  setCurrentChat: (chat) => {
    set({ currentChat: chat });
  },

  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    set((state) => ({
      currentChat: state.currentChat ? {
        ...state.currentChat,
        messages: [...state.currentChat.messages, newMessage]
      } : null
    }));
  },

  generateResponse: async (prompt, projectSlug) => {
    const { currentChat, addMessage, updateChat } = get();
    
    if (!currentChat) return;
    
    set({ generating: true });
    
    // Add user message
    addMessage({ role: 'user', content: prompt });
    
    try {
      // Process secrets if project is specified
      let processedPrompt = prompt;
      if (projectSlug) {
        try {
          const secretResponse = await axios.post('/api/secrets/inject', {
            text: prompt,
            project_slug: projectSlug
          });
          processedPrompt = secretResponse.data.processed;
        } catch (error) {
          console.warn('Secret injection failed:', error);
        }
      }
      
      // Generate AI response
      const response = await axios.post('/api/models/generate', {
        prompt: processedPrompt,
        max_tokens: 500,
        temperature: 0.7
      });
      
      const aiResponse = response.data.text || 'No response generated';
      
      // Add AI message
      addMessage({ role: 'assistant', content: aiResponse });
      
      // Update chat in database
      const updatedMessages = [
        ...currentChat.messages,
        { 
          id: Date.now() - 1000 + '', 
          role: 'user', 
          content: prompt, 
          timestamp: new Date().toISOString() 
        },
        { 
          id: Date.now() + '', 
          role: 'assistant', 
          content: aiResponse, 
          timestamp: new Date().toISOString() 
        }
      ];
      
      await updateChat(currentChat.id, { 
        messages: updatedMessages,
        updated_at: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to generate response:', error);
      
      let errorMessage = 'Failed to generate response';
      if (error.response?.status === 503) {
        errorMessage = 'AI model not available. Please check model status in settings.';
      } else if (error.response?.status === 504) {
        errorMessage = 'Response timeout. The model may be overloaded.';
      }
      
      addMessage({ role: 'assistant', content: `Error: ${errorMessage}` });
      toast.error(errorMessage);
    } finally {
      set({ generating: false });
    }
  },

  updateLastMessage: (content) => {
    set((state) => {
      if (!state.currentChat || state.currentChat.messages.length === 0) return state;
      
      const messages = [...state.currentChat.messages];
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        content
      };
      
      return {
        currentChat: {
          ...state.currentChat,
          messages
        }
      };
    });
  }
}));
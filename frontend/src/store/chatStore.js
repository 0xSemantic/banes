import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session, messages: [] }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
}));
export default useChatStore;
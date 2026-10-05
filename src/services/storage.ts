import { DebugSession } from '../types';

const STORAGE_KEY = 'devfix_ai_debug_sessions_v1';

export const storageService = {
  getSessions(): DebugSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (e) {
      console.error('Failed to load sessions from localStorage:', e);
      return [];
    }
  },

  saveSession(session: DebugSession): void {
    try {
      const existing = this.getSessions();
      // Remove any existing with same id if updating
      const filtered = existing.filter((s) => s.id !== session.id);
      // Prepend the newest session
      const updated = [session, ...filtered].slice(0, 50); // Keep last 50
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save session to localStorage:', e);
    }
  },

  getSessionById(id: string): DebugSession | undefined {
    const sessions = this.getSessions();
    return sessions.find((s) => s.id === id);
  },

  deleteSession(id: string): void {
    try {
      const existing = this.getSessions();
      const updated = existing.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  },

  clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  },
};

import type { BoardSocket } from "./BoardSocket";

export function createLocalSocket(): BoardSocket {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  const ensure = (eventName: string) => {
    const existing = listeners.get(eventName);
    if (existing) return existing;
    const set = new Set<(...args: any[]) => void>();
    listeners.set(eventName, set);
    return set;
  };

  const socket: BoardSocket = {
    connected: true,
    emit(eventName, payload) {
      const set = listeners.get(eventName);
      if (!set) return;
      for (const fn of set) fn(payload);
    },
    on(eventName, handler) {
      ensure(eventName).add(handler);
    },
    off(eventName, handler) {
      const set = listeners.get(eventName);
      if (!set) return;
      if (!handler) {
        set.clear();
        return;
      }
      set.delete(handler);
    },
    disconnect() {
      listeners.clear();
      socket.connected = false;
    },
  };

  return socket;
}

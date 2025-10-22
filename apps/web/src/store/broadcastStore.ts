import { create } from "zustand";

export interface BroadcastState<T = unknown> {
  callbacks: Array<{
    id: symbol;
    callback: (message: T) => void | Promise<void>;
  }>;
  registerCallback: (
    id: symbol,
    callback: (message: T) => void | Promise<void>,
  ) => void;
  broadcast: (message: T) => Promise<void>;
  unregisterCallback: (id: symbol) => void;
  getCallbackCount: () => number;
}

/**
 * 全局广播 store 实例
 */
export const useBroadcastStore = create<BroadcastState>((set, get) => ({
  callbacks: [],

  registerCallback: (
    id: symbol,
    callback: (message: unknown) => void | Promise<void>,
  ) => {
    set((state) => ({
      callbacks: [...state.callbacks, { id, callback }],
    }));
  },

  broadcast: async (message: unknown) => {
    const callbacks = get().callbacks;
    await Promise.allSettled(
      callbacks.map(({ callback }) => callback(message)),
    );
  },

  unregisterCallback: (id: symbol) => {
    set((state) => ({
      callbacks: state.callbacks.filter((cb) => cb.id !== id),
    }));
  },

  getCallbackCount: () => get().callbacks.length,
}));

// @/store/useBroadcast.ts
import { create } from 'zustand';

interface BroadcastState<T = unknown> {
    callbacks: ((message: T) => void)[];
    registerCallback: (callback: (message: T) => void) => void;
    broadcast: (message: T) => void;
    unregisterCallback: (callback: (message: T) => void) => void;
}

export const useBroadcast = <T = unknown>() => create<BroadcastState<T>>((set, get) => ({
    callbacks: [],

    registerCallback: (callback: (message: T) => void) => {
        set((state) => ({
            callbacks: [...state.callbacks, callback],
        }));
    },

    broadcast: (message: T) => {
        get().callbacks.forEach((callback) => callback(message));
    },

    unregisterCallback: (callback: (message: T) => void) => {
        set((state) => ({
            callbacks: state.callbacks.filter((cb) => cb !== callback),
        }));
    },
}));
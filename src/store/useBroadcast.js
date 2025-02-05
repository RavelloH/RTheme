import { create } from 'zustand';

export const useBroadcast = create((set, get) => ({
    callbacks: [],

    registerCallback: (callback) => {
        set((state) => ({
            callbacks: [...state.callbacks, callback],
        }));
    },

    broadcast: (message) => {
        get().callbacks.forEach((callback) => callback(message));
    },

    unregisterCallback: (callback) => {
        set((state) => ({
            callbacks: state.callbacks.filter((cb) => cb !== callback),
        }));
    },
}));

import { create } from 'zustand';

export const useEvent = create((set, get) => ({
    listeners: {},

    on: (eventName, listener) => {
        set((state) => ({
            listeners: {
                ...state.listeners,
                [eventName]: [...(state.listeners[eventName] || []), listener],
            },
        }));
    },

    emit: (eventName, ...args) => {
        const listeners = get().listeners[eventName] || [];
        listeners.forEach((listener) => listener(...args));
    },

    off: (eventName, listener) => {
        set((state) => ({
            listeners: {
                ...state.listeners,
                [eventName]: (state.listeners[eventName] || []).filter((l) => l !== listener),
            },
        }));
    },
}));

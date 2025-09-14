// @/store/useEvent.ts
import { create } from 'zustand';

interface EventMap {
    [eventName: string]: (...args: unknown[]) => void;
}

interface EventState<T extends EventMap = EventMap> {
    listeners: Record<keyof T, ((...args: Parameters<T[keyof T]>) => void)[]>;
    on: <K extends keyof T>(eventName: K, listener: T[K]) => void;
    emit: <K extends keyof T>(eventName: K, ...args: Parameters<T[K]>) => void;
    off: <K extends keyof T>(eventName: K, listener: T[K]) => void;
}

export const useEvent = <T extends EventMap = EventMap>() => create<EventState<T>>((set, get) => ({
    listeners: {} as Record<keyof T, ((...args: Parameters<T[keyof T]>) => void)[]>,

    on: <K extends keyof T>(eventName: K, listener: T[K]) => {
        set((state) => ({
            listeners: {
                ...state.listeners,
                [eventName]: [...(state.listeners[eventName] || []), listener],
            },
        }));
    },

    emit: <K extends keyof T>(eventName: K, ...args: Parameters<T[K]>) => {
        const listeners = get().listeners[eventName] || [];
        listeners.forEach((listener) => listener(...args));
    },

    off: <K extends keyof T>(eventName: K, listener: T[K]) => {
        set((state) => ({
            listeners: {
                ...state.listeners,
                [eventName]: (state.listeners[eventName] || []).filter((l) => l !== listener),
            },
        }));
    },
}));
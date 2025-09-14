// @/store/useEvent.ts
import { create } from 'zustand';
import { useEffect, useRef } from 'react';

interface EventMap {
    [eventName: string]: (...args: unknown[]) => void | Promise<void>;
}

interface EventState<T extends EventMap = EventMap> {
    listeners: Record<keyof T, Array<{ id: symbol; listener: T[keyof T] }>>;
    on: <K extends keyof T>(eventName: K, id: symbol, listener: T[K]) => void;
    emit: <K extends keyof T>(eventName: K, ...args: Parameters<T[K]>) => Promise<void>;
    off: <K extends keyof T>(eventName: K, id: symbol) => void;
    getListenerCount: <K extends keyof T>(eventName: K) => number;
    getEventNames: () => (keyof T)[];
}

export const useEvent = <T extends EventMap = EventMap>() => create<EventState<T>>((set, get) => ({
    listeners: {} as Record<keyof T, Array<{ id: symbol; listener: T[keyof T] }>>,

    on: <K extends keyof T>(eventName: K, id: symbol, listener: T[K]) => {
        set((state) => ({
            listeners: {
                ...state.listeners,
                [eventName]: [...(state.listeners[eventName] || []), { id, listener }],
            },
        }));
    },

    emit: async <K extends keyof T>(eventName: K, ...args: Parameters<T[K]>) => {
        const listeners = get().listeners[eventName] || [];
        await Promise.allSettled(
            listeners.map(({ listener }) => listener(...args))
        );
    },

    off: <K extends keyof T>(eventName: K, id: symbol) => {
        set((state) => ({
            listeners: {
                ...state.listeners,
                [eventName]: (state.listeners[eventName] || []).filter((l) => l.id !== id),
            },
        }));
    },

    getListenerCount: <K extends keyof T>(eventName: K) => {
        return get().listeners[eventName]?.length || 0;
    },

    getEventNames: () => {
        return Object.keys(get().listeners) as (keyof T)[];
    },
}));

/**
 * React Hook for using events with automatic cleanup
 * @param eventStore - The event store instance
 * @param eventName - The event name to listen to
 * @param listener - The event listener function
 * @returns void
 */
export function useEventListener<T extends EventMap, K extends keyof T>(
    eventStore: ReturnType<typeof useEvent<T>>,
    eventName: K,
    listener: T[K]
): void {
    const listenerRef = useRef(listener);
    listenerRef.current = listener;

    useEffect(() => {
        const id = Symbol('event-listener');

        eventStore.getState().on(eventName, id, ((...args: Parameters<T[K]>) => {
            return listenerRef.current(...args);
        }) as T[K]);

        return () => {
            eventStore.getState().off(eventName, id);
        };
    }, [eventStore, eventName]);
}
// @/store/useBroadcast.ts
import { create } from 'zustand';
import { useEffect, useRef } from 'react';

interface BroadcastState<T = unknown> {
    callbacks: Array<{ id: symbol; callback: (message: T) => void | Promise<void> }>;
    registerCallback: (id: symbol, callback: (message: T) => void | Promise<void>) => void;
    broadcast: (message: T) => Promise<void>;
    unregisterCallback: (id: symbol) => void;
    getCallbackCount: () => number;
}

export const useBroadcast = <T = unknown>() => create<BroadcastState<T>>((set, get) => ({
    callbacks: [],

    registerCallback: (id: symbol, callback: (message: T) => void | Promise<void>) => {
        set((state) => ({
            callbacks: [...state.callbacks, { id, callback }],
        }));
    },

    broadcast: async (message: T) => {
        const callbacks = get().callbacks;
        await Promise.allSettled(
            callbacks.map(({ callback }) => callback(message))
        );
    },

    unregisterCallback: (id: symbol) => {
        set((state) => ({
            callbacks: state.callbacks.filter((cb) => cb.id !== id),
        }));
    },

    getCallbackCount: () => get().callbacks.length,
}));

/**
 * React Hook for using broadcast with automatic cleanup
 * @param broadcastStore - The broadcast store instance
 * @param callback - The callback function to register
 * @returns void
 */
export function useBroadcastListener<T>(
    broadcastStore: ReturnType<typeof useBroadcast<T>>,
    callback: (message: T) => void | Promise<void>
): void {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        const id = Symbol('broadcast-callback');

        broadcastStore.getState().registerCallback(id, (message: T) => {
            return callbackRef.current(message);
        });

        return () => {
            broadcastStore.getState().unregisterCallback(id);
        };
    }, [broadcastStore]);
}
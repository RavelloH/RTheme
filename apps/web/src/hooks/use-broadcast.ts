// @/store/useBroadcast.ts
import { useRef, useEffect } from "react";
import { useBroadcastStore } from "@/store/broadcast-store";

/**
 * React Hook for using broadcast with automatic cleanup
 * @param callback - The callback function to register
 * @returns void
 */
export function useBroadcast<T>(
  callback: (message: T) => void | Promise<void>,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const id = Symbol("broadcast-callback");

    useBroadcastStore.getState().registerCallback(id, (message: unknown) => {
      return callbackRef.current(message as T);
    });

    return () => {
      useBroadcastStore.getState().unregisterCallback(id);
    };
  }, []);
}

/**
 * Hook for broadcasting messages
 * @returns broadcast function
 */
export function useBroadcastSender<T>() {
  const broadcast = (message: T) => {
    return useBroadcastStore.getState().broadcast(message);
  };
  return { broadcast };
}

// @/store/useEvent.ts
import { useEffect, useRef } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";

interface EventMap {
  [eventName: string]: (...args: unknown[]) => void | Promise<void>;
}

type EventStore<T extends EventMap = EventMap> = UseBoundStore<
  StoreApi<EventState<T>>
>;

interface EventState<T extends EventMap = EventMap> {
  listeners: Record<keyof T, Array<{ id: symbol; listener: T[keyof T] }>>;
  on: <K extends keyof T>(eventName: K, id: symbol, listener: T[K]) => void;
  emit: <K extends keyof T>(
    eventName: K,
    ...args: Parameters<T[K]>
  ) => Promise<void>;
  emitSync: <K extends keyof T>(
    eventName: K,
    ...args: Parameters<T[K]>
  ) => void;
  off: <K extends keyof T>(eventName: K, id: symbol) => void;
  getListenerCount: <K extends keyof T>(eventName: K) => number;
  getEventNames: () => (keyof T)[];
}

/**
 * 全局事件总线 store（单例）
 */
const useEventStore = create<EventState<EventMap>>((set, get) => ({
  listeners: {} as Record<
    keyof EventMap,
    Array<{ id: symbol; listener: EventMap[keyof EventMap] }>
  >,

  on: <K extends keyof EventMap>(
    eventName: K,
    id: symbol,
    listener: EventMap[K],
  ) => {
    set((state) => ({
      listeners: {
        ...state.listeners,
        [eventName]: [...(state.listeners[eventName] || []), { id, listener }],
      },
    }));
  },

  emit: async <K extends keyof EventMap>(
    eventName: K,
    ...args: Parameters<EventMap[K]>
  ) => {
    const listeners = get().listeners[eventName] || [];
    await Promise.allSettled(
      listeners.map(({ listener }) => Promise.resolve(listener(...args))),
    );
  },

  emitSync: <K extends keyof EventMap>(
    eventName: K,
    ...args: Parameters<EventMap[K]>
  ) => {
    const listeners = get().listeners[eventName] || [];
    listeners.forEach(({ listener }) => {
      try {
        void listener(...args);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[useEvent.emitSync] listener error:", error);
        }
      }
    });
  },

  off: <K extends keyof EventMap>(eventName: K, id: symbol) => {
    set((state) => ({
      listeners: {
        ...state.listeners,
        [eventName]: (state.listeners[eventName] || []).filter(
          (l) => l.id !== id,
        ),
      },
    }));
  },

  getListenerCount: <K extends keyof EventMap>(eventName: K) => {
    return get().listeners[eventName]?.length || 0;
  },

  getEventNames: () => {
    return Object.keys(get().listeners) as (keyof EventMap)[];
  },
}));

/**
 * 事件总线访问器（返回同一个单例 store）
 */
export const useEvent = <T extends EventMap = EventMap>(): EventStore<T> => {
  return useEventStore as unknown as EventStore<T>;
};

/**
 * React Hook for using events with automatic cleanup
 * @param eventStore - The event store instance
 * @param eventName - The event name to listen to
 * @param listener - The event listener function
 * @returns void
 */
export function useEventListener<T extends EventMap, K extends keyof T>(
  eventStore: EventStore<T>,
  eventName: K,
  listener: T[K],
): void {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const id = Symbol("event-listener");

    eventStore.getState().on(eventName, id, ((...args: Parameters<T[K]>) => {
      return listenerRef.current(...args);
    }) as T[K]);

    return () => {
      eventStore.getState().off(eventName, id);
    };
  }, [eventStore, eventName]);
}

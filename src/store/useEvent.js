import { create } from 'zustand';

export const useEvent = create((set, get) => ({
    // 存储事件监听器 { [eventName]: [listener1, listener2, ...] }
    listeners: {},

    // 注册事件监听器
    on: (eventName, listener) => {
        set((state) => ({
            listeners: {
                ...state.listeners,
                [eventName]: [...(state.listeners[eventName] || []), listener],
            },
        }));
    },

    // 触发事件
    emit: (eventName, ...args) => {
        const listeners = get().listeners[eventName] || [];
        listeners.forEach((listener) => listener(...args));
    },

    // 移除事件监听器
    off: (eventName, listener) => {
        set((state) => ({
            listeners: {
                ...state.listeners,
                [eventName]: (state.listeners[eventName] || []).filter((l) => l !== listener),
            },
        }));
    },
}));

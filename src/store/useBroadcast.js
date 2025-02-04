import { create } from 'zustand';

export const useBroadcast = create((set, get) => ({
    // 存储所有注册的回调函数
    callbacks: [],

    // 注册回调函数
    registerCallback: (callback) => {
        set((state) => ({
            callbacks: [...state.callbacks, callback],
        }));
    },

    // 广播消息
    broadcast: (message) => {
        get().callbacks.forEach((callback) => callback(message));
    },

    // 移除回调函数
    unregisterCallback: (callback) => {
        set((state) => ({
            callbacks: state.callbacks.filter((cb) => cb !== callback),
        }));
    },
}));

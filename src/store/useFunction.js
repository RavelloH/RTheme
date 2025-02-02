// 函数注册/调用管线
import log from '@/utils/log';
import { create } from 'zustand';

export const useFunction = create((set, get) => ({
    functions: {},
    registerFunction: (name, fn) => {
        set((state) => ({
            functions: {
                ...state.functions,
                [name]: fn,
            },
        }));
    },
    callFunction: (name) => {
        const { functions } = get();
        const targetFn = functions[name];

        if (typeof targetFn === 'function') {
            return targetFn();
        }
        log.error(`<store> Function ${name} not found.`);
        return null;
    },
    hasFunction: (name) => {
        return typeof get().functions[name] === 'function';
    },
}));

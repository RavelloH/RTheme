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

    callFunction: (name, ...args) => {
        const { functions } = get();
        const targetFn = functions[name];

        if (typeof targetFn === 'function') {
            return targetFn(...args);
        }
        return null;
    },

    hasFunction: (name) => {
        return typeof get().functions[name] === 'function';
    },
}));

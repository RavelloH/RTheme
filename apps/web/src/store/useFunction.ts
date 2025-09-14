// @/store/useFunction.ts
import { create } from 'zustand';

interface FunctionMap {
    [functionName: string]: (...args: unknown[]) => unknown;
}

interface FunctionState<T extends FunctionMap = FunctionMap> {
    functions: Partial<T>;
    registerFunction: <K extends keyof T>(name: K, fn: T[K]) => void;
    callFunction: <K extends keyof T>(name: K, ...args: Parameters<T[K]>) => ReturnType<T[K]>;
    hasFunction: <K extends keyof T>(name: K) => name is K & keyof T;
}

export const useFunction = <T extends FunctionMap = FunctionMap>() => create<FunctionState<T>>((set, get) => ({
    functions: {} as Partial<T>,

    registerFunction: <K extends keyof T>(name: K, fn: T[K]) => {
        set((state) => ({
            functions: {
                ...state.functions,
                [name]: fn,
            },
        }));
    },

    callFunction: <K extends keyof T>(name: K, ...args: Parameters<T[K]>): ReturnType<T[K]> => {
        const { functions } = get();
        const targetFn = functions[name];

        if (typeof targetFn === 'function') {
            return targetFn(...args) as ReturnType<T[K]>;
        }
        throw new Error(`Function '${String(name)}' not found`);
    },

    hasFunction: <K extends keyof T>(name: K): name is K & keyof T => {
        return typeof get().functions[name] === 'function';
    },
}));
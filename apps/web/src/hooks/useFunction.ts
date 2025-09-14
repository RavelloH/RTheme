// @/store/useFunction.ts
import { create } from 'zustand';

interface FunctionMap {
    [functionName: string]: (...args: unknown[]) => unknown;
}

/**
 * Custom error for function not found
 */
export class FunctionNotFoundError extends Error {
    constructor(functionName: string) {
        super(`Function '${functionName}' not found`);
        this.name = 'FunctionNotFoundError';
    }
}

/**
 * Custom error for function execution
 */
export class FunctionExecutionError extends Error {
    constructor(functionName: string, originalError: unknown) {
        super(`Function '${functionName}' execution failed: ${originalError instanceof Error ? originalError.message : String(originalError)}`);
        this.name = 'FunctionExecutionError';
        this.cause = originalError;
    }
}

interface FunctionState<T extends FunctionMap = FunctionMap> {
    functions: Partial<T>;
    registerFunction: <K extends keyof T>(name: K, fn: T[K]) => void;
    unregisterFunction: <K extends keyof T>(name: K) => void;
    callFunction: <K extends keyof T>(name: K, ...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>;
    callFunctionSync: <K extends keyof T>(name: K, ...args: Parameters<T[K]>) => ReturnType<T[K]>;
    hasFunction: <K extends keyof T>(name: K) => name is K & keyof T;
    getFunctionNames: () => (keyof T)[];
    getFunctionCount: () => number;
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

    unregisterFunction: <K extends keyof T>(name: K) => {
        set((state) => {
            const functions = { ...state.functions };
            delete functions[name];
            return { functions };
        });
    },

    callFunction: async <K extends keyof T>(name: K, ...args: Parameters<T[K]>): Promise<ReturnType<T[K]>> => {
        const { functions } = get();
        const targetFn = functions[name];

        if (typeof targetFn !== 'function') {
            throw new FunctionNotFoundError(String(name));
        }

        try {
            const result = targetFn(...args);
            return result instanceof Promise ? result : Promise.resolve(result as ReturnType<T[K]>);
        } catch (error) {
            throw new FunctionExecutionError(String(name), error);
        }
    },

    callFunctionSync: <K extends keyof T>(name: K, ...args: Parameters<T[K]>): ReturnType<T[K]> => {
        const { functions } = get();
        const targetFn = functions[name];

        if (typeof targetFn !== 'function') {
            throw new FunctionNotFoundError(String(name));
        }

        try {
            return targetFn(...args) as ReturnType<T[K]>;
        } catch (error) {
            throw new FunctionExecutionError(String(name), error);
        }
    },

    hasFunction: <K extends keyof T>(name: K): name is K & keyof T => {
        return typeof get().functions[name] === 'function';
    },

    getFunctionNames: () => {
        return Object.keys(get().functions) as (keyof T)[];
    },

    getFunctionCount: () => {
        return Object.keys(get().functions).length;
    },
}));
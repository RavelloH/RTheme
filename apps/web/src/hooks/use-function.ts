// @/store/useFunction.ts
import { create, type StoreApi, type UseBoundStore } from "zustand";

interface FunctionMap {
  [functionName: string]: (...args: unknown[]) => unknown;
}

type FunctionStore<T extends FunctionMap = FunctionMap> = UseBoundStore<
  StoreApi<FunctionState<T>>
>;

/**
 * Custom error for function not found
 */
export class FunctionNotFoundError extends Error {
  constructor(functionName: string) {
    super(`Function '${functionName}' not found`);
    this.name = "FunctionNotFoundError";
  }
}

/**
 * Custom error for function execution
 */
export class FunctionExecutionError extends Error {
  constructor(functionName: string, originalError: unknown) {
    super(
      `Function '${functionName}' execution failed: ${originalError instanceof Error ? originalError.message : String(originalError)}`,
    );
    this.name = "FunctionExecutionError";
    this.cause = originalError;
  }
}

interface FunctionState<T extends FunctionMap = FunctionMap> {
  functions: Partial<T>;
  registerFunction: <K extends keyof T>(name: K, fn: T[K]) => void;
  unregisterFunction: <K extends keyof T>(name: K) => void;
  callFunction: <K extends keyof T>(
    name: K,
    ...args: Parameters<T[K]>
  ) => Promise<ReturnType<T[K]>>;
  callFunctionSync: <K extends keyof T>(
    name: K,
    ...args: Parameters<T[K]>
  ) => ReturnType<T[K]>;
  hasFunction: <K extends keyof T>(name: K) => name is K & keyof T;
  getFunctionNames: () => (keyof T)[];
  getFunctionCount: () => number;
}

/**
 * 全局函数注册中心 store（单例）
 */
const useFunctionStore = create<FunctionState<FunctionMap>>((set, get) => ({
  functions: {} as Partial<FunctionMap>,

  registerFunction: <K extends keyof FunctionMap>(
    name: K,
    fn: FunctionMap[K],
  ) => {
    set((state) => ({
      functions: {
        ...state.functions,
        [name]: fn,
      },
    }));
  },

  unregisterFunction: <K extends keyof FunctionMap>(name: K) => {
    set((state) => {
      const functions = { ...state.functions };
      delete functions[name];
      return { functions };
    });
  },

  callFunction: async <K extends keyof FunctionMap>(
    name: K,
    ...args: Parameters<FunctionMap[K]>
  ): Promise<ReturnType<FunctionMap[K]>> => {
    const { functions } = get();
    const targetFn = functions[name];

    if (typeof targetFn !== "function") {
      throw new FunctionNotFoundError(String(name));
    }

    try {
      const result = targetFn(...args);
      return result instanceof Promise
        ? result
        : Promise.resolve(result as ReturnType<FunctionMap[K]>);
    } catch (error) {
      throw new FunctionExecutionError(String(name), error);
    }
  },

  callFunctionSync: <K extends keyof FunctionMap>(
    name: K,
    ...args: Parameters<FunctionMap[K]>
  ): ReturnType<FunctionMap[K]> => {
    const { functions } = get();
    const targetFn = functions[name];

    if (typeof targetFn !== "function") {
      throw new FunctionNotFoundError(String(name));
    }

    try {
      return targetFn(...args) as ReturnType<FunctionMap[K]>;
    } catch (error) {
      throw new FunctionExecutionError(String(name), error);
    }
  },

  hasFunction: <K extends keyof FunctionMap>(
    name: K,
  ): name is K & keyof FunctionMap => {
    return typeof get().functions[name] === "function";
  },

  getFunctionNames: () => {
    return Object.keys(get().functions) as (keyof FunctionMap)[];
  },

  getFunctionCount: () => {
    return Object.keys(get().functions).length;
  },
}));

/**
 * 函数中心访问器（返回同一个单例 store）
 */
export const useFunction = <
  T extends FunctionMap = FunctionMap,
>(): FunctionStore<T> => {
  return useFunctionStore as unknown as FunctionStore<T>;
};

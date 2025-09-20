import { create } from 'zustand';

interface ConsoleState {
  isConsoleOpen: boolean;
  setConsoleOpen: (isOpen: boolean) => void;
  toggleConsole: () => void;
}

/**
 * 控制面板状态管理
 * 独立于菜单状态，避免Footer位置变化时重置控制面板状态
 */
export const useConsoleStore = create<ConsoleState>((set) => ({
  isConsoleOpen: false,
  setConsoleOpen: (isOpen: boolean) => set({ isConsoleOpen: isOpen }),
  toggleConsole: () => set((state) => ({ isConsoleOpen: !state.isConsoleOpen })),
}));
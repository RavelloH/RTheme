import { create } from "zustand";

interface FooterState {
  isFooterVisible: boolean;
  setFooterVisible: (isVisible: boolean) => void;
}

/**
 * Footer 显示状态管理
 * 用于控制 footer 在滚动时的显示和隐藏
 */
export const useFooterStore = create<FooterState>((set) => ({
  isFooterVisible: true,
  setFooterVisible: (isVisible: boolean) => set({ isFooterVisible: isVisible }),
}));

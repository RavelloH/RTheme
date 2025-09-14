import { create } from 'zustand';

interface MenuState {
  isMenuOpen: boolean;
  setMenuOpen: (isOpen: boolean) => void;
  toggleMenu: () => void;
}

/**
 * 菜单状态管理
 * Header和Footer共享菜单开关状态
 */
export const useMenuStore = create<MenuState>((set) => ({
  isMenuOpen: false,
  setMenuOpen: (isOpen: boolean) => set({ isMenuOpen: isOpen }),
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
}));
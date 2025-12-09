import { create } from 'zustand';
import { Vector3 } from 'three';

type Mode = 'VIEW' | 'PLACE' | 'REMOVE';

interface AppState {
  mode: Mode;
  cursorPosition: [number, number, number]; // [x, y, z]
  setMode: (mode: Mode) => void;
  setCursorPosition: (position: [number, number, number] | Vector3) => void;
}

export const useStore = create<AppState>((set) => ({
  mode: 'VIEW',
  cursorPosition: [0, 0, 0],
  setMode: (mode) => set({ mode }),
  setCursorPosition: (position) => {
    // Vector3 객체가 들어올 경우 배열로 변환
    if (position instanceof Vector3) {
      set({ cursorPosition: [position.x, position.y, position.z] });
    } else {
      set({ cursorPosition: position });
    }
  },
}));

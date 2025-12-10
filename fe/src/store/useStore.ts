import { create } from 'zustand';
import { Vector3 } from 'three';

type Mode = 'VIEW' | 'PLACE' | 'REMOVE';

interface Furniture {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  modelUrl: string;
}

interface AppState {
  mode: Mode; // view / place / remove
  cursorPosition: [number, number, number]; // [x, y, z]
  furnitures: Furniture[]; // 배치된 가구
  textureUrl: string; // 방 이미지
  setMode: (mode: Mode) => void;
  setCursorPosition: (position: [number, number, number] | Vector3) => void;
  addFurniture: (position: [number, number, number] | Vector3) => void;
  setTextureUrl: (url: string) => void;
}

export const useStore = create<AppState>((set) => ({
  mode: 'VIEW',
  cursorPosition: [0, 0, 0],
  furnitures: [],
  textureUrl: 'https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg', // Default texture
  setMode: (mode) => set({ mode }),
  setCursorPosition: (position) => {
    // Vector3 객체가 들어올 경우 배열로 변환
    if (position instanceof Vector3) {
      set({ cursorPosition: [position.x, position.y, position.z] });
    } else {
      set({ cursorPosition: position });
    }
  },
  addFurniture: (position) => {
    const pos = position instanceof Vector3 ? [position.x, position.y, position.z] : position;
    const newFurniture: Furniture = {
      id: Math.random().toString(36).substr(2, 9),
      position: pos as [number, number, number],
      rotation: [0, 0, 0],
      modelUrl: 'box', // Mock data
    };
    set((state) => ({ furnitures: [...state.furnitures, newFurniture] }));
  },
  setTextureUrl: (url) => set({ textureUrl: url }),
}));

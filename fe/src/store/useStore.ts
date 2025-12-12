import { create } from 'zustand';
import { Vector3 } from 'three';
import { FurnitureItem, FURNITURE_DATA } from '@/data/mockData';

type Mode = 'VIEW' | 'PLACE' | 'REMOVE';

interface Furniture {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number]; // 스케일 추가
  modelUrl: string;
  size: { width: number; depth: number };
}

interface AppState {
  mode: Mode; // view / place / remove
  cursorPosition: [number, number, number]; // [x, y, z]
  furnitures: Furniture[]; // 배치된 가구
  textureUrl: string | null; // 방 이미지
  userPrompt: string;
  isLoading: boolean;
  selectedFurnitureId: string | null;
  roomSize: { width: number; depth: number; height: number };
  isDebugMode: boolean;
  setMode: (mode: Mode) => void;
  setCursorPosition: (position: [number, number, number] | Vector3) => void;
  addFurniture: (position: [number, number, number] | Vector3) => void;
  updateFurniture: (id: string, changes: Partial<Omit<Furniture, 'position' | 'rotation'> & { position: [number, number, number] | Vector3, rotation: [number, number, number] | Map<string, any> /* allowing Euler-like objects */ }>) => void;
  setSelectedFurnitureId: (id: string | null) => void;
  setTextureUrl: (url: string) => void;
  setUserPrompt: (prompt: string) => void;
  setIsLoading: (loading: boolean) => void;
  setRoomSize: (size: { width: number; depth: number; height: number }) => void;
  setIsDebugMode: (isDebug: boolean) => void;
  // Phase 8: Mock API & Dynamic Furniture List
  // Phase 8: Mock API & Dynamic Furniture List
  currentFurnitureList: FurnitureItem[];
  setFurnitureList: (list: FurnitureItem[]) => void;
  messages: { id: number; sender: 'user' | 'gemini'; text: string }[];
  addMessage: (msg: { sender: 'user' | 'gemini'; text: string }) => void;
  selectedRecommendation: FurnitureItem | null;
  setSelectedRecommendation: (item: FurnitureItem | null) => void;
  // Phase A: API Environment
  apiBaseUrl: string;
  originalImageFile: File | null;
  setApiBaseUrl: (url: string) => void;
  setOriginalImageFile: (file: File | null) => void;
  // Floor Boundary
  floorMaskUrl: string | null;
  setFloorMaskUrl: (url: string | null) => void;
  imageSize: { width: number; height: number } | null;
  setImageSize: (size: { width: number; height: number } | null) => void;

  // Semantic Navigation
  floorMaskData: Uint8ClampedArray | null;
  maskDimensions: { width: number; height: number } | null;
  setFloorMaskData: (data: Uint8ClampedArray, width: number, height: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  mode: 'VIEW',
  cursorPosition: [0, 0, 0],
  furnitures: [],
  textureUrl: null, // 초기값 null -> Landing Page 표시
  userPrompt: '',
  isLoading: false,
  selectedFurnitureId: null,
  roomSize: { width: 12, depth: 8, height: 3 }, // 초기값: 가로 12m, 세로 8m, 높이 3m
  isDebugMode: true,
  
  // Phase 8 Initial State
  currentFurnitureList: [], // 초기값 빈 배열로 변경 (채팅 요청 전까지 숨김)
  messages: [],
  
  // Phase A Initial State
  apiBaseUrl: '',
  originalImageFile: null,
  floorMaskUrl: null,
  imageSize: null,
  floorMaskData: null,
  maskDimensions: null,

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
    const { selectedRecommendation } = get();
    
    // 만약 선택된 추천 가구가 있으면 그것을 사용, 없으면 기본 박스
    const modelUrl = selectedRecommendation ? selectedRecommendation.model_url : 'box';
    // 스케일 값이 있으면 사용, 없으면 [1, 1, 1] 기본값
    const scale = selectedRecommendation?.scale || [1, 1, 1];
    const initialSize = { width: 1, depth: 1 }; // 나중에 모델 크기에 따라 조정 필요

    const newFurniture: Furniture = {
      id: Math.random().toString(36).substr(2, 9),
      position: pos as [number, number, number],
      rotation: [0, 0, 0],
      scale: scale, // 스케일 저장
      modelUrl: modelUrl,
      size: initialSize, 
    };
    set((state) => ({ furnitures: [...state.furnitures, newFurniture] }));
  },
  updateFurniture: (id, changes) => set((state) => ({
    furnitures: state.furnitures.map((f) => {
      if (f.id !== id) return f;
      
      const { position: cPos, rotation: cRot, ...restChanges } = changes;
      let newPosition = f.position;
      let newRotation = f.rotation;

      if (cPos) {
        if (Array.isArray(cPos)) {
          newPosition = cPos;
        } else if ((cPos as any).isVector3) {
           const v = cPos as any;
           newPosition = [v.x, v.y, v.z];
        }
      }

      if (cRot) {
        if (Array.isArray(cRot)) {
           newRotation = cRot;
        } else if ((cRot as any).isEuler) {
           const e = cRot as any;
           newRotation = [e.x, e.y, e.z];
        }
      }

      return { 
        ...f, 
        ...restChanges, 
        position: newPosition, 
        rotation: newRotation,
        
        // changes에 scale이 포함된다면 업데이트, 아니면 기존 값 유지 (타입 정의는 Partial이므로 문제 없음)
        // 하지만 updateFurniture 시그니처를 수정해야 완벽함. 
        // 현재는 Partial<Omit...> 타입이라 scale이 들어올 수 있음.
      };
    }),
  })),
  setSelectedFurnitureId: (id) => set({ selectedFurnitureId: id }),
  setTextureUrl: (url) => set({ textureUrl: url }),
  setUserPrompt: (prompt) => set({ userPrompt: prompt }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setRoomSize: (size) => set({ roomSize: size }),
  setIsDebugMode: (isDebug) => set({ isDebugMode: isDebug }),
  
  // Phase 8 Actions
  setFurnitureList: (list) => set({ currentFurnitureList: list }),
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, { id: Date.now(), ...msg }]
  })),
  
  // Placement State
  selectedRecommendation: null,
  setSelectedRecommendation: (item) => set({ selectedRecommendation: item }),

  // Phase A Actions
  setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
  setOriginalImageFile: (file) => set({ originalImageFile: file }),
  setFloorMaskUrl: (url) => set({ floorMaskUrl: url }),
  setImageSize: (size) => set({ imageSize: size }),
  setFloorMaskData: (data, width, height) => set({ floorMaskData: data, maskDimensions: { width, height } }),
}));

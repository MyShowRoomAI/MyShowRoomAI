import { FurnitureItem } from '@/data/mockData';

// Type Definitions for Mock API
export interface AiResponse {
  ai_message: string;
  new_furniture_items: FurnitureItem[];
}

export const fetchAiDesignResponse = async (prompt: string): Promise<AiResponse> => {
  // 2초 딜레이 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock Data 반환
  return {
    ai_message: "모던 미니멀리즘 스타일에 맞게 새로운 가구 목록을 제안드립니다.",
    new_furniture_items: [
      {
        id: 'new-1',
        name: 'Damaged Helmet 1',
        price: '$100',
        image: '🪖',
        model_url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
        desc: 'Testing Complex Ghosting 1',
        scale: [1, 1, 1],
      },
      {
        id: 'new-2',
        name: 'BoomBox (Big Scale)',
        price: '$200',
        image: '�',
        model_url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoomBox/glTF-Binary/BoomBox.glb',
        desc: 'Testing Big Scale [80, 80, 80]',
        scale: [80, 80, 80],
      },
      {
        id: 'new-3',
        name: 'Damaged Helmet 3',
        price: '$300',
        image: '🪖',
        model_url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
        desc: 'Testing Complex Ghosting 3',
        scale: [1, 1, 1],
      },
      {
        id: 'new-4',
        name: 'BoomBox (Medium Scale)',
        price: '$400',
        image: '🔊',
        model_url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoomBox/glTF-Binary/BoomBox.glb',
        desc: 'Testing Medium Scale [40, 40, 40]',
        scale: [40, 40, 40],
      },
      {
        id: 'new-5',
        name: 'Damaged Helmet 5',
        price: '$500',
        image: '🪖',
        model_url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
        desc: 'Testing Complex Ghosting 5',
        scale: [1, 1, 1],
      },
    ],
  };
};

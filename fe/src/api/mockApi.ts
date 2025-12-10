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
        name: 'Minimalist Chair',
        price: '$199',
        image: '🪑',
        model_url: '/models/chair.glb',
        desc: 'Sleek design for modern homes',
      },
      {
        id: 'new-2',
        name: 'Glass Coffee Table',
        price: '$450',
        image: '🧊',
        model_url: '/models/table.glb',
        desc: 'Transparent elegance',
      },
      {
        id: 'new-3',
        name: 'Abstract Art Piece',
        price: '$300',
        image: '🎨',
        model_url: '/models/art.glb',
        desc: 'Adds a touch of creativity',
      },
      {
        id: 'new-4',
        name: 'Potted Ficus',
        price: '$80',
        image: '🪴',
        model_url: '/models/plant.glb',
        desc: 'Natural vibe',
      },
    ],
  };
};

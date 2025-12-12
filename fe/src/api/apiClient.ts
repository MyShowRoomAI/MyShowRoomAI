import { FurnitureItem } from '@/data/mockData';
import { API_CONFIG } from '@/config/api';
import { fetchAiDesignResponse as fetchMockResponse } from './mockApi';

// Type Definitions for API Response
export interface AiResponse {
  ai_message: string;
  new_furniture_items: FurnitureItem[];
}

// 백엔드 API 응답 타입 (실제 명세 기준 - LIST 형태)
interface BackendApiResponseItem {
  selected_id: string;
  reason: string;
  position_suggestion: string;
  item_details: {
    id: string;
    name: string;
    glb_url: string;
    category: string;
  };
}

type BackendApiResponse = BackendApiResponseItem[];

/**
 * 실제 백엔드 API를 호출하여 AI 디자인 응답을 가져옵니다.
 * @param prompt 사용자 입력 프롬프트
 * @param imageFile 원본 이미지 파일
 * @returns AI 응답 및 가구 목록
 */
export const fetchAiDesignResponse = async (
  prompt: string,
  imageFile: File
): Promise<AiResponse> => {
  // Mock API 사용 (서버 꺼져있을 때)
  if (API_CONFIG.USE_MOCK_API) {
    return fetchMockResponse(prompt);
  }
  // FormData 구성
  const formData = new FormData();
  formData.append('image', imageFile); // 'file'이 아니라 'image'
  formData.append('user_prompt', prompt); // 'prompt'가 아니라 'user_prompt'

  try {
    // /consult 엔드포인트 호출
    const response = await fetch(`${API_CONFIG.BASE_URL}/consult`, {
      method: 'POST',
      body: formData,
      headers: {
        // Swagger와 동일하게 Accept 헤더 명시
        'Accept': 'application/json',
        // 'Content-Type': 'multipart/form-data' // 절대 설정하지 말 것! (브라우저가 boundary 자동 설정)
      },
    });



    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 에러 응답:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: BackendApiResponse = await response.json();

    // 백엔드 응답을 Store 형식으로 매핑
    const newFurnitureItems: FurnitureItem[] = data.map((item) => ({
      id: item.item_details.id || item.selected_id, // ID가 item_details에 없으면 selected_id 사용
      name: item.item_details.name,
      price: '', // 백엔드에서 제공하지 않음
      image: '🛋️', // 임시 아이콘
      model_url: item.item_details.glb_url,
      desc: item.position_suggestion || item.reason, // 위치 추천이나 이유를 설명으로 사용
    }));

    // AI 메시지는 첫 번째 아이템의 이유나 일반적인 성공 메시지로 설정
    const aiMessage = newFurnitureItems.length > 0
      ? `Here are ${newFurnitureItems.length} recommendations based on your request.`
      : "Sorry, I couldn't find any recommendations.";

    return {
      ai_message: aiMessage,
      new_furniture_items: newFurnitureItems,
    };
  } catch (error) {
    console.error('fetchAiDesignResponse Error:', error);
    
    // 더 구체적인 에러 메시지
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('네트워크 연결 실패: Ngrok URL이 올바른지, 서버가 실행 중인지 확인해주세요. CORS 설정도 확인이 필요합니다.');
    }
    
    throw error;
  }
};

/**
 * 방 구조 분석 API 호출
 * @param imageFile 원본 이미지 파일
 * @returns 바닥 마스크 이미지 (Base64)
 */
export const analyzeRoomStructure = async (
  imageFile: File
): Promise<{ status: string; mask_image: string }> => {
  // Mock API 사용
  if (API_CONFIG.USE_MOCK_API) {
    await new Promise(r => setTimeout(r, 1500)); 
    
    // Create a larger mock mask (512x256)
    // Top 70% transparent, Bottom 30% Green
    // This allows testing the "Pixel Picking" somewhat realistically
    if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Clear (Transparent)
            ctx.clearRect(0, 0, 512, 256);
            
            // Draw Bottom 30% Green
            const floorH = 256 * 0.3;
            const startY = 256 - floorH;
            ctx.fillStyle = 'rgba(0, 255, 0, 1.0)';
            ctx.fillRect(0, startY, 512, floorH);
            
            const mockMaskImage = canvas.toDataURL('image/png');
            return {
                status: "success",
                mask_image: mockMaskImage,
            };
        }
    }
    
    // Fallback if no document (SSR?)
    return {
      status: "success",
      mask_image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAACklEQVQImWNgQAYiIyP/UywsDNugIiKCXRgYGP5D2A0MDAx/IBz0gwEAPEwWwbVk7WAAAAAASUVORK5CYII=", 
    };
  }

  // 실제 API 호출
  const formData = new FormData();
  formData.append('file', imageFile);

  try {

    const response = await fetch(`${API_CONFIG.BASE_URL}/analyze-image`, {
      method: 'POST',
      body: formData,
    });



    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 에러 응답:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('analyzeRoomStructure Error:', error);
    throw error;
  }
};

/**
 * 가구 삭제 API 호출
 * @param imageFile 원본 이미지 파일
 * @param x 삭제할 x좌표
 * @param y 삭제할 y좌표
 * @returns 처리된 이미지(base64) 및 상태
 */
export const removeObject = async (
  imageFile: File,
  x: number,
  y: number
): Promise<{ status: string; image: string; mask_image: string }> => {

    // Mock API 사용
    if (API_CONFIG.USE_MOCK_API) {
        await new Promise(r => setTimeout(r, 1500));
        return {
            status: "success",
            // Return a placeholder or the same image as base64 if needed for mock
            // For now, just a dummy string to satisfy type, logic should handle it.
            image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", 
            mask_image: ""
        };
    }

  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('x', x.toString());
  formData.append('y', y.toString());

  try {

    const response = await fetch(`${API_CONFIG.BASE_URL}/remove-object`, {
      method: 'POST',
      body: formData,
    });



    if (!response.ok) {
      const errorText = await response.text();
      console.error('API remove-object 에러:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('removeObject Error:', error);
    throw error;
  }
};



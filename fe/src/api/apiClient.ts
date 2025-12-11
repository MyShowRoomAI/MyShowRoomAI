import { FurnitureItem } from '@/data/mockData';
import { MOCK_FLOOR_BOUNDARY } from '@/data/mockFloorData';
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
    console.log('🔄 Using Mock API (server is offline)');
    return fetchMockResponse(prompt);
  }
  // FormData 구성
  const formData = new FormData();
  formData.append('image', imageFile); // 'file'이 아니라 'image'
  formData.append('user_prompt', prompt); // 'prompt'가 아니라 'user_prompt'

  try {
    // 디버깅: 요청 정보 상세 출력
    console.log('API 요청 시작:', {
      url: `${API_CONFIG.BASE_URL}/consult`,
      imageFileName: imageFile.name,
      imageSize: imageFile.size,
      imageType: imageFile.type,
      prompt: prompt.substring(0, 50) + '...',
    });

    // FormData 내용 확인 (브라우저 콘솔에서 확인 가능)
    // 주의: FormData를 console.log로 바로 찍으면 빈 객체로 보일 수 있음
    for (const [key, value] of formData.entries()) {
      console.log(`FormData [${key}]:`, value);
    }

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

    console.log('API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 에러 응답:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: BackendApiResponse = await response.json();
    console.log('API 응답 데이터:', data);

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
 * @returns 바닥 경계 좌표
 */
export const analyzeRoomStructure = async (
  imageFile: File
): Promise<{ status: string; floor_boundary: Array<{ x: number; y: number }> }> => {
  // Mock API 사용
  if (API_CONFIG.USE_MOCK_API) {
    console.log('🔄 Using Mock API for room analysis');
    await new Promise(r => setTimeout(r, 1500)); // 1.5초 대기
    return {
      status: "success",
      floor_boundary: MOCK_FLOOR_BOUNDARY,
    };
  }

  // 실제 API 호출
  const formData = new FormData();
  formData.append('file', imageFile);

  try {
    console.log('API 요청 시작: /analyze-image');

    const response = await fetch(`${API_CONFIG.BASE_URL}/analyze-image`, {
      method: 'POST',
      body: formData,
    });

    console.log('API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 에러 응답:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('방 구조 분석 완료:', data);

    return data;
  } catch (error) {
    console.error('analyzeRoomStructure Error:', error);
    throw error;
  }
};


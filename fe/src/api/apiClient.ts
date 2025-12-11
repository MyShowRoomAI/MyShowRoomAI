import { FurnitureItem } from '@/data/mockData';
import { API_CONFIG } from '@/config/api';
import { fetchAiDesignResponse as fetchMockResponse } from './mockApi';

// Type Definitions for API Response
export interface AiResponse {
  ai_message: string;
  new_furniture_items: FurnitureItem[];
}

// 백엔드 API 응답 타입 (실제 명세 기준)
interface BackendApiResponse {
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
    // 디버깅: 요청 정보 출력
    console.log('API 요청 시작:', {
      url: `${API_CONFIG.BASE_URL}/consult`,
      imageFileName: imageFile.name,
      imageSize: imageFile.size,
      prompt: prompt.substring(0, 50) + '...',
    });

    // /consult 엔드포인트 호출
    const response = await fetch(`${API_CONFIG.BASE_URL}/consult`, {
      method: 'POST',
      body: formData,
      // Content-Type은 자동으로 multipart/form-data로 설정됨
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
    // item_details는 단일 객체이므로 배열로 변환
    return {
      ai_message: data.reason, // reason -> ai_message
      new_furniture_items: [
        {
          id: data.item_details.id,
          name: data.item_details.name,
          price: '', // 백엔드에서 제공하지 않음
          image: '🛋️', // 임시 아이콘
          model_url: data.item_details.glb_url,
          desc: data.position_suggestion,
        }
      ],
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
      floor_boundary: [
        { x: 100, y: 800 },
        { x: 300, y: 750 },
        { x: 500, y: 720 },
        { x: 700, y: 750 },
        { x: 900, y: 800 },
      ]
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


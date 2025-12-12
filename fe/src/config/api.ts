// API 설정
export const API_CONFIG = {
  // 개발 중 Mock API 사용 여부 (서버 꺼져있을 때 true로 설정)
  USE_MOCK_API: false, // ← 서버 켜지면 false로 변경
  
  // Next.js 프록시를 통해 CORS 우회
  // /api/* 요청은 next.config.ts의 rewrites 설정에 의해 실제 백엔드로 전달됨
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
} as const;

// 개발 환경에서 API URL 확인
if (typeof window !== 'undefined') {
  console.log('🔧 API Configuration:', {
    USE_MOCK_API: API_CONFIG.USE_MOCK_API,
    BASE_URL: API_CONFIG.BASE_URL,
    PROXY_TARGET: process.env.NEXT_PUBLIC_API_BASE_URL,
    isConfigured: !!process.env.NEXT_PUBLIC_API_BASE_URL,
  });
}




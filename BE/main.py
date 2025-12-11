import os
import io
import json
from typing import List, Dict
from dotenv import load_dotenv

import google.generativeai as genai
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

# 환경변수 로드
load_dotenv()

# ==========================================
# 1. 환경 설정
# ==========================================
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("⚠️ GOOGLE_API_KEY가 .env 파일에 설정되지 않았습니다.")

# Gemini 라이브러리 설정
genai.configure(api_key=GOOGLE_API_KEY)

# ==========================================
# 2. FastAPI 앱 초기화 및 CORS 설정
# ==========================================
app = FastAPI(
    title="MyShow Room AI Backend",
    description="Gemini를 활용한 AI 인테리어 컨설팅 서버",
    version="1.0.0"
)

# CORS 설정: 프론트엔드(Next.js) 접근 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용 (프로덕션에서는 특정 도메인으로 제한)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 3. Gemini 모델 로드
# ==========================================
# JSON 포맷 강제를 위한 설정
generation_config = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "application/json",  # JSON 응답 강제
}

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash-lite",  # User requested model
    generation_config=generation_config,
)

# ==========================================
# 4. 엔드포인트 로직
# ==========================================

@app.get("/")
def read_root():
    """헬스체크 엔드포인트"""
    return {
        "status": "ok",
        "message": "MyShow Room AI Server Running",
        "version": "1.0.0"
    }


@app.post("/consult")
async def consult_design(
    image: UploadFile = File(..., description="방 파노라마 사진"),
    user_prompt: str = Form(..., description="사용자 요청 (예: 북유럽 스타일로 꾸며줘)")
):
    """
    이미지와 사용자 프롬프트를 받아 Gemini로 가구 추천을 받는 엔드포인트
    
    Args:
        image: 업로드된 방 사진
        user_prompt: 사용자의 인테리어 요청
        
    Returns:
        JSON 배열: 추천 가구 5개 (recommendation, reason, generation_prompt)
    """
    try:
        # 4-1. 이미지 읽기 및 변환
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents))
        
        # 이미지 포맷 검증
        if pil_image.format not in ["JPEG", "PNG", "WEBP"]:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 이미지 포맷입니다: {pil_image.format}. JPEG, PNG, WEBP만 지원됩니다."
            )

        # 4-2. 시스템 프롬프트 (가구 5개 추천 요청)
        system_instruction = """
        You are a professional interior designer with expertise in various design styles.
        Analyze this room image and the user's request carefully.
        Recommend exactly 5 furniture items that best match the room's style, tone, and the user's preferences.
        
        Consider:
        - The room's current color palette and lighting
        - The available space and layout
        - The user's requested style
        - Harmony between existing elements and new furniture
        
        You MUST return the result in the following JSON structure (an array of 5 objects):
        [
            {
              "recommendation": "Furniture Name in Korean (e.g., 베이지색 1인용 소파)",
              "reason": "Detailed reason why it fits in Korean (e.g., 방의 따뜻한 톤과 조화를 이루며 공간을 효율적으로 활용할 수 있습니다)",
              "generation_prompt": "High quality 3d rendering of [Furniture Name], [Material], [Style], white background, studio lighting"
            }
        ]
        
        IMPORTANT: 
        - Return ONLY valid JSON, no additional text
        - Exactly 5 items
        - All text in Korean except generation_prompt
        - generation_prompt must be in English and suitable for 3D rendering
        """

        # 4-3. 모델 추론
        prompt = [
            system_instruction,
            f"User Request: {user_prompt}",
            pil_image
        ]
        
        response = model.generate_content(prompt)

        # 4-4. 응답 파싱 및 반환
        try:
            parsed_response = json.loads(response.text)
            
            # 응답 검증: 5개의 항목이 있는지 확인
            if not isinstance(parsed_response, list):
                raise ValueError("응답이 배열 형태가 아닙니다.")
            
            if len(parsed_response) != 5:
                print(f"⚠️ 경고: Gemini가 {len(parsed_response)}개의 항목을 반환했습니다. (기대값: 5개)")
            
            # 각 항목의 필수 필드 검증
            required_fields = ["recommendation", "reason", "generation_prompt"]
            for idx, item in enumerate(parsed_response):
                for field in required_fields:
                    if field not in item:
                        raise ValueError(f"항목 {idx}에 필수 필드 '{field}'가 없습니다.")
            
            return JSONResponse(content=parsed_response)
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 에러: {str(e)}")
            print(f"원본 응답: {response.text}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Failed to parse Gemini response",
                    "detail": str(e),
                    "raw_response": response.text
                }
            )
        except ValueError as e:
            print(f"❌ 응답 검증 에러: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Invalid response format",
                    "detail": str(e),
                    "raw_response": response.text
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 서버 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

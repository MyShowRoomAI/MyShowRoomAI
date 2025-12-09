# MyShow Room AI - Backend

FastAPI 기반 백엔드 서버로, Gemini Vision API를 활용하여 방 사진을 분석하고 인테리어 가구를 추천합니다.

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 가상환경 생성 (선택사항)
python -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate  # Windows

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고, Gemini API 키를 입력합니다.

```bash
cp .env.example .env
```

`.env` 파일 내용:
```
GOOGLE_API_KEY=your_actual_gemini_api_key_here
```

**Gemini API 키 발급:**
- [Google AI Studio](https://makersuite.google.com/app/apikey)에서 무료로 발급 가능

### 3. 서버 실행

```bash
# 개발 모드 (자동 재시작)
uvicorn main:app --reload

# 또는
python main.py
```

서버가 `http://127.0.0.1:8000`에서 실행됩니다.

## 📡 API 엔드포인트

### `GET /`
헬스체크 엔드포인트

**응답 예시:**
```json
{
  "status": "ok",
  "message": "MyShow Room AI Server Running",
  "version": "1.0.0"
}
```

### `POST /consult`
방 사진과 사용자 요청을 받아 가구 추천을 반환합니다.

**요청:**
- `image` (file): 방 파노라마 사진 (JPEG, PNG, WEBP)
- `user_prompt` (form): 사용자 요청 (예: "북유럽 스타일로 꾸며줘")

**응답 예시:**
```json
[
  {
    "recommendation": "베이지색 1인용 소파",
    "reason": "방의 따뜻한 톤과 조화를 이루며 공간을 효율적으로 활용할 수 있습니다",
    "generation_prompt": "High quality 3d rendering of beige single sofa, fabric material, Nordic style, white background, studio lighting"
  },
  // ... 4개 더
]
```

## 🧪 테스트

### cURL을 사용한 테스트

```bash
# 헬스체크
curl http://127.0.0.1:8000/

# 가구 추천 (테스트 이미지 필요)
curl -X POST http://127.0.0.1:8000/consult \
  -F "image=@test_room.jpg" \
  -F "user_prompt=북유럽 스타일로 꾸며줘"
```

### 브라우저에서 테스트

FastAPI는 자동으로 Swagger UI를 제공합니다:
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

## 🏗️ 프로젝트 구조

```
BE/
├── main.py              # FastAPI 애플리케이션
├── requirements.txt     # Python 의존성
├── .env.example        # 환경변수 템플릿
├── .env                # 실제 환경변수 (git에서 제외)
└── README.md           # 이 파일
```

## 🔧 기술 스택

- **FastAPI**: 고성능 웹 프레임워크
- **Uvicorn**: ASGI 서버
- **Google Generative AI**: Gemini API 클라이언트
- **Pillow**: 이미지 처리
- **Pydantic**: 데이터 검증

## 📝 주요 기능

- ✅ **CORS 설정**: 프론트엔드(Next.js)와의 통신 지원
- ✅ **비동기 처리**: `async/await`를 통한 효율적인 요청 처리
- ✅ **JSON 강제**: Gemini 응답을 JSON 포맷으로 강제
- ✅ **에러 핸들링**: 상세한 에러 메시지 및 검증
- ✅ **자동 문서화**: Swagger UI 제공

## 🚨 문제 해결

### 1. `GOOGLE_API_KEY` 에러
```
ValueError: ⚠️ GOOGLE_API_KEY가 .env 파일에 설정되지 않았습니다.
```
→ `.env` 파일에 유효한 Gemini API 키를 입력했는지 확인하세요.

### 2. CORS 에러
프론트엔드에서 요청 시 CORS 에러가 발생하면, `main.py`의 `allow_origins`를 확인하세요.
현재는 모든 도메인(`*`)을 허용하고 있습니다.

### 3. 이미지 포맷 에러
지원하는 포맷: JPEG, PNG, WEBP

## 📦 Colab 변환

로컬에서 테스트 완료 후, `colab/` 폴더의 가이드를 참고하여 Google Colab에서 실행할 수 있습니다.

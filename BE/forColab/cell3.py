import os
import io
import json
import asyncio
from typing import List, Dict, Optional, Any
from google import genai
from google.genai import types
import google.generativeai as genai_legacy
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image
import cv2
import numpy as np
import torch
from segment_anything import sam_model_registry, SamPredictor
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
from pydantic import BaseModel
from google.colab import userdata

# ==========================================
# [TODO] API Key 설정
# 해커톤 제출용이라면 여기에 직접 키를 넣는 것이 심사위원에게 편합니다.
# 보안이 중요하다면 userdata 방식을 유지하세요.
# GOOGLE_API_KEY = "YOUR_DEMO_KEY_HERE"
# NGROK_AUTH_TOKEN = "YOUR_DEMO_TOKEN_HERE"
# ==========================================
try:
    if 'GOOGLE_API_KEY' not in locals():
        GOOGLE_API_KEY = userdata.get('GOOGLE_API_KEY')
    if 'NGROK_AUTH_TOKEN' not in locals():
        NGROK_AUTH_TOKEN = userdata.get('NGROK_AUTH_TOKEN')
except:
    pass # 키가 직접 입력된 경우

client = genai.Client(api_key=GOOGLE_API_KEY)
genai_legacy.configure(api_key=GOOGLE_API_KEY)

# Init Models
device = "cuda" if torch.cuda.is_available() else "cpu"

# SAM
sam = sam_model_registry["vit_h"](checkpoint="sam_vit_h_4b8939.pth")
sam.to(device=device)
predictor = SamPredictor(sam)

# SegFormer
processor = SegformerImageProcessor.from_pretrained("nvidia/segformer-b0-finetuned-ade-512-512")
seg_model = SegformerForSemanticSegmentation.from_pretrained("nvidia/segformer-b0-finetuned-ade-512-512")
seg_model.to(device)
seg_model.eval()

# App Setup
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/3d_models", StaticFiles(directory="/content/3d_models"), name="3d_models")

# DB Load
if os.path.exists("furniture_db.json"):
    with open("furniture_db.json", "r", encoding="utf-8") as f:
        FURNITURE_DB = json.load(f)
else:
    FURNITURE_DB = []

# Logic
class FloorPoint(BaseModel): x: int; y: int
class RemoveObjectResponse(BaseModel): status: str; image: str; mask_image: str
class AnalyzeImageResponse(BaseModel): status: str; mask_image: str
class ConsultItem(BaseModel): selected_id: str; reason: str; position_suggestion: str; item_details: Optional[Dict[str, Any]] = None

def detect_floor_boundary(image_bgr) -> str:
    """
    SegFormer(ADE20K)를 사용하여 '바닥(Floor)' 영역을 찾고, 
    해당 영역을 (0, 255, 0, 100) 색상으로 칠한 투명 PNG 이미지(Base64)를 반환합니다.
    """
    if seg_model is None: 
        print("⚠️ SegModel is None")
        # 실패 시 빈 이미지(또는 투명 이미지) 리턴? 일단 빈 문자열
        return ""
    
    try:
        original_h, original_w = image_bgr.shape[:2]
        
        # 1. Resize for Inference
        TARGET_SIZE = 800 
        scale = TARGET_SIZE / max(original_h, original_w)
        new_h, new_w = int(original_h * scale), int(original_w * scale)
        
        resized_img = cv2.resize(image_bgr, (new_w, new_h))
        image_rgb = cv2.cvtColor(resized_img, cv2.COLOR_BGR2RGB)
        
        # 2. Inference
        inputs = processor(images=image_rgb, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = seg_model(**inputs)
            
        # 3. Post-processing (Upsample logits to resized_img size)
        logits = outputs.logits
        upsampled_logits = torch.nn.functional.interpolate(
            logits, size=(new_h, new_w), mode="bilinear", align_corners=False
        )
        
        pred_seg = upsampled_logits.argmax(dim=1)[0].cpu().numpy()
        
        # 4. Floor Mask Enriched (Class Union)
        # ADE20K Index: 3=Floor, 9=Carpet, 27=Mat, 29=Rug
        floor_classes = [3, 9, 27, 29]
        floor_mask_binary = np.isin(pred_seg, floor_classes).astype(np.uint8) # 0 or 1
        
        # [Panorama Specific] Force Bottom Edge (5%)
        force_bottom_h = int(new_h * 0.95)
        floor_mask_binary[force_bottom_h:, :] = 1

        # 5. Morphology (Closing) - 구멍 메우기
        kernel_size = 50 
        kernel = np.ones((kernel_size, kernel_size), np.uint8)
        floor_mask_binary = cv2.morphologyEx(floor_mask_binary, cv2.MORPH_CLOSE, kernel)
        
        # [NEW] Fill Internal Holes (Furniture)
        # Find external contours and fill them. This creates a solid mask without holes.
        # [Fix] Use bitwise_or to ensure we don't lose the original mask if contours fail
        contours, hierarchy = cv2.findContours(floor_mask_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            print(f"✅ Found {len(contours)} contours for floor filling")
            filled_mask = np.zeros_like(floor_mask_binary)
            cv2.drawContours(filled_mask, contours, -1, 1, thickness=cv2.FILLED)
            floor_mask_binary = cv2.bitwise_or(floor_mask_binary, filled_mask)
        else:
            print("⚠️ No contours found for floor, keeping original")

        # 6. Create RGBA Image
        # Base: All transparent (0,0,0,0)
        rgba_image = np.zeros((new_h, new_w, 4), dtype=np.uint8)
        
        # Floor Area: Green (0, 255, 0) with Alpha 200
        # channel顺序: B, G, R, A
        
        # Mask condition
        mask_bool = (floor_mask_binary >= 1)
        
        rgba_image[mask_bool, 0] = 0   # Blue
        rgba_image[mask_bool, 1] = 255 # Green
        rgba_image[mask_bool, 2] = 0   # Red
        rgba_image[mask_bool, 3] = 200 # Alpha
        
        # 7. Encode to PNG (Preserves Alpha)
        is_success, buffer = cv2.imencode(".png", rgba_image)
        if not is_success:
            print("❌ Failed to encode png")
            return ""
            
        # 8. Base64 Encode
        import base64
        mask_base64 = base64.b64encode(buffer).decode("utf-8")
        
        print("✅ Floor Mask Generated (Base64)")
        return f"data:image/png;base64,{mask_base64}"
            
    except Exception as e:
        print(f"⚠️ Floor detection failed: {e}")
        return ""

def process_removal(image_bytes: bytes, x: int, y: int):
    """
    [Balanced Inpainting]
    1024px(저화질) 대신 2048px(중화질)로 리사이징하여 디테일을 살리고,
    복원 시 LANCZOS4 알고리즘을 사용하여 선명도를 극대화합니다.
    """
    if predictor is None:
        raise ValueError("SAM model is not loaded")
    
    # 1. Image Conversion
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None: raise ValueError("Invalid image")
        
    original_h, original_w = image.shape[:2]
    
    # =========================================================
    # [수정] 해상도를 2048px로 상향 조정 (화질 개선)
    # =========================================================
    PROCESS_WIDTH = 2048  # 기존 1024 -> 2048로 변경
    
    if original_w > PROCESS_WIDTH:
        scale = PROCESS_WIDTH / original_w
        new_h = int(original_h * scale)
        # 축소할 때는 INTER_AREA가 가장 깨끗하게 줄어듭니다.
        input_image = cv2.resize(image, (PROCESS_WIDTH, new_h), interpolation=cv2.INTER_AREA)
        input_x = int(x * scale)
        input_y = int(y * scale)
    else:
        input_image = image
        input_x = x
        input_y = y
        
    image_rgb = cv2.cvtColor(input_image, cv2.COLOR_BGR2RGB)
    proc_h, proc_w = image_rgb.shape[:2]

    # 2. SAM Prediction
    predictor.set_image(image_rgb)
    input_point = np.array([[input_x, input_y]])
    input_label = np.array([1]) 
    masks, scores, logits = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=True, 
    )
    
    # 3. Mask Processing
    combined_mask = np.logical_or(masks[0], masks[1])
    combined_mask = np.logical_or(combined_mask, masks[2])
    mask_uint8 = (combined_mask * 255).astype(np.uint8)
    
    # Dilate
    kernel = np.ones((10,10), np.uint8)
    mask_dilated = cv2.dilate(mask_uint8, kernel, iterations=3)

    # 4. Call Gemini
    print(f"🚀 Calling Gemini (2.5 Flash Image) - 2K Mode ({proc_w}x{proc_h})")
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            image_with_mask = image_rgb.copy()
            image_with_mask[mask_dilated > 0] = [255, 0, 0] # Red
            
            prompt_text = (
                "The area marked in RED is an unwanted object. "
                "Remove it completely and fill the space with a realistic wooden floor and white wall to match the room. "
                "The result should look like a high-quality real estate photo. "
                "Make sure the lighting and shadows are consistent with the rest of the room."
            )
            
            response = client.models.generate_content(
                model='gemini-2.5-flash-image',
                contents=[
                    types.Part.from_bytes(
                        data=cv2.imencode('.jpg', image_with_mask)[1].tobytes(),
                        mime_type="image/jpeg"
                    ),
                    prompt_text
                ],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    candidate_count=1,
                ),
            )
            
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                        img_data = part.inline_data.data
                        nparr_res = np.frombuffer(img_data, np.uint8)
                        
                        # Gemini 결과 (2048px)
                        res_img = cv2.imdecode(nparr_res, cv2.IMREAD_COLOR)
                        if res_img is None: continue
                        
                        # (A) Histogram Matching (색감 보정)
                        # 결과물이 미세하게 사이즈가 다를 수 있으므로 리사이징 먼저 수행
                        res_img_resized = cv2.resize(res_img, (proc_w, proc_h))
                        
                        try:
                            from skimage import exposure
                            matched = exposure.match_histograms(res_img_resized, input_image, channel_axis=-1)
                            gemini_final_mid = matched.astype(np.uint8)
                        except:
                            gemini_final_mid = res_img_resized
                            
                        # =========================================================
                        # 🧬 [Hybrid Compositing] 고품질 복원
                        # =========================================================
                        
                        # 1. Upscaling (LANCZOS4 사용 - 선명도 유지에 유리)
                        if original_w != proc_w:
                            gemini_upscaled = cv2.resize(gemini_final_mid, (original_w, original_h), interpolation=cv2.INTER_LANCZOS4)
                            mask_upscaled = cv2.resize(mask_dilated, (original_w, original_h), interpolation=cv2.INTER_NEAREST)
                        else:
                            gemini_upscaled = gemini_final_mid
                            mask_upscaled = mask_dilated

                        # 2. Feathering
                        mask_float = mask_upscaled.astype(np.float32) / 255.0
                        mask_blurred = cv2.GaussianBlur(mask_float, (21, 21), 0)
                        if len(mask_blurred.shape) == 2:
                            mask_blurred = np.dstack([mask_blurred]*3)

                        # 3. Final Composite
                        original_bgr = image.astype(np.float32)
                        gemini_float = gemini_upscaled.astype(np.float32)
                        
                        final_composite = (gemini_float * mask_blurred) + \
                                          (original_bgr * (1.0 - mask_blurred))
                        
                        print(f"✅ Inpainting Complete! (2048px -> Upscaled)")
                        return final_composite.astype(np.uint8)
                        
            raise ValueError("No image part in Gemini response")
 
        except Exception as e:
            print(f"Attempt {attempt+1} failed: {e}")
            if "429" in str(e) or "quota" in str(e).lower():
                print("⏳ Quota exceeded. Waiting 40s...")
                time.sleep(40) # 2048px은 1024px보다 토큰을 더 쓰므로 대기시간을 조금 늘림
            elif attempt < max_retries - 1:
                time.sleep(5)
            else:
                raise e

@app.post("/remove-object", response_model=RemoveObjectResponse)
async def remove_object(file: UploadFile = File(...), x: int = Form(...), y: int = Form(...)):
    res = process_removal(await file.read(), x, y)
    mask_img = detect_floor_boundary(res)
    is_success, buffer = cv2.imencode(".jpg", res, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    
    import base64
    img_base64 = base64.b64encode(buffer).decode("utf-8")
    
    return RemoveObjectResponse(
        status="success",
        image=f"data:image/jpeg;base64,{img_base64}",
        mask_image=mask_img
    )

@app.post("/analyze-image", response_model=AnalyzeImageResponse)
async def analyze_image(file: UploadFile = File(...)):
    """
    [Phase 9.1] 이미지 구조 분석 (원본 좌표 반환)
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None: raise HTTPException(status_code=400, detail="Invalid image")
            
        # Run Detection (Auto-Scaling included)
        mask_img = detect_floor_boundary(image)
        print(f"✅ Floor Mask Created")
        
        return AnalyzeImageResponse(
            status="success",
            mask_image=mask_img
        )
        
    except Exception as e:
        print(f"Error analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MyShow Room AI Server Running (Submission Version)"}

@app.post("/consult", response_model=List[ConsultItem])
async def consult(request: Request, image: UploadFile = File(...), user_prompt: str = Form(None)):
    """
    [Phase 10] RAG-based Furniture Recommendation (Top 5)
    """
    # 1. Handle Optional Prompt
    if not user_prompt:
        user_prompt = "Recommend furniture that best matches this room's style."
    print(f"🔍 Consult Request: {user_prompt}")

    # 2. Prepare Image
    try:
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)) # PIL image is not directly used but good for validation
    except Exception as e:
        print(f"❌ Image Read Error: {e}")
        raise HTTPException(status_code=400, detail="Invalid Image")

    # 3. Prepare Inventory
    if not FURNITURE_DB:
        print("⚠️ Furniture DB is empty!")
    
    inventory_text = "\n".join([
        f"- ID: {item['id']}, Name: {item['name']}, Style: {item.get('style_tags', [])}, Has3D: {'Yes' if item.get('glb_url') else 'No'}"
        for item in FURNITURE_DB
    ])

    # 4. Construct Prompt
    system_instruction = f"""
    You are an expert interior design curator using the Amazon Berkeley Objects dataset.
    
    [Your Goal]
    Analyze the user's room image and their request ("{user_prompt}").
    Then, SELECT THE TOP 5 BEST ITEMS from the [Inventory List] below that match the request and fit the room style.
    
    [Inventory List]
    {inventory_text}
    
    [Output Format]
    Return ONLY a JSON Array of objects. No markdown.
    [
        {{
            "selected_id": "Item ID from list",
            "reason": "Reason in Korean",
            "position_suggestion": "Placement suggestion"
        }},
        ...
    ]
    """

    # 5. Call Gemini
    # Use 'client' (New SDK) for consistency with remove-object
    try:
        # Create Prompt (Text + Image)
        prompt_parts = [
            types.Part.from_bytes(data=contents, mime_type="image/jpeg"),
            system_instruction
        ]
        
        # Call Gemini (User requested gemini-2.5-flash-lite)
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite', 
            contents=prompt_parts
        )
        
        print(f"✅ Gemini Response: {response.text[:100]}...")
        
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_text)
        if isinstance(data, dict): data = [data]
        
    except Exception as e:
        print(f"❌ Gemini/Parse Error: {e}")
        data = [] # Return empty list on failure to prevent crash

    # 6. Enrich Results
    results = []
    for d in data:
        selected_id = d.get('selected_id')
        item = next((i for i in FURNITURE_DB if i['id'] == selected_id), None)
        
        if item:
            det = item.copy()
            # 3D Model URL Logic
            if det.get('glb_url') and not det['glb_url'].startswith("http"):
                base_url = str(request.base_url).rstrip("/")
                path = det['glb_url']
                if not path.startswith("/"): path = "/" + path
                det['glb_url'] = f"{base_url}{path}"
            
            results.append(ConsultItem(
                selected_id=selected_id,
                reason=d.get('reason', ""),
                position_suggestion=d.get("position_suggestion", ""),
                item_details=det
            ))
            
    return results
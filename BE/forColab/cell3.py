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
class RemoveObjectResponse(BaseModel): status: str; image: str; floor_boundary: List[FloorPoint]
class AnalyzeImageResponse(BaseModel): status: str; floor_boundary: List[FloorPoint]
class ConsultItem(BaseModel): selected_id: str; reason: str; position_suggestion: str; item_details: Optional[Dict[str, Any]] = None

def detect_floor_boundary(image_bgr):
    """
    SegFormer(ADE20K)를 사용하여 '바닥(Floor)' 영역을 찾고, 그 경계선 좌표를 Polygon으로 반환합니다.
    (OOM 방지를 위해 800px 리사이징 후 처리 -> 좌표 복원)
    
    [개선 사항]
    1. Class Union: Floor(3) + Carpet(9) + Rug(29) + Mat(27)
    2. Force Bottom: 파노라마 특성상 하단 5%는 무조건 바닥으로 간주
    3. Morphology: (50,50) Large Kernel Closing으로 가구에 의한 구멍 메움
    4. External Contour: 내부 구멍 무시하고 전체 방의 바닥 윤곽선만 추출
    """
    if seg_model is None: 
        print("⚠️ SegModel is None")
        return []
    
    try:
        original_h, original_w = image_bgr.shape[:2]
        
        # 1. Resize for Inference (Memory Save & Detail Balance)
        TARGET_SIZE = 800 
        scale = TARGET_SIZE / max(original_h, original_w)
        new_h, new_w = int(original_h * scale), int(original_w * scale)
        
        resized_img = cv2.resize(image_bgr, (new_w, new_h))
        image_rgb = cv2.cvtColor(resized_img, cv2.COLOR_BGR2RGB)
        
        # 2. Inference
        inputs = processor(images=image_rgb, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = seg_model(**inputs)
            
        # 3. Post-processing (Low Res)
        logits = outputs.logits
        # Logits를 리사이즈된 크기(new_h, new_w)까지만 복원
        upsampled_logits = torch.nn.functional.interpolate(
            logits, size=(new_h, new_w), mode="bilinear", align_corners=False
        )
        
        pred_seg = upsampled_logits.argmax(dim=1)[0].cpu().numpy()
        
        # 4. Floor Mask Enriched (Class Union)
        # ADE20K Index: 3=Floor, 9=Carpet, 27=Mat, 29=Rug
        floor_classes = [3, 9, 27, 29]
        floor_mask = np.isin(pred_seg, floor_classes).astype(np.uint8) * 255
        
        # [Panorama Specific] Force Bottom Edge
        # 이미지 하단 5%는 무조건 바닥이라고 가정 (끊김 방지)
        force_bottom_h = int(new_h * 0.95)
        floor_mask[force_bottom_h:, :] = 255

        # 5. Morphological Closing (Aggressive)
        # 가구(침대, 책상 등)로 인해 끊긴 바닥을 하나로 잇기 위해 매우 큰 커널 사용
        kernel_size = 50 # 800px 기준 50px면 꽤 큼
        kernel = np.ones((kernel_size, kernel_size), np.uint8)
        floor_mask = cv2.morphologyEx(floor_mask, cv2.MORPH_CLOSE, kernel)
        
        # 6. Find Contours
        # RETR_EXTERNAL: 구멍(가구)는 무시하고 가장 바깥쪽 외곽선만 땀
        contours, _ = cv2.findContours(floor_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            print("❌ No contour found")
            return []
            
        largest_contour = max(contours, key=cv2.contourArea)
        
        # 7. Approx Poly (Straight Lines)
        # 0.005: 적당히 직선화하여 깔끔한 바닥 폴리곤 생성
        epsilon = 0.005 * cv2.arcLength(largest_contour, True)
        approx_curve = cv2.approxPolyDP(largest_contour, epsilon, True)
        
        # 8. Restore Coordinates to Original Scale
        points = []
        for p in approx_curve:
            px_low = p[0][0]
            py_low = p[0][1]
            
            # Scale Back
            px_orig = int(px_low / scale)
            py_orig = int(py_low / scale)
            
            # Clamp
            px_orig = max(0, min(original_w-1, px_orig))
            py_orig = max(0, min(original_h-1, py_orig))
            
            points.append({'x': px_orig, 'y': py_orig})
            
        print(f"✅ Floor Boundary: {len(points)} points")
        return points
            
    except Exception as e:
        print(f"⚠️ Floor detection failed: {e}")
        # import traceback
        # traceback.print_exc()
        return []

def process_removal(image_bytes: bytes, x: int, y: int):
    """
    [Phase 9] SAM(Mask) + Gemini Image Edit API
    Returns: (Restored Image BGR, Original Shape)
    """
    if predictor is None:
        raise ValueError("SAM model is not loaded")
    # 1. Image Conversion
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid image")
        
    original_h, original_w = image.shape[:2]
    
    # Resize to 1024 for Processing (Speed/Stability)
    PROCESS_WIDTH = 1024
    if original_w > PROCESS_WIDTH:
        scale = PROCESS_WIDTH / original_w
        new_h = int(original_h * scale)
        input_image = cv2.resize(image, (PROCESS_WIDTH, new_h))
        # 좌표도 줄여야 함
        input_x = int(x * scale)
        input_y = int(y * scale)
    else:
        input_image = image
        input_x = x
        input_y = y
        
    image_rgb = cv2.cvtColor(input_image, cv2.COLOR_BGR2RGB)
    proc_h, proc_w = image_rgb.shape[:2]
    # 2. SAM Prediction (Click)
    predictor.set_image(image_rgb)
    input_point = np.array([[input_x, input_y]])
    input_label = np.array([1]) 
    masks, scores, logits = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=True, 
    )
    
    # 3. Union Mask Strategy
    combined_mask = np.logical_or(masks[0], masks[1])
    combined_mask = np.logical_or(combined_mask, masks[2])
    mask_uint8 = (combined_mask * 255).astype(np.uint8)
    
    # 4. Dilate Mask
    kernel = np.ones((10,10), np.uint8)
    mask_dilated = cv2.dilate(mask_uint8, kernel, iterations=3)

    # 5. Call Gemini Image Edit API
    print("🚀 Calling Gemini (2.5 Flash Image) API for Removal...")
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Red Mask Overlay for Prompting
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
            # Response Parsing
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                        img_data = part.inline_data.data
                        nparr_res = np.frombuffer(img_data, np.uint8)
                        res_img = cv2.imdecode(nparr_res, cv2.IMREAD_COLOR)
                        if res_img is None: continue
                        
                        # (A) Histogram Matching (Color Correction)
                        res_img_resized = cv2.resize(res_img, (proc_w, proc_h))
                        try:
                            from skimage import exposure
                            matched = exposure.match_histograms(res_img_resized, input_image, channel_axis=-1)
                            final_proc_img = matched.astype(np.uint8)
                        except:
                            final_proc_img = res_img_resized
                            
                        # (B) Restore to Original Size
                        if original_w != proc_w:
                            final_full_img = cv2.resize(final_proc_img, (original_w, original_h), interpolation=cv2.INTER_CUBIC)
                            print(f"🔄 Restored Image to Original Size: {original_w}x{original_h}")
                            return final_full_img
                        else:
                            return final_proc_img
                        
            raise ValueError("No image part in Gemini response")
 
        except Exception as e:
            print(f"Attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1: time.sleep(10)
            else: raise e

@app.post("/remove-object", response_model=RemoveObjectResponse)
async def remove_object(file: UploadFile = File(...), x: int = Form(...), y: int = Form(...)):
    res = process_removal(await file.read(), x, y)
    floor_coords = detect_floor_boundary(res)
    is_success, buffer = cv2.imencode(".jpg", res, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    
    import base64
    img_base64 = base64.b64encode(buffer).decode("utf-8")
    
    return RemoveObjectResponse(
        status="success",
        image=f"data:image/jpeg;base64,{img_base64}",
        floor_boundary=floor_coords
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
        floor_coords = detect_floor_boundary(image)
        print(f"✅ Floor Coords Found: {len(floor_coords)} points (Scaled to Original)")
        
        return AnalyzeImageResponse(
            status="success",
            floor_boundary=floor_coords
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
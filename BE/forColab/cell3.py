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
# [수정] SegFormer 대신 BEiT (MIT License) 임포트
from transformers import BeitImageProcessor, BeitForSemanticSegmentation
from segment_anything import sam_model_registry, SamPredictor
from pydantic import BaseModel
from google.colab import userdata

# ==========================================
# [TODO] API Key 설정
# ==========================================
try:
    if 'GOOGLE_API_KEY' not in locals():
        GOOGLE_API_KEY = userdata.get('GOOGLE_API_KEY')
    if 'NGROK_AUTH_TOKEN' not in locals():
        NGROK_AUTH_TOKEN = userdata.get('NGROK_AUTH_TOKEN')
except:
    pass 

client = genai.Client(api_key=GOOGLE_API_KEY)
genai_legacy.configure(api_key=GOOGLE_API_KEY)

# Init Models
device = "cuda" if torch.cuda.is_available() else "cpu"

# 1. SAM (Segment Anything Model) - Apache 2.0 (OSI Approved)
sam = sam_model_registry["vit_h"](checkpoint="sam_vit_h_4b8939.pth")
sam.to(device=device)
predictor = SamPredictor(sam)

# 2. [교체 완료] Semantic Segmentation Model
# Model: Microsoft BEiT (Base)
# License: MIT License (OSI Approved, Commercial Use OK)
# Dataset: ADE20K (Contains Floor, Rug, Carpet classes)
print("⏳ Loading Microsoft BEiT Model (MIT License)...")
processor = BeitImageProcessor.from_pretrained("microsoft/beit-base-finetuned-ade-640-640")
seg_model = BeitForSemanticSegmentation.from_pretrained("microsoft/beit-base-finetuned-ade-640-640")
seg_model.to(device)
seg_model.eval()
print("✅ BEiT Model Loaded.")

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

# Pydantic Models
class FloorPoint(BaseModel): x: int; y: int
class RemoveObjectResponse(BaseModel): status: str; image: str; mask_image: str
class AnalyzeImageResponse(BaseModel): status: str; mask_image: str
class ConsultItem(BaseModel): selected_id: str; reason: str; position_suggestion: str; item_details: Optional[Dict[str, Any]] = None

def detect_floor_boundary(image_bgr) -> str:
    """
    Microsoft BEiT(ADE20K)를 사용하여 '바닥(Floor)' 영역을 찾고, 
    해당 영역을 마스크 이미지(Base64)로 반환합니다.
    """
    if seg_model is None: 
        print("⚠️ SegModel is None")
        return ""
    
    try:
        original_h, original_w = image_bgr.shape[:2]
        
        # 1. Resize logic for BEiT
        # BEiT는 내부적으로 리사이징을 처리하지만, 너무 큰 이미지는 속도를 위해 적절히 줄여서 넣습니다.
        TARGET_SIZE = 800 
        scale = TARGET_SIZE / max(original_h, original_w)
        new_h, new_w = int(original_h * scale), int(original_w * scale)
        
        resized_img = cv2.resize(image_bgr, (new_w, new_h))
        image_rgb = cv2.cvtColor(resized_img, cv2.COLOR_BGR2RGB)
        
        # 2. Inference
        inputs = processor(images=image_rgb, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = seg_model(**inputs)
            
        # 3. Post-processing
        # BEiT의 출력 로직은 SegFormer와 거의 동일합니다.
        logits = outputs.logits
        # 이미지가 리사이즈된 크기(new_h, new_w)로 업샘플링
        upsampled_logits = torch.nn.functional.interpolate(
            logits, size=(new_h, new_w), mode="bilinear", align_corners=False
        )
        
        pred_seg = upsampled_logits.argmax(dim=1)[0].cpu().numpy()
        
        # 4. Floor Mask Enriched (Class Union)
        # ADE20K Index는 SegFormer와 동일합니다 (표준 데이터셋 인덱스 사용)
        # 3=Floor, 9=Carpet, 27=Mat, 29=Rug
        floor_classes = [3, 9, 27, 29]
        floor_mask_binary = np.isin(pred_seg, floor_classes).astype(np.uint8) # 0 or 1
        
        # [Panorama Specific] Force Bottom Edge (5%)
        # 파노라마 하단부는 무조건 바닥이라는 가정
        force_bottom_h = int(new_h * 0.95)
        floor_mask_binary[force_bottom_h:, :] = 1

        # 5. Morphology (Closing) - 구멍 메우기
        kernel_size = 50 
        kernel = np.ones((kernel_size, kernel_size), np.uint8)
        floor_mask_binary = cv2.morphologyEx(floor_mask_binary, cv2.MORPH_CLOSE, kernel)
        
        # Fill Internal Holes (가구 자리 메우기)
        contours, hierarchy = cv2.findContours(floor_mask_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            filled_mask = np.zeros_like(floor_mask_binary)
            cv2.drawContours(filled_mask, contours, -1, 1, thickness=cv2.FILLED)
            floor_mask_binary = cv2.bitwise_or(floor_mask_binary, filled_mask)

        # 6. Create RGBA Image
        rgba_image = np.zeros((new_h, new_w, 4), dtype=np.uint8)
        
        # Mask condition
        mask_bool = (floor_mask_binary >= 1)
        
        # Green with Alpha 200
        rgba_image[mask_bool, 0] = 0   # B
        rgba_image[mask_bool, 1] = 255 # G
        rgba_image[mask_bool, 2] = 0   # R
        rgba_image[mask_bool, 3] = 200 # A
        
        # 7. Encode
        is_success, buffer = cv2.imencode(".png", rgba_image)
        if not is_success: return ""
            
        import base64
        mask_base64 = base64.b64encode(buffer).decode("utf-8")
        
        print("✅ Floor Mask Generated (BEiT)")
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
    
    # 2048px Resizing Strategy
    PROCESS_WIDTH = 2048
    
    if original_w > PROCESS_WIDTH:
        scale = PROCESS_WIDTH / original_w
        new_h = int(original_h * scale)
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
                        
                        # Gemini Result
                        res_img = cv2.imdecode(nparr_res, cv2.IMREAD_COLOR)
                        if res_img is None: continue
                        
                        # (A) Histogram Matching
                        res_img_resized = cv2.resize(res_img, (proc_w, proc_h))
                        
                        try:
                            from skimage import exposure
                            matched = exposure.match_histograms(res_img_resized, input_image, channel_axis=-1)
                            gemini_final_mid = matched.astype(np.uint8)
                        except:
                            gemini_final_mid = res_img_resized
                            
                        # (B) Upscaling & Compositing
                        if original_w != proc_w:
                            gemini_upscaled = cv2.resize(gemini_final_mid, (original_w, original_h), interpolation=cv2.INTER_LANCZOS4)
                            mask_upscaled = cv2.resize(mask_dilated, (original_w, original_h), interpolation=cv2.INTER_NEAREST)
                        else:
                            gemini_upscaled = gemini_final_mid
                            mask_upscaled = mask_dilated

                        # Feathering
                        mask_float = mask_upscaled.astype(np.float32) / 255.0
                        mask_blurred = cv2.GaussianBlur(mask_float, (21, 21), 0)
                        if len(mask_blurred.shape) == 2:
                            mask_blurred = np.dstack([mask_blurred]*3)

                        # Final Composite
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
                time.sleep(40)
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
    [Phase 9.1] 이미지 구조 분석 (MIT License Model)
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None: raise HTTPException(status_code=400, detail="Invalid image")
            
        # Run Detection (BEiT)
        mask_img = detect_floor_boundary(image)
        print(f"✅ Floor Mask Created (License Safe)")
        
        return AnalyzeImageResponse(
            status="success",
            mask_image=mask_img
        )
        
    except Exception as e:
        print(f"Error analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MyShow Room AI Server Running (OSI Compliant)"}

@app.post("/consult", response_model=List[ConsultItem])
async def consult(request: Request, image: UploadFile = File(...), user_prompt: str = Form(None)):
    """
    [Phase 10] RAG-based Furniture Recommendation
    """
    if not user_prompt:
        user_prompt = "Recommend furniture that best matches this room's style."
    print(f"🔍 Consult Request: {user_prompt}")

    try:
        contents = await image.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid Image")

    if not FURNITURE_DB:
        print("⚠️ Furniture DB is empty!")
    
    inventory_text = "\n".join([
        f"- ID: {item['id']}, Name: {item['name']}, Style: {item.get('style_tags', [])}, Has3D: {'Yes' if item.get('glb_url') else 'No'}"
        for item in FURNITURE_DB
    ])

    system_instruction = f"""
    You are an expert interior design curator using the Amazon Berkeley Objects dataset.
    Analyze the user's room image and their request ("{user_prompt}").
    Then, SELECT THE TOP 5 BEST ITEMS from the [Inventory List] below.
    
    [Inventory List]
    {inventory_text}
    
    [Output Format]
    Return ONLY a JSON Array of objects. No markdown.
    [
        {{
            "selected_id": "Item ID",
            "reason": "Reason in Korean",
            "position_suggestion": "Placement suggestion"
        }}
    ]
    """

    try:
        prompt_parts = [
            types.Part.from_bytes(data=contents, mime_type="image/jpeg"),
            system_instruction
        ]
        
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite', 
            contents=prompt_parts
        )
        
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_text)
        if isinstance(data, dict): data = [data]
        
    except Exception as e:
        print(f"❌ Gemini/Parse Error: {e}")
        data = []

    results = []
    for d in data:
        selected_id = d.get('selected_id')
        item = next((i for i in FURNITURE_DB if i['id'] == selected_id), None)
        
        if item:
            det = item.copy()
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
import json
import os
import random
import boto3
from botocore import UNSIGNED
from botocore.config import Config

# ==========================================
# [TODO] 여기에 본인의 GitHub Raw URL을 붙여넣으세요!
# 예: "https://raw.githubusercontent.com/YourName/Repo/main/BE/furniture_3d_only.json"
GITHUB_RAW_URL = "https://raw.githubusercontent.com/MyShowRoomAI/MyShowRoomAI/refs/heads/main/BE/furniture_3d_only.json" 
# ==========================================

# 1. Download Metadata from GitHub
print(f"📥 Downloading metadata from {GITHUB_RAW_URL}...")
!wget -q {GITHUB_RAW_URL} -O furniture_3d_only.json

if not os.path.exists("furniture_3d_only.json"):
    print("❌ Error: Failed to download json. Check the URL.")
else:
    print("✅ Metadata downloaded.")

# 2. Download 3D Models (Transient Storage)
# Colab의 임시 저장소(/content)를 사용합니다.
MODEL_DIR = "/content/3d_models"
os.makedirs(MODEL_DIR, exist_ok=True)

TARGET_CATEGORIES = ['SOFA', 'CHAIR', 'TABLE', 'LAMP', 'DESK', 'SHELF', 'BED']
s3 = boto3.client('s3', region_name='us-east-1', config=Config(signature_version=UNSIGNED))
BUCKET_NAME = "amazon-berkeley-objects"

def download_s3_glb(s3_client, model_id, local_path):
    if os.path.exists(local_path): return True
    suffix = model_id[-1]
    keys = [
        f"3dmodels/original/{suffix}/{model_id}.glb",
        f"3dmodels/glb/{suffix}/{model_id}.glb",
        f"3dmodels/original/{model_id}.glb" 
    ]
    for key in keys:
        try:
            s3_client.download_file(BUCKET_NAME, key, local_path)
            return True
        except: continue
    return False

# Load & Download Top 50 Items
FURNITURE_DB = []
if os.path.exists("furniture_3d_only.json"):
    with open("furniture_3d_only.json", 'r', encoding='utf-8') as f:
        all_items = json.load(f)
    
    random.shuffle(all_items)
    print("🚀 Downloading 3D Models from S3...")
    
    count = 0
    for obj in all_items:
        if count >= 30: break # 데모용으로 30개만 다운로드 (속도 최적화)
        
        cat_str = str(obj.get('category', '')).upper() + " " + str(obj.get('keywords', '')).upper()
        if not any(c in cat_str for c in TARGET_CATEGORIES): continue
        
        model_id = obj.get('3dmodel_id')
        if not model_id: continue
        
        filename = f"{model_id}.glb"
        local_path = os.path.join(MODEL_DIR, filename)
        
        if download_s3_glb(s3, model_id, local_path):
            obj['glb_url'] = f"/3d_models/{filename}"
            FURNITURE_DB.append(obj)
            count += 1
            print(".", end="")
            
    print(f"\n✅ Ready: {len(FURNITURE_DB)} items loaded.")
    
    # Save prepared DB
    with open("furniture_db.json", "w", encoding='utf-8') as f:
        json.dump(FURNITURE_DB, f, indent=2, ensure_ascii=False)
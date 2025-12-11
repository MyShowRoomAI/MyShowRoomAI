# 1. Install Dependencies
!pip install -q fastapi uvicorn pyngrok python-multipart opencv-python-headless pillow boto3 google-genai google-generativeai segment-anything transformers accelerate nest_asyncio pydantic numpy scikit-image

# 2. Download SAM Weights (ViT-H)
import os
SAM_CHECKPOINT = "sam_vit_h_4b8939.pth" 
if not os.path.exists(SAM_CHECKPOINT):
    print("Downloading SAM weights...")
    !wget -q https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth
    print("Download complete!")
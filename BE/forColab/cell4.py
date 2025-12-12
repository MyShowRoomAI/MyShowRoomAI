import nest_asyncio
import uvicorn
import subprocess
import time
import os
from google.colab import userdata

# 1. 기존 프로세스 정리 (포트 충돌 방지)
nest_asyncio.apply()
try:
    os.system("fuser -k 8000/tcp")
    time.sleep(1)
except:
    pass

print("🚀 Setting up Cloudflare Tunnel...")

# 2. Cloudflared 설치 (Linux용)
if not os.path.exists("cloudflared"):
    !curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    !dpkg -i cloudflared.deb
    print("✅ Cloudflared Installed.")

# 3. Tunnel 실행 (고정 URL)
try:
    # Secrets에서 토큰 가져오기
    tunnel_token = userdata.get('CLOUDFLARE_TUNNEL_TOKEN')
    
    # 백그라운드에서 터널 실행
    # --no-autoupdate: Colab 환경에서 업데이트 방지
    tunnel_cmd = f"cloudflared tunnel run --token {tunnel_token} > /dev/null 2>&1 &"
    subprocess.Popen(tunnel_cmd, shell=True)
    
    print("⏳ Waiting for tunnel to establish...")
    time.sleep(5) # 터널 연결 대기
    
    # [중요] 여기에 본인이 설정한 도메인을 적어주세요 (로그 출력용)
    MY_DOMAIN = "https://api.y-minion.link" 
    print(f"\n🎉 Server will be available at: {MY_DOMAIN}")
    print(f"   (URL is FIXED. You don't need to change frontend code!)")

except Exception as e:
    print(f"❌ Tunnel Error: {e}")
    print("⚠️ 'CLOUDFLARE_TUNNEL_TOKEN'이 Secrets에 있는지 확인하세요.")

# 4. FastAPI 서버 실행
print("\n🔥 Starting Uvicorn Server...")
config = uvicorn.Config(app, host="0.0.0.0", port=8000, proxy_headers=True, forwarded_allow_ips="*")
server = uvicorn.Server(config)
await server.serve()
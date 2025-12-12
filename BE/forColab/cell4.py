import nest_asyncio
import uvicorn
from pyngrok import ngrok
import time

nest_asyncio.apply()
try: os.system("fuser -k 8000/tcp"); time.sleep(1)
except: pass

# ngrok
if 'NGROK_AUTH_TOKEN' in locals() and NGROK_AUTH_TOKEN:
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)
ngrok.kill(); time.sleep(1)

try:
    print(f"🚀 Public URL: {ngrok.connect(8000)}")
except Exception as e:
    print(f"⚠️ Ngrok Error: {e}")

# Run
config = uvicorn.Config(app, host="0.0.0.0", port=8000, proxy_headers=True, forwarded_allow_ips="*")
server = uvicorn.Server(config)
await server.serve()
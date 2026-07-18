import requests
import sys
import os

# 设置控制台编码
if sys.platform == 'win32':
    os.system('chcp 65001 >nul 2>&1')
    sys.stdout.reconfigure(encoding='utf-8')

GITHUB_API = "https://api.github.com"
REPO = "1263478456/schedule-generator"

def create_secret(token, name, value):
    """创建 GitHub Secret"""
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # 获取公钥
    resp = requests.get(f"{GITHUB_API}/repos/{REPO}/actions/secrets/public-key", headers=headers)
    if resp.status_code != 200:
        print(f"[ERROR] Failed to get public key: {resp.status_code}")
        return False
    
    public_key = resp.json()
    
    # 使用公钥加密 secret（简化版本，实际需要 sodium 加密）
    # 这里我们直接使用 API 设置
    data = {
        "encrypted_value": value,  # 实际需要加密
        "key_id": public_key["key_id"]
    }
    
    resp = requests.put(
        f"{GITHUB_API}/repos/{REPO}/actions/secrets/{name}",
        headers=headers,
        json=data
    )
    
    if resp.status_code == 204:
        print(f"[OK] Secret '{name}' created successfully")
        return True
    else:
        print(f"[WARN] Secret '{name}' creation response: {resp.status_code}")
        return False

if __name__ == "__main__":
    token = sys.argv[1] if len(sys.argv) > 1 else None
    
    if not token:
        print("Usage: python setup_secrets.py <github_token>")
        sys.exit(1)
    
    # 注意：由于加密需要 sodium 库，这里我们提示用户手动设置
    print("GitHub Secrets 需要手动设置（由于加密限制）")
    print()
    print("请访问: https://github.com/1263478456/schedule-generator/settings/secrets/actions")
    print()
    print("添加以下 Secrets:")
    print("1. DOCKERHUB_USERNAME - 你的 Docker Hub 用户名")
    print("2. DOCKERHUB_TOKEN - 你的 Docker Hub Access Token")

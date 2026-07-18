import requests
import json
import sys
import os

# 设置控制台编码为 UTF-8
if sys.platform == 'win32':
    os.system('chcp 65001 >nul 2>&1')
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# GitHub API URL
GITHUB_API = "https://api.github.com"

# 仓库信息
REPO_NAME = "schedule-generator"
REPO_DESC = "智能排班表生成器 - 轻松管理员工排班，一键导出A4打印排班表"

def create_repository(token=None):
    """创建 GitHub 仓库"""
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
    }
    
    if token:
        headers["Authorization"] = f"token {token}"
    
    data = {
        "name": REPO_NAME,
        "description": REPO_DESC,
        "auto_init": False,
        "private": False
    }
    
    try:
        response = requests.post(
            f"{GITHUB_API}/user/repos",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 201:
            result = response.json()
            print("[OK] Repository created successfully!")
            print(f"Name: {result['name']}")
            print(f"URL: {result['html_url']}")
            print(f"Clone: {result['clone_url']}")
            return result
        elif response.status_code == 422:
            print(f"[WARN] Repository may already exist: {REPO_NAME}")
            print(f"   Check https://github.com/{REPO_NAME}")
            return None
        else:
            print(f"[ERROR] Creation failed: {response.status_code}")
            print(f"   Message: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Network error: {e}")
        return None

if __name__ == "__main__":
    # 尝试从命令行参数获取 token
    token = sys.argv[1] if len(sys.argv) > 1 else None
    
    if not token:
        print("Usage: python create_github_repo.py <github_token>")
        print("Or run without arguments to try git credential manager")
    
    create_repository(token)

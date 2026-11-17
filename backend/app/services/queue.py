# 렌더링 작업을 Cloud Tasks 대기열에 넣는다. 큐 등록 코드는 이 파일에만 둔다.
# Firebase 함수(functions/)와 맞춘 페이로드: { jobId, listingId, useType, mode, prompt, productIds }
# FIREBASE_SERVICE_ACCOUNT가 없으면 등록하지 않고 False를 돌려준다. 호출한 쪽이 가짜 진행으로 대신한다.
import base64
import json
import time

import httpx
import jwt

from app.config import env

TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPE = "https://www.googleapis.com/auth/cloud-tasks"


def is_configured() -> bool:
    return bool(env("FIREBASE_SERVICE_ACCOUNT"))


def make_payload(job: dict) -> dict:
    return {
        "jobId": job["id"],
        "listingId": job["listingId"],
        "useType": job["useType"],
        "mode": job["mode"],
        "prompt": job["prompt"],
        "productIds": job["productIds"],
    }


def _access_token(account: dict) -> str:
    """서비스 계정 키로 서명한 JWT를 액세스 토큰으로 바꾼다."""
    now = int(time.time())
    claims = {"iss": account["client_email"], "scope": SCOPE, "aud": TOKEN_URL, "iat": now, "exp": now + 3600}
    assertion = jwt.encode(claims, account["private_key"], algorithm="RS256")
    response = httpx.post(
        TOKEN_URL,
        data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def enqueue_render_job(job: dict) -> bool:
    """대기열에 작업을 넣고 True를 돌려준다. 설정이 없으면 False."""
    if not is_configured():
        return False
    account = json.loads(env("FIREBASE_SERVICE_ACCOUNT"))
    location = env("CLOUD_TASKS_LOCATION") or "asia-northeast3"
    queue = env("CLOUD_TASKS_QUEUE") or "render-jobs"
    worker_url = env("RENDER_WORKER_URL")  # 렌더링 Firebase 함수의 주소
    if not worker_url:
        raise RuntimeError("RENDER_WORKER_URL이 필요합니다.")

    parent = f"projects/{account['project_id']}/locations/{location}/queues/{queue}"
    body = base64.b64encode(json.dumps(make_payload(job)).encode()).decode()
    task = {
        "httpRequest": {
            "httpMethod": "POST",
            "url": worker_url,
            "headers": {"Content-Type": "application/json"},
            "body": body,
            # 렌더링 함수는 외부 호출을 막아 두었다. 큐가 이 서비스 계정의 신분증(OIDC 토큰)을 붙여서 부른다.
            # 이 계정에 함수(Cloud Run)를 호출할 권한이 있어야 한다. docs/DEPLOY.md 참고.
            "oidcToken": {"serviceAccountEmail": account["client_email"], "audience": worker_url},
        }
    }
    response = httpx.post(
        f"https://cloudtasks.googleapis.com/v2/{parent}/tasks",
        json={"task": task},
        headers={"Authorization": f"Bearer {_access_token(account)}"},
        timeout=15,
    )
    response.raise_for_status()
    return True

# 렌더링 작업 진행. 대기열이 설정돼 있으면 Firebase 함수가 render_jobs 행을 갱신한다.
# 설정이 없으면 요청 시각을 기준으로 FAKE_SECONDS 뒤에 끝나는 가짜 진행을 계산한다.
# 서버리스에서 백그라운드 스레드가 끊겨도 되도록 GET 요청 때마다 시간으로 계산한다.
from datetime import datetime, timezone

from app.services import queue

FAKE_SECONDS = 1.5


def result_render_id(job: dict) -> str:
    base = f"r-{job['listingId']}-{job['useType']}"
    return f"{base}-products" if job["mode"] == "products" else base


def fake_progress(created_at: datetime, now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    elapsed = (now - created_at).total_seconds()
    return max(0, min(100, int(elapsed / FAKE_SECONDS * 100)))


def advance_fake_job(job: dict, now: datetime | None = None) -> dict:
    """가짜 진행을 반영한 작업 필드를 돌려준다. 이미 끝났거나 실패한 작업은 그대로 둔다."""
    if queue.is_configured() or job["status"] in ("done", "failed"):
        return {}
    progress = fake_progress(job["createdAt"], now)
    if progress >= 100:
        return {"status": "done", "progress": 100, "resultRenderId": result_render_id(job)}
    return {"status": "running" if progress > 0 else "queued", "progress": progress}


def build_products_render(job: dict) -> dict:
    """상품 먼저 방식의 가짜 결과. 고른 상품마다 태그를 하나씩 단다."""
    tags = [
        {"n": number, "x": 20 + (number * 13) % 60, "y": 30 + (number * 9) % 40, "productId": item["productId"], "qty": item["qty"], "similarity": None}
        for number, item in enumerate(job["items"], start=1)
    ]
    return {
        "id": result_render_id(job),
        "listingId": job["listingId"],
        "useType": job["useType"],
        "mode": "products",
        "style": None,
        "imageUrl": f"/images/render-{job['useType']}.jpg",
        "tags": tags,
        "checks": [f"고른 상품 {len(tags)}종으로 배치"],
    }

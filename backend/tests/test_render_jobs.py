# 렌더링 작업: 생성, 가짜 진행, 상품 먼저 방식 검증
from datetime import datetime, timedelta, timezone

from app import data
from app.services import queue, render_jobs


def create(client, **extra):
    body = {"listingId": "seongsu-2ga-1f", "useType": "cafe", "mode": "text", "prompt": "따뜻한 느낌", **extra}
    return client.post("/render-jobs", json=body)


def started_ago(job_id, seconds):
    """1.5초를 기다리는 대신 작업 생성 시각을 과거로 돌린다."""
    data.get_store().jobs[job_id]["createdAt"] = datetime.now(timezone.utc) - timedelta(seconds=seconds)


def test_text_job_runs_and_finishes(client):
    created = create(client)
    assert created.status_code == 201
    job = created.json()
    assert job["status"] == "queued" and job["progress"] == 0 and job["mode"] == "text"

    started_ago(job["id"], 0.75)
    middle = client.get(f"/render-jobs/{job['id']}").json()
    assert middle["status"] == "running" and 0 < middle["progress"] < 100

    started_ago(job["id"], 5)
    done = client.get(f"/render-jobs/{job['id']}").json()
    assert done["status"] == "done" and done["progress"] == 100
    assert done["resultRenderId"] == "r-seongsu-2ga-1f-cafe"
    assert client.get(f"/quotes/draft?renderId={done['resultRenderId']}").status_code == 200


def test_products_job_uses_chosen_items(client):
    items = [{"productId": "chair-oak", "qty": 4}, {"productId": "table-2p", "qty": 2}]
    job = create(client, mode="products", items=items).json()
    assert job["productIds"] == ["chair-oak", "table-2p"]
    started_ago(job["id"], 5)
    done = client.get(f"/render-jobs/{job['id']}").json()
    assert done["resultRenderId"] == "r-seongsu-2ga-1f-cafe-products"
    quote = client.get(f"/quotes/draft?renderId={done['resultRenderId']}").json()
    assert quote["groups"][0]["sum"] == 89000 * 4 + 190000 * 2


def test_products_job_validation(client):
    assert create(client, mode="products").status_code == 422
    assert create(client, mode="products", items=[{"productId": "nope", "qty": 1}]).status_code == 422
    for product in data.get_store().products:
        if product["id"] == "chair-oak":
            for link in product["links"]:
                link["status"] = "dead"
    assert create(client, mode="products", items=[{"productId": "chair-oak", "qty": 1}]).status_code == 422
    assert create(client, listingId="none").status_code == 404


def test_other_user_cannot_read_job(client):
    job = create(client).json()
    assert client.get(f"/render-jobs/{job['id']}", headers={"X-Demo-User": "someone-else"}).status_code == 404


def test_queue_payload_matches_function_contract():
    job = {"id": "j1", "listingId": "l1", "useType": "cafe", "mode": "products", "prompt": "p", "productIds": ["a"]}
    assert queue.make_payload(job) == {
        "jobId": "j1", "listingId": "l1", "useType": "cafe", "mode": "products", "prompt": "p", "productIds": ["a"],
    }
    assert queue.enqueue_render_job(job) is False  # 설정이 없으면 등록하지 않는다


def test_fake_progress_bounds():
    start = datetime.now(timezone.utc)
    assert render_jobs.fake_progress(start, start) == 0
    assert render_jobs.fake_progress(start, start + timedelta(seconds=100)) == 100

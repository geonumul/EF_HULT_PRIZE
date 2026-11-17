# 렌더링 작업 만들기와 진행 조회. 작업 계약은 docs/API.md 를 따른다.
from fastapi import APIRouter, Depends, HTTPException

from app import seed_data
from app.auth import User, current_user
from app.data import get_store
from app.schemas import RenderJobCreate
from app.services import queue, render_jobs

router = APIRouter()


def public_job(job: dict) -> dict:
    return {
        "id": job["id"],
        "status": job["status"],
        "progress": job["progress"],
        "mode": job["mode"],
        "listingId": job["listingId"],
        "useType": job["useType"],
        "prompt": job["prompt"],
        "productIds": job["productIds"],
        "resultRenderId": job["resultRenderId"],
        "error": job["error"],
    }


def check_products(items: list) -> None:
    """상품 먼저 방식은 상품이 있고 판매처 링크가 살아 있어야 한다. 링크 없는 상품은 렌더링에 쓰지 않는다."""
    if not items:
        raise HTTPException(status_code=422, detail="상품 먼저 방식은 items가 필요합니다.")
    store = get_store()
    for item in items:
        product = store.get_product(item.product_id)
        if product is None:
            raise HTTPException(status_code=422, detail=f"상품을 찾을 수 없습니다: {item.product_id}")
        if not any(link["status"] == "live" for link in product["links"]):
            raise HTTPException(status_code=422, detail=f"판매처 링크가 없는 상품입니다: {product['name']}")


@router.post("/render-jobs", status_code=201)
def create_render_job(body: RenderJobCreate, user: User = Depends(current_user)):
    store = get_store()
    if store.get_listing(body.listing_id) is None:
        raise HTTPException(status_code=404, detail="공실을 찾을 수 없습니다.")
    if body.mode == "products":
        check_products(body.items)

    items = [{"productId": item.product_id, "qty": item.qty} for item in body.items] if body.mode == "products" else []
    job = store.create_job({
        "userId": user.id,
        "mode": body.mode,
        "listingId": body.listing_id,
        "useType": body.use_type,
        "prompt": body.prompt,
        "productIds": [item["productId"] for item in items],
        "items": items,
    })

    try:
        queue.enqueue_render_job(job)  # 설정이 없으면 건너뛰고, 진행은 GET에서 가짜로 계산한다.
    except Exception as error:
        job = store.update_job(job["id"], {"status": "failed", "error": f"대기열 등록 실패: {error}"})
    return public_job(job)


def finish_fake_render(job: dict) -> None:
    """가짜 진행이 끝나면 결과 렌더링을 준비한다. 이미 있는 기본 렌더링은 그대로 쓴다."""
    store = get_store()
    render_id = render_jobs.result_render_id(job)
    if job["mode"] == "products":
        store.save_render(render_jobs.build_products_render(job))
    elif store.get_render(render_id) is None:
        store.save_render(seed_data.make_render(job["listingId"], job["useType"]))


@router.get("/render-jobs/{job_id}")
def get_render_job(job_id: str, user: User = Depends(current_user)):
    store = get_store()
    job = store.get_job(job_id)
    if job is None or job["userId"] != user.id:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")

    changes = render_jobs.advance_fake_job(job)
    if changes:
        if changes["status"] == "done":
            finish_fake_render(job)
        job = store.update_job(job_id, changes)
    return public_job(job)

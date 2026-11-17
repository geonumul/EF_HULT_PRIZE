# 상품 목록, 파트너 상품 등록, 판매처 링크 클릭 기록과 이동.
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse

from app.auth import User, partner_user
from app.data import get_store
from app.schemas import PartnerProductCreate
from app.services.external import coupang

router = APIRouter()


@router.get("/products")
def list_products(category: str | None = None):
    return get_store().list_products(category)


@router.post("/partner/products", status_code=201)
def create_partner_product(body: PartnerProductCreate, user: User = Depends(partner_user)):
    store = get_store()
    vendor = store.get_vendor_by_owner(user.id, "supplier") or store.get_vendor_by_owner(user.id, "used")
    if vendor is None:
        raise HTTPException(status_code=403, detail="입점한 공급사 계정이 아닙니다.")

    links = []
    for link in body.links:
        item = {"source": link.source, "label": link.label, "url": link.url, "price": link.price}
        if link.source == "coupang":
            item["affiliateUrl"] = coupang.deeplink(link.url)  # 쿠팡 URL을 제휴 URL로 바꾼다
        links.append(item)

    product = {
        "name": body.name,
        "category": body.category,
        "widthMm": body.width_mm,
        "depthMm": body.depth_mm,
        "heightMm": body.height_mm,
        "price": body.price,
        "usedPrice": body.used_price,
        "imageUrl": body.image_url,
        "links": links,
    }
    return store.add_product(vendor["id"], product)


@router.get("/go/{link_id}")
def go_to_seller(link_id: str):
    """클릭을 기록하고 affiliate_url(없으면 url)로 302 이동한다. 수수료 정산 근거가 이 기록이다."""
    store = get_store()
    link = store.get_link(link_id)
    if link is None:
        raise HTTPException(status_code=404, detail="판매처 링크를 찾을 수 없습니다.")
    if link["status"] == "dead":
        raise HTTPException(status_code=410, detail="판매가 끝난 링크입니다.")
    store.record_click(link_id, None)  # 브라우저 이동이라 로그인 정보가 없다. TODO: 로그인 사용자 연결
    return RedirectResponse(link.get("affiliateUrl") or link["url"], status_code=302)

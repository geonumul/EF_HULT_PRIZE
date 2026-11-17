# 견적서 초안, 견적 확정, 주문(결제 승인).
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import User, current_user
from app.data import get_store
from app.schemas import OrderCreate
from app.services import quote as quote_service
from app.services.external import toss

router = APIRouter()


def make_quote(render_id: str, used_product_ids: list[str]) -> dict:
    store = get_store()
    render = store.get_render(render_id)
    if render is None:
        raise HTTPException(status_code=404, detail="렌더링을 찾을 수 없습니다.")
    listing = store.get_listing(render["listingId"])
    products = {product["id"]: product for product in store.list_products()}
    return quote_service.build_quote(render, listing, products, used_product_ids)


def split_ids(text: str) -> list[str]:
    return [part for part in text.split(",") if part]


@router.get("/quotes/draft")
def quote_draft(render_id: str = Query(alias="renderId"), used: str = ""):
    """used는 중고로 바꾼 상품 id를 쉼표로 이은 값이다."""
    return make_quote(render_id, split_ids(used))


@router.post("/quotes/{quote_id}/confirm")
def confirm_quote(quote_id: str, used: str = "", user: User = Depends(current_user)):
    """견적 id는 렌더링 id와 같다. 확정 시점의 금액을 저장한다."""
    used_ids = split_ids(used)
    quote = make_quote(quote_id, used_ids)
    return get_store().save_confirmed_quote(user.id, quote, used_ids)


@router.post("/orders", status_code=201)
def create_order(body: OrderCreate, user: User = Depends(current_user)):
    store = get_store()
    quote = store.get_confirmed_quote(user.id, body.quote_id)
    if quote is None:
        raise HTTPException(status_code=409, detail="확정된 견적이 없습니다. 먼저 견적을 확정하세요.")
    if body.amount != quote["total"]:
        raise HTTPException(status_code=400, detail="결제 금액이 견적 합계와 다릅니다.")
    if store.find_order(body.order_id):
        raise HTTPException(status_code=409, detail="이미 처리된 주문입니다.")

    try:
        payment = toss.confirm_payment(body.payment_key, body.order_id, body.amount)
    except toss.PaymentError as error:
        raise HTTPException(status_code=402, detail=error.message)
    if payment["status"] != "DONE" or payment["totalAmount"] != body.amount:
        raise HTTPException(status_code=402, detail="결제 승인 결과가 올바르지 않습니다.")

    order = store.create_order({
        "userId": user.id,
        "quoteId": body.quote_id,
        "orderId": body.order_id,
        "paymentKey": body.payment_key,
        "amount": body.amount,
        "status": "paid",
    })
    return {
        "id": order["id"],
        "quoteId": body.quote_id,
        "orderId": body.order_id,
        "amount": body.amount,
        "status": "paid",
        "receiptUrl": payment["receiptUrl"],
        "demo": payment["demo"],
        "paidAt": order["paidAt"],
    }

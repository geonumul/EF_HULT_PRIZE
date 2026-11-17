# 철거 견적 추정, 업체 매칭(요청, 견적 비교, 선택), 파트너 쪽 요청 조회와 견적 제출.
from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.auth import User, current_user, partner_user
from app.data import get_store
from app.routers.listings import get_listing_or_404
from app.schemas import AcceptBid, BidCreate, DemolitionRequestCreate, DemolitionScope
from app.services import demolition

router = APIRouter()


def get_own_request(request_id: str, user: User) -> dict:
    request = get_store().get_demolition_request(request_id)
    if request is None or request["userId"] != user.id:
        raise HTTPException(status_code=404, detail="철거 요청을 찾을 수 없습니다.")
    return request


def get_vendor_or_403(user: User) -> dict:
    vendor = get_store().get_vendor_by_owner(user.id, "demolition")
    if vendor is None:
        raise HTTPException(status_code=403, detail="철거 업체 계정이 아닙니다.")
    return vendor


@router.post("/spaces/{space_id}/demolition-estimate")
def demolition_estimate(space_id: str, scope: DemolitionScope = DemolitionScope()):
    listing = get_listing_or_404(space_id)
    return demolition.estimate(listing, scope.model_dump(by_alias=True))


@router.post("/demolition-requests", status_code=201)
def create_demolition_request(body: DemolitionRequestCreate, user: User = Depends(current_user)):
    listing = get_listing_or_404(body.space_id)
    if listing["condition"] == "vacant":
        raise HTTPException(status_code=422, detail="빈 공간은 철거가 필요 없습니다.")
    return get_store().create_demolition_request(user.id, body.space_id, body.scope.model_dump(by_alias=True), body.note)


@router.get("/demolition-requests/{request_id}/bids")
def list_bids(request_id: str, user: User = Depends(current_user)):
    get_own_request(request_id, user)
    return get_store().list_bids(request_id)


@router.post("/demolition-requests/{request_id}/accept")
def accept_bid(request_id: str, body: AcceptBid, user: User = Depends(current_user)):
    request = get_own_request(request_id, user)
    if request["status"] != "open":
        raise HTTPException(status_code=409, detail="이미 업체를 선택한 요청입니다.")
    store = get_store()
    if not any(bid["id"] == body.bid_id for bid in store.list_bids(request_id)):
        raise HTTPException(status_code=404, detail="견적을 찾을 수 없습니다.")
    return store.accept_bid(request_id, body.bid_id)


@router.get("/partner/demolition-requests")
def partner_requests(user: User = Depends(partner_user)):
    vendor = get_vendor_or_403(user)
    store = get_store()
    requests = store.list_requests_for_vendor(vendor["id"])
    for request in requests:
        listing = store.get_listing(request["spaceId"])
        request["listing"] = {"address": listing["address"], "areaM2": listing["areaM2"], "condition": listing["condition"]} if listing else None
        request.pop("userId")  # 요청자의 계정 정보는 업체에 보여주지 않는다
    return requests


@router.post("/partner/demolition-requests/{request_id}/bids", status_code=201)
def submit_bid(request_id: str, body: BidCreate, user: User = Depends(partner_user)):
    vendor = get_vendor_or_403(user)
    store = get_store()
    request = store.get_demolition_request(request_id)
    if request is None or vendor["id"] not in request["vendorIds"]:
        raise HTTPException(status_code=404, detail="철거 요청을 찾을 수 없습니다.")
    if request["status"] != "open":
        raise HTTPException(status_code=409, detail="이미 마감된 요청입니다.")
    if any(bid["vendorId"] == vendor["id"] for bid in store.list_bids(request_id)):
        raise HTTPException(status_code=409, detail="이미 견적을 보냈습니다.")
    try:
        date.fromisoformat(body.start_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="startDate는 YYYY-MM-DD 형식이어야 합니다.")
    return store.add_bid(request_id, vendor["id"], {"amount": body.amount, "startDate": body.start_date, "scopeNote": body.scope_note})

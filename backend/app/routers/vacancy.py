# 공실 후보 조회. 후보는 scripts/find_vacancies.py가 저장한다.
from fastapi import APIRouter, HTTPException, Query

from app.data import get_store
from app.routers.listings import parse_bbox
from app.services.candidate_space import space_from_candidate

router = APIRouter()


@router.get("/vacancy-candidates")
def vacancy_candidates(
    bbox: str | None = Query(None, description="minLng,minLat,maxLng,maxLat"),
    minConfidence: float = Query(0.0, ge=0, le=1),
    limit: int = Query(500, ge=1, le=20000),
):
    """확인 전 공실 후보. 임대 중이라는 뜻이 아니고, 비어 있을 가능성이 있는 상가 층이다."""
    box = parse_bbox(bbox) if bbox else None
    return get_store().list_candidates(box, minConfidence, limit)


@router.get("/vacancy-candidates/{candidate_id}/space")
def candidate_space(candidate_id: str):
    """후보 한 곳을 스튜디오와 견적 화면이 쓰는 공간 정보로 돌려준다. 업종별 판정과 창업비를 계산해 담는다."""
    candidate = get_store().get_candidate(candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="후보를 찾을 수 없습니다")
    return space_from_candidate(candidate)

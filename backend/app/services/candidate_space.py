# 공실 후보 한 곳을 서비스 화면(스튜디오, 견적)이 쓰는 공간 정보로 바꾼다.
# 후보는 건축물대장과 점포 정보로 찾은 것이라 보증금, 월세, 천장 높이, 사진이 없다. 없는 값은 가정값을 쓰고 terms로 알린다.
import re

from app.services import suitability
from app.services.costs import USES, estimate_costs

DEFAULT_AREA_M2 = 40.0  # 층 면적을 모를 때의 가정값
DEFAULT_CEILING_M = 3.0
SPACE_IMAGE_COUNT = 12  # frontend/public/images/spaces/space-01.jpg ~ space-12.jpg
CELL_LAT, CELL_LNG = 0.000125, 0.00015  # 약 14m 칸. 한 칸 안의 건물은 같은 사진을 쓴다.


def image_for(position: dict) -> str:
    """위치에 따라 예시 사진을 고른다. 이웃한 칸은 번호가 달라서 가까운 공간끼리 사진이 겹치지 않는다."""
    row = int(position["lat"] // CELL_LAT)
    col = int(position["lng"] // CELL_LNG)
    number = (row + 3 * col) % SPACE_IMAGE_COUNT + 1
    return f"/images/spaces/space-{number:02d}.jpg"


def building_use_of(candidate: dict) -> str:
    """층별 설명에 '제1종근린생활시설(소매점)'처럼 적혀 있으면 그 분류를, 아니면 층 용도를 쓴다."""
    found = re.search(r"제[12]종\s*근린생활시설", candidate.get("floorDetail") or "")
    if found:
        return "".join(found.group(0).split())
    return candidate.get("floorUse") or ""


def space_from_candidate(candidate: dict) -> dict:
    area = candidate.get("floorAreaM2") or DEFAULT_AREA_M2
    verdicts = {
        row["useType"]: row["verdict"]
        for row in suitability.evaluate_all(building_use_of(candidate), "", area)
        if row["useType"] in USES
    }
    return {
        "id": candidate["id"],
        "tag": f"{candidate['floor']}층 상가",
        "address": candidate["address"].replace("서울특별시 ", ""),
        "nearby": candidate.get("buildingName") or "",
        "areaM2": area,
        "floor": candidate["floor"],
        "ceilingHeightM": DEFAULT_CEILING_M,
        "deposit": 0,
        "rent": 0,
        "terms": "inquiry",  # 임대 조건을 모른다. 화면에는 "임대 조건 문의"로 보여 준다.
        "buildingUse": building_use_of(candidate),
        "condition": "vacant",
        "thumbnail": image_for(candidate["position"]),
        "renderCount": 0,
        "position": candidate["position"],
        "costs": estimate_costs(area),
        "verdicts": verdicts,
    }

# 요청 본문 모양. 필드 이름은 snake_case와 camelCase 둘 다 받는다. (프론트는 camelCase, 결제 쪽은 snake_case)
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

UseType = Literal["cafe", "popup", "pilates", "restaurant", "retail", "service", "office"]
SpaceCondition = Literal["vacant", "has_fixtures", "occupied"]


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class RenderItemIn(ApiModel):
    product_id: str
    qty: int = Field(default=1, ge=1)


class RenderJobCreate(ApiModel):
    listing_id: str
    use_type: UseType
    mode: Literal["text", "products"] = "text"
    prompt: str = ""
    items: list[RenderItemIn] = []  # mode가 products일 때 필수


class OrderCreate(ApiModel):
    quote_id: str  # 견적 id는 렌더링 id와 같다
    payment_key: str = Field(min_length=1, max_length=200)
    order_id: str = Field(pattern=r"^[A-Za-z0-9_=-]{6,64}$")
    amount: int = Field(gt=0)


class PartnerListingCreate(ApiModel):
    address: str
    tag: str = "1층 상가"
    nearby: str = ""
    area_m2: float = Field(gt=0)
    floor: int = 1
    ceiling_height_m: float = Field(default=3.0, gt=0)
    deposit: int = Field(default=0, ge=0)  # 만원
    rent: int = Field(default=0, ge=0)  # 만원
    building_use: str | None = None  # 없으면 건축HUB에서 조회
    condition: SpaceCondition = "vacant"
    thumbnail: str = ""
    lat: float | None = None  # 없으면 카카오 로컬로 주소에서 구한다
    lng: float | None = None


class ProductLinkIn(ApiModel):
    source: Literal["naver", "coupang", "partner", "used"]
    label: str
    url: str
    price: int = Field(gt=0)  # 원


class PartnerProductCreate(ApiModel):
    name: str
    category: str
    width_mm: int = Field(gt=0)
    depth_mm: int = Field(gt=0)
    height_mm: int = Field(gt=0)
    price: int = Field(gt=0)  # 원
    used_price: int | None = Field(default=None, gt=0)
    image_url: str = ""
    links: list[ProductLinkIn] = Field(min_length=1)  # 링크가 없는 상품은 렌더링에 쓰지 않는다


class DemolitionScope(ApiModel):
    ceiling: bool = False
    floor: bool = False
    walls: bool = False
    equipment: bool = False
    signage: bool = False


class DemolitionRequestCreate(ApiModel):
    space_id: str
    scope: DemolitionScope = DemolitionScope()
    note: str = ""


class AcceptBid(ApiModel):
    bid_id: str


class BidCreate(ApiModel):
    amount: int = Field(gt=0)  # 원
    start_date: str  # YYYY-MM-DD
    scope_note: str = ""

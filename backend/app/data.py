# 데이터 접근. 인메모리와 Postgres 두 구현이 같은 메서드를 가진다.
# SUPABASE_DB_URL이 있을 때만 Postgres를 쓰고, 없으면 인메모리 가짜 데이터로 동작한다.
# DB를 쓸지 정하는 분기는 get_store() 한 곳에만 둔다. 라우터는 store의 메서드만 부른다.
# 반환하는 딕셔너리는 프론트 타입(frontend/src/types/index.ts)과 같은 camelCase 모양이다.
import copy
import uuid
from datetime import datetime, timezone

from app.config import env
from app import seed_data


def new_id() -> str:
    return str(uuid.uuid4())


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def in_bbox(listing: dict, bbox: tuple[float, float, float, float]) -> bool:
    min_lng, min_lat, max_lng, max_lat = bbox
    position = listing["position"]
    return min_lng <= position["lng"] <= max_lng and min_lat <= position["lat"] <= max_lat


def cheapest_first(links: list[dict]) -> list[dict]:
    return sorted(links, key=lambda link: link["price"])


class MemoryStore:
    """서버 프로세스 안에 데이터를 둔다. 프로세스가 다시 뜨면 처음 상태로 돌아간다."""

    def __init__(self):
        self.listings = copy.deepcopy(seed_data.LISTINGS)
        self.products = copy.deepcopy(seed_data.PRODUCTS)
        self.renders = {render["id"]: copy.deepcopy(render) for render in seed_data.RENDERS}
        self.vendors = copy.deepcopy(seed_data.VENDORS)
        self.suitability = {}  # space_id -> 판정 목록
        self.clicks = []
        self.jobs = {}
        self.quotes = {}  # (user_id, render_id) -> 확정 견적
        self.orders = {}  # 토스 order_id -> 주문
        self.requests = {}
        self.bids = {}
        self._seed_suitability()

    def _seed_suitability(self):
        # 목 데이터의 판정값을 저장된 판정으로 둔다. 근거 문구는 엔진 결과와 같을 때만 엔진 문구를 쓴다.
        from app.services.suitability import evaluate_use

        for listing in self.listings:
            rows = []
            for use_type, verdict in listing["verdicts"].items():
                engine = evaluate_use(use_type, listing["buildingUse"], "", listing["areaM2"])
                reasons = engine["reasons"] if engine["verdict"] == verdict else ["현장 확인으로 저장된 판정"]
                rows.append({**engine, "verdict": verdict, "reasons": reasons})
            self.suitability[listing["id"]] = rows

    # 공실
    def list_listings(self, bbox=None) -> list[dict]:
        found = [listing for listing in self.listings if bbox is None or in_bbox(listing, bbox)]
        return copy.deepcopy(found)

    def list_candidates(self, bbox=None, min_confidence: float = 0, limit: int = 500) -> list[dict]:
        return []  # 후보는 탐색 도구가 DB에 저장한다. 메모리 모드에는 없다.

    def get_listing(self, listing_id: str) -> dict | None:
        for listing in self.listings:
            if listing["id"] == listing_id:
                return copy.deepcopy(listing)
        return None

    def add_listing(self, owner_id: str, data: dict) -> dict:
        listing = {**data, "id": f"listing-{new_id()[:8]}", "ownerId": owner_id, "renderCount": 0, "verdicts": {}, "costs": {}}
        self.listings.append(listing)
        return copy.deepcopy(listing)

    # 적합성
    def get_suitability(self, space_id: str) -> list[dict]:
        return copy.deepcopy(self.suitability.get(space_id, []))

    def save_suitability(self, space_id: str, rows: list[dict]) -> None:
        self.suitability[space_id] = copy.deepcopy(rows)

    # 상품과 판매처 링크
    def list_products(self, category: str | None = None) -> list[dict]:
        found = [p for p in self.products if category is None or p["category"] == category]
        result = copy.deepcopy(found)
        for product in result:
            product["links"] = cheapest_first(product["links"])
        return result

    def get_product(self, product_id: str) -> dict | None:
        for product in self.list_products():
            if product["id"] == product_id:
                return product
        return None

    def get_link(self, link_id: str) -> dict | None:
        for product in self.products:
            for link in product["links"]:
                if link["id"] == link_id:
                    return copy.deepcopy(link)
        return None

    def add_product(self, vendor_id: str, data: dict) -> dict:
        product_id = f"p-{new_id()[:8]}"
        links = [{**link, "id": f"{product_id}-{number}", "status": "live"} for number, link in enumerate(data["links"], start=1)]
        product = {**data, "id": product_id, "vendorId": vendor_id, "links": links}
        self.products.append(product)
        return copy.deepcopy(product)

    def get_vendor_by_owner(self, owner_id: str, vendor_type: str) -> dict | None:
        for vendor in self.vendors:
            if vendor["ownerId"] == owner_id and vendor["type"] == vendor_type:
                return dict(vendor)
        return None

    def get_vendor(self, vendor_id: str) -> dict | None:
        for vendor in self.vendors:
            if vendor["id"] == vendor_id:
                return dict(vendor)
        return None

    def record_click(self, link_id: str, user_id: str | None) -> None:
        self.clicks.append({"linkId": link_id, "userId": user_id, "clickedAt": now_utc()})

    def count_clicks(self, link_id: str) -> int:
        return sum(1 for click in self.clicks if click["linkId"] == link_id)

    # 렌더링 결과
    def list_renders(self, listing_id: str) -> list[dict]:
        return [copy.deepcopy(r) for r in self.renders.values() if r["listingId"] == listing_id]

    def get_render(self, render_id: str) -> dict | None:
        if render_id in self.renders:
            return copy.deepcopy(self.renders[render_id])
        # 상품 먼저 방식으로 만든 결과가 아직 없으면 기본 렌더링을 복사해 mode만 바꾼다. (프론트 findRender와 같다)
        if render_id.endswith("-products"):
            base = self.renders.get(render_id.removesuffix("-products"))
            if base:
                return {**copy.deepcopy(base), "id": render_id, "mode": "products"}
        return None

    def save_render(self, render: dict) -> None:
        self.renders[render["id"]] = copy.deepcopy(render)

    # 렌더링 작업
    def create_job(self, job: dict) -> dict:
        job = {**job, "id": new_id(), "status": "queued", "progress": 0, "resultRenderId": None, "error": None, "createdAt": now_utc()}
        self.jobs[job["id"]] = job
        return dict(job)

    def get_job(self, job_id: str) -> dict | None:
        job = self.jobs.get(job_id)
        return dict(job) if job else None

    def update_job(self, job_id: str, fields: dict) -> dict:
        self.jobs[job_id].update(fields)
        return dict(self.jobs[job_id])

    # 견적과 주문
    def save_confirmed_quote(self, user_id: str, quote: dict, used_product_ids: list[str]) -> dict:
        saved = {**copy.deepcopy(quote), "status": "confirmed", "usedProductIds": used_product_ids, "confirmedAt": now_utc()}
        self.quotes[(user_id, quote["renderId"])] = saved
        return copy.deepcopy(saved)

    def get_confirmed_quote(self, user_id: str, render_id: str) -> dict | None:
        saved = self.quotes.get((user_id, render_id))
        return copy.deepcopy(saved) if saved else None

    def create_order(self, order: dict) -> dict:
        order = {**order, "id": new_id(), "paidAt": now_utc()}
        self.orders[order["orderId"]] = order
        return dict(order)

    def find_order(self, order_id: str) -> dict | None:
        order = self.orders.get(order_id)
        return dict(order) if order else None

    # 철거 요청과 견적
    def create_demolition_request(self, user_id: str, space_id: str, scope: dict, note: str) -> dict:
        # TODO: 같은 지역 업체만 고른다. 공실에 시군구 정보가 생기면 거른다. 지금은 앞의 3곳이다.
        vendor_ids = [v["id"] for v in self.vendors if v["type"] == "demolition"][:3]
        request = {
            "id": new_id(), "spaceId": space_id, "userId": user_id, "scope": scope, "note": note,
            "vendorIds": vendor_ids, "status": "open", "acceptedBidId": None, "createdAt": now_utc(),
        }
        self.requests[request["id"]] = request
        return copy.deepcopy(request)

    def get_demolition_request(self, request_id: str) -> dict | None:
        request = self.requests.get(request_id)
        return copy.deepcopy(request) if request else None

    def list_requests_for_vendor(self, vendor_id: str) -> list[dict]:
        return [copy.deepcopy(r) for r in self.requests.values() if vendor_id in r["vendorIds"]]

    def add_bid(self, request_id: str, vendor_id: str, data: dict) -> dict:
        vendor = self.get_vendor(vendor_id)
        bid = {
            "id": new_id(), "requestId": request_id, "vendorId": vendor_id, "vendorName": vendor["name"],
            "amount": data["amount"], "startDate": data["startDate"], "scopeNote": data["scopeNote"], "status": "submitted",
        }
        self.bids[bid["id"]] = bid
        return dict(bid)

    def list_bids(self, request_id: str) -> list[dict]:
        found = [dict(b) for b in self.bids.values() if b["requestId"] == request_id]
        return sorted(found, key=lambda bid: bid["amount"])

    def accept_bid(self, request_id: str, bid_id: str) -> dict:
        for bid in self.bids.values():
            if bid["requestId"] == request_id:
                bid["status"] = "accepted" if bid["id"] == bid_id else "rejected"
        self.requests[request_id].update({"status": "accepted", "acceptedBidId": bid_id})
        return copy.deepcopy(self.requests[request_id])


LISTING_SQL = """
select l.id, l.tag, l.address, l.nearby, l.area_m2, l.floor, l.ceiling_h, l.deposit, l.rent,
       l.building_use, l.thumbnail, l.costs,
       ST_Y(l.geom::geometry) as lat, ST_X(l.geom::geometry) as lng,
       coalesce(s.condition, 'vacant') as condition,
       (select count(*) from renders r where r.space_id = l.id) as render_count,
       coalesce((select jsonb_object_agg(su.use_type, su.result) from suitability su where su.space_id = l.id), '{}'::jsonb) as verdicts
from listings l left join spaces s on s.id = l.id
"""


def listing_from_row(row: dict) -> dict:
    return {
        "id": row["id"], "tag": row["tag"], "address": row["address"], "nearby": row["nearby"],
        "areaM2": float(row["area_m2"]), "floor": row["floor"], "ceilingHeightM": float(row["ceiling_h"]),
        "deposit": row["deposit"], "rent": row["rent"], "buildingUse": row["building_use"],
        "condition": row["condition"], "thumbnail": row["thumbnail"], "renderCount": row["render_count"],
        "position": {"lat": row["lat"], "lng": row["lng"]}, "costs": row["costs"], "verdicts": row["verdicts"],
    }


def candidate_from_row(row: dict) -> dict:
    return {
        "id": row["id"], "address": row["address"], "buildingName": row["building_name"], "floor": row["floor"],
        "floorUse": row["floor_use"], "floorDetail": row["floor_detail"],
        "floorAreaM2": float(row["floor_area_m2"]) if row["floor_area_m2"] is not None else None,
        "confidence": float(row["confidence"]), "reasons": list(row["reasons"]), "status": row["status"],
        "storesOnFloor": row["stores_on_floor"], "unknownFloorStores": row["unknown_floor_stores"],
        "position": {"lat": row["lat"], "lng": row["lng"]},
    }


def product_from_row(row: dict, links: list[dict]) -> dict:
    return {
        "id": row["id"], "name": row["name"], "category": row["category"],
        "widthMm": row["width_mm"], "depthMm": row["depth_mm"], "heightMm": row["height_mm"],
        "price": row["price"], "usedPrice": row["used_price"], "imageUrl": row["image_url"],
        "links": links,
    }


def link_from_row(row: dict) -> dict:
    return {
        "id": row["id"], "source": row["source"], "label": row["label"], "url": row["url"],
        "affiliateUrl": row["affiliate_url"], "price": row["price"], "status": row["status"],
    }


def job_from_row(row: dict) -> dict:
    return {
        "id": str(row["id"]), "status": row["status"], "progress": row["progress"], "mode": row["mode"],
        "listingId": row["listing_id"], "useType": row["use_type"], "prompt": row["prompt"],
        "productIds": row["product_ids"], "items": row["items"], "resultRenderId": row["result_render_id"],
        "error": row["error"], "createdAt": row["created_at"], "userId": str(row["user_id"]),
    }


class PostgresStore:
    """Supabase Postgres를 psycopg로 읽고 쓴다. 연결은 호출마다 연다. (서버리스 환경에서 풀을 오래 들고 있지 않는다)
    SUPABASE_DB_URL은 서비스 권한 접속이라 RLS를 지나간다. 소유자 확인은 라우터에서 한다.
    스키마는 supabase/migrations/ 를 따른다."""

    def __init__(self, url: str):
        self.url = url

    def _run(self, sql: str, params=(), one: bool = False):
        import psycopg
        from psycopg.rows import dict_row

        with psycopg.connect(self.url, row_factory=dict_row, autocommit=True) as conn:
            cursor = conn.execute(sql, params)
            if cursor.description is None:
                return None
            return cursor.fetchone() if one else cursor.fetchall()

    # 공실
    def list_listings(self, bbox=None) -> list[dict]:
        if bbox is None:
            rows = self._run(LISTING_SQL)
        else:
            rows = self._run(LISTING_SQL + " where l.geom && ST_MakeEnvelope(%s, %s, %s, %s, 4326)::geography", bbox)
        return [listing_from_row(row) for row in rows]

    def list_candidates(self, bbox=None, min_confidence: float = 0, limit: int = 500) -> list[dict]:
        sql = """select id, address, building_name, floor, floor_use, floor_detail, floor_area_m2, confidence, reasons, status,
                        stores_on_floor, unknown_floor_stores, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng
                 from vacancy_candidates where status <> 'rejected' and confidence >= %s"""
        params: list = [min_confidence]
        if bbox is not None:
            sql += " and geom && ST_MakeEnvelope(%s, %s, %s, %s, 4326)::geography"
            params += list(bbox)
        sql += " order by confidence desc, id limit %s"
        params.append(limit)
        return [candidate_from_row(row) for row in self._run(sql, tuple(params))]

    def get_listing(self, listing_id: str) -> dict | None:
        row = self._run(LISTING_SQL + " where l.id = %s", (listing_id,), one=True)
        return listing_from_row(row) if row else None

    def add_listing(self, owner_id: str, data: dict) -> dict:
        from psycopg.types.json import Jsonb

        listing_id = f"listing-{new_id()[:8]}"
        position = data["position"]
        self._run(
            """insert into listings (id, owner_id, tag, address, nearby, geom, area_m2, floor, ceiling_h,
                                     deposit, rent, building_use, thumbnail, costs)
               values (%s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (listing_id, owner_id, data["tag"], data["address"], data["nearby"], position["lng"], position["lat"],
             data["areaM2"], data["floor"], data["ceilingHeightM"], data["deposit"], data["rent"],
             data["buildingUse"], data["thumbnail"], Jsonb({})),
        )
        self._run("insert into spaces (id, listing_id, condition) values (%s, %s, %s)", (listing_id, listing_id, data["condition"]))
        return self.get_listing(listing_id)

    # 적합성
    def get_suitability(self, space_id: str) -> list[dict]:
        rows = self._run("select use_type, result, reason, extra_cost from suitability where space_id = %s", (space_id,))
        return [
            {"useType": r["use_type"], "verdict": r["result"], "reasons": [r["reason"]] if r["reason"] else [], "extraCostWon": r["extra_cost"]}
            for r in rows
        ]

    def save_suitability(self, space_id: str, rows: list[dict]) -> None:
        for row in rows:
            self._run(
                """insert into suitability (space_id, use_type, result, reason, extra_cost) values (%s, %s, %s, %s, %s)
                   on conflict (space_id, use_type) do update set result = excluded.result, reason = excluded.reason, extra_cost = excluded.extra_cost""",
                (space_id, row["useType"], row["verdict"], " / ".join(row["reasons"]), row["extraCostWon"]),
            )

    # 상품과 판매처 링크
    def _links_by_product(self) -> dict:
        grouped = {}
        for row in self._run("select * from product_links order by price"):
            grouped.setdefault(row["product_id"], []).append(link_from_row(row))
        return grouped

    def list_products(self, category: str | None = None) -> list[dict]:
        if category is None:
            rows = self._run("select * from products order by id")
        else:
            rows = self._run("select * from products where category = %s order by id", (category,))
        links = self._links_by_product()
        return [product_from_row(row, links.get(row["id"], [])) for row in rows]

    def get_product(self, product_id: str) -> dict | None:
        row = self._run("select * from products where id = %s", (product_id,), one=True)
        if not row:
            return None
        links = self._run("select * from product_links where product_id = %s order by price", (product_id,))
        return product_from_row(row, [link_from_row(link) for link in links])

    def get_link(self, link_id: str) -> dict | None:
        row = self._run("select * from product_links where id = %s", (link_id,), one=True)
        return link_from_row(row) if row else None

    def add_product(self, vendor_id: str, data: dict) -> dict:
        product_id = f"p-{new_id()[:8]}"
        self._run(
            """insert into products (id, vendor_id, name, category, width_mm, depth_mm, height_mm, price, used_price, image_url)
               values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (product_id, vendor_id, data["name"], data["category"], data["widthMm"], data["depthMm"],
             data["heightMm"], data["price"], data["usedPrice"], data["imageUrl"]),
        )
        for number, link in enumerate(data["links"], start=1):
            self._run(
                """insert into product_links (id, product_id, source, label, url, affiliate_url, price, status, checked_at)
                   values (%s, %s, %s, %s, %s, %s, %s, 'live', now())""",
                (f"{product_id}-{number}", product_id, link["source"], link["label"], link["url"], link.get("affiliateUrl"), link["price"]),
            )
        return self.get_product(product_id)

    def get_vendor_by_owner(self, owner_id: str, vendor_type: str) -> dict | None:
        row = self._run("select id, name, type from vendors where owner_id = %s and type = %s limit 1", (owner_id, vendor_type), one=True)
        return dict(row) if row else None

    def get_vendor(self, vendor_id: str) -> dict | None:
        row = self._run("select id, name, type from vendors where id = %s", (vendor_id,), one=True)
        return dict(row) if row else None

    def record_click(self, link_id: str, user_id: str | None) -> None:
        self._run("insert into link_clicks (link_id, user_id) values (%s, %s)", (link_id, user_id))

    def count_clicks(self, link_id: str) -> int:
        return self._run("select count(*) as n from link_clicks where link_id = %s", (link_id,), one=True)["n"]

    # 렌더링 결과
    def _render_from_row(self, row: dict) -> dict:
        items = self._run("select * from render_items where render_id = %s order by n", (row["id"],))
        tags = [
            {"n": i["n"], "x": float(i["x"]), "y": float(i["y"]), "productId": i["product_id"], "qty": i["qty"],
             "similarity": float(i["similarity"]) if i["similarity"] is not None else None}
            for i in items
        ]
        return {
            "id": row["id"], "listingId": row["space_id"], "useType": row["use_type"], "mode": row["mode"],
            "style": row["style"], "imageUrl": row["image_url"], "tags": tags, "checks": row["checks"],
        }

    def list_renders(self, listing_id: str) -> list[dict]:
        rows = self._run("select * from renders where space_id = %s order by id", (listing_id,))
        return [self._render_from_row(row) for row in rows]

    def get_render(self, render_id: str) -> dict | None:
        row = self._run("select * from renders where id = %s", (render_id,), one=True)
        return self._render_from_row(row) if row else None

    def save_render(self, render: dict) -> None:
        from psycopg.types.json import Jsonb

        self._run(
            """insert into renders (id, space_id, use_type, style, mode, image_url, checks) values (%s, %s, %s, %s, %s, %s, %s)
               on conflict (id) do update set image_url = excluded.image_url, checks = excluded.checks, mode = excluded.mode""",
            (render["id"], render["listingId"], render["useType"], render.get("style"), render["mode"],
             render["imageUrl"], Jsonb(render["checks"])),
        )
        self._run("delete from render_items where render_id = %s", (render["id"],))
        for tag in render["tags"]:
            self._run(
                "insert into render_items (render_id, product_id, n, x, y, qty, similarity) values (%s, %s, %s, %s, %s, %s, %s)",
                (render["id"], tag["productId"], tag["n"], tag["x"], tag["y"], tag["qty"], tag.get("similarity")),
            )

    # 렌더링 작업
    def create_job(self, job: dict) -> dict:
        from psycopg.types.json import Jsonb

        row = self._run(
            """insert into render_jobs (user_id, mode, listing_id, use_type, prompt, product_ids, items)
               values (%s, %s, %s, %s, %s, %s, %s) returning *""",
            (job["userId"], job["mode"], job["listingId"], job["useType"], job["prompt"], job["productIds"], Jsonb(job["items"])),
            one=True,
        )
        return job_from_row(row)

    def get_job(self, job_id: str) -> dict | None:
        row = self._run("select * from render_jobs where id = %s", (job_id,), one=True)
        return job_from_row(row) if row else None

    def update_job(self, job_id: str, fields: dict) -> dict:
        columns = {"status": "status", "progress": "progress", "resultRenderId": "result_render_id", "error": "error"}
        for key, value in fields.items():
            self._run(f"update render_jobs set {columns[key]} = %s, updated_at = now() where id = %s", (value, job_id))
        return self.get_job(job_id)

    # 견적과 주문
    def save_confirmed_quote(self, user_id: str, quote: dict, used_product_ids: list[str]) -> dict:
        from psycopg.types.json import Jsonb

        self._run(
            """insert into quotes (render_id, user_id, total, breakdown, used_product_ids, status)
               values (%s, %s, %s, %s, %s, 'confirmed')
               on conflict (user_id, render_id) do update set total = excluded.total, breakdown = excluded.breakdown,
                 used_product_ids = excluded.used_product_ids, status = 'confirmed'""",
            (quote["renderId"], user_id, quote["total"], Jsonb(quote), used_product_ids),
        )
        return self.get_confirmed_quote(user_id, quote["renderId"])

    def get_confirmed_quote(self, user_id: str, render_id: str) -> dict | None:
        row = self._run(
            "select breakdown, used_product_ids from quotes where user_id = %s and render_id = %s and status in ('confirmed', 'paid')",
            (user_id, render_id), one=True,
        )
        if not row:
            return None
        return {**row["breakdown"], "status": "confirmed", "usedProductIds": row["used_product_ids"]}

    def create_order(self, order: dict) -> dict:
        row = self._run(
            """insert into orders (quote_id, user_id, order_id, payment_key, amount, status, paid_at)
               values ((select id from quotes where user_id = %s and render_id = %s), %s, %s, %s, %s, 'paid', now()) returning id, paid_at""",
            (order["userId"], order["quoteId"], order["userId"], order["orderId"], order["paymentKey"], order["amount"]),
            one=True,
        )
        self._run("update quotes set status = 'paid' where user_id = %s and render_id = %s", (order["userId"], order["quoteId"]))
        return {**order, "id": str(row["id"]), "paidAt": row["paid_at"]}

    def find_order(self, order_id: str) -> dict | None:
        row = self._run("select id, order_id, payment_key, amount, status, paid_at from orders where order_id = %s", (order_id,), one=True)
        if not row:
            return None
        return {"id": str(row["id"]), "orderId": row["order_id"], "paymentKey": row["payment_key"],
                "amount": row["amount"], "status": row["status"], "paidAt": row["paid_at"]}

    # 철거 요청과 견적
    def _request_from_row(self, row: dict) -> dict:
        return {
            "id": str(row["id"]), "spaceId": row["space_id"], "userId": str(row["user_id"]), "scope": row["scope"],
            "note": row["note"], "vendorIds": row["vendor_ids"], "status": row["status"],
            "acceptedBidId": str(row["accepted_bid_id"]) if row["accepted_bid_id"] else None, "createdAt": row["created_at"],
        }

    def create_demolition_request(self, user_id: str, space_id: str, scope: dict, note: str) -> dict:
        from psycopg.types.json import Jsonb

        # TODO: 같은 지역 업체만 고른다. 공실에 시군구 정보가 생기면 거른다. 지금은 앞의 3곳이다.
        vendors = self._run("select id from vendors where type = 'demolition' order by created_at limit 3")
        row = self._run(
            """insert into demolition_requests (space_id, user_id, scope, note, vendor_ids) values (%s, %s, %s, %s, %s) returning *""",
            (space_id, user_id, Jsonb(scope), note, [v["id"] for v in vendors]), one=True,
        )
        return self._request_from_row(row)

    def get_demolition_request(self, request_id: str) -> dict | None:
        row = self._run("select * from demolition_requests where id = %s", (request_id,), one=True)
        return self._request_from_row(row) if row else None

    def list_requests_for_vendor(self, vendor_id: str) -> list[dict]:
        rows = self._run("select * from demolition_requests where %s = any(vendor_ids) order by created_at desc", (vendor_id,))
        return [self._request_from_row(row) for row in rows]

    def _bid_from_row(self, row: dict) -> dict:
        return {
            "id": str(row["id"]), "requestId": str(row["request_id"]), "vendorId": row["vendor_id"],
            "vendorName": row["vendor_name"], "amount": row["amount"],
            "startDate": row["start_date"].isoformat() if row["start_date"] else None,
            "scopeNote": row["scope_note"], "status": row["status"],
        }

    def add_bid(self, request_id: str, vendor_id: str, data: dict) -> dict:
        row = self._run(
            """insert into demolition_bids (request_id, vendor_id, amount, start_date, scope_note) values (%s, %s, %s, %s, %s)
               returning id""",
            (request_id, vendor_id, data["amount"], data["startDate"], data["scopeNote"]), one=True,
        )
        return next(bid for bid in self.list_bids(request_id) if bid["id"] == str(row["id"]))

    def list_bids(self, request_id: str) -> list[dict]:
        rows = self._run(
            """select b.*, v.name as vendor_name from demolition_bids b join vendors v on v.id = b.vendor_id
               where b.request_id = %s order by b.amount""",
            (request_id,),
        )
        return [self._bid_from_row(row) for row in rows]

    def accept_bid(self, request_id: str, bid_id: str) -> dict:
        self._run("update demolition_bids set status = case when id = %s then 'accepted' else 'rejected' end where request_id = %s", (bid_id, request_id))
        self._run("update demolition_requests set status = 'accepted', accepted_bid_id = %s where id = %s", (bid_id, request_id))
        return self.get_demolition_request(request_id)


_store = None


def get_store():
    global _store
    if _store is None:
        db_url = env("SUPABASE_DB_URL")
        _store = PostgresStore(db_url) if db_url else MemoryStore()
    return _store


def reset_store() -> None:
    """테스트에서 데이터를 처음 상태로 되돌린다."""
    global _store
    _store = None

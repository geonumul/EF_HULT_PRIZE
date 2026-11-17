# 철거 흐름 전체: 추정, 요청, 업체 견적, 비교, 선택
VENDOR_1 = {"X-Demo-User": "demo-vendor-1"}
VENDOR_2 = {"X-Demo-User": "demo-vendor-2"}
VENDOR_3 = {"X-Demo-User": "demo-vendor-3"}


def test_estimate_range(client):
    estimate = client.post("/spaces/seongsu-stn-2f/demolition-estimate", json={"ceiling": True, "floor": True}).json()
    assert estimate["condition"] == "occupied"
    assert estimate["lowWon"] < 105.8 * 120000 < estimate["highWon"]
    assert estimate["scope"]["ceiling"] is True and estimate["scope"]["walls"] is False
    assert any("석면" in line for line in estimate["checklist"])
    partial = client.post("/spaces/ttukseom-1f/demolition-estimate").json()
    assert partial["highWon"] == round(46.2 * 120000 * 0.5 * 1.2)
    assert client.post("/spaces/seongsu-2ga-1f/demolition-estimate").json()["highWon"] == 0  # 빈 공간


def test_full_flow(client):
    # 1. 요청. 빈 공간은 철거가 필요 없다.
    assert client.post("/demolition-requests", json={"spaceId": "seongsu-2ga-1f"}).status_code == 422
    created = client.post("/demolition-requests", json={"spaceId": "seongsu-stn-2f", "scope": {"walls": True}, "note": "주말 작업"})
    assert created.status_code == 201
    request = created.json()
    assert request["status"] == "open" and len(request["vendorIds"]) == 3

    # 2. 업체가 받은 요청을 보고 견적을 낸다.
    received = client.get("/partner/demolition-requests", headers=VENDOR_1).json()
    assert [r["id"] for r in received] == [request["id"]] and "userId" not in received[0]
    assert client.get("/partner/demolition-requests", headers={"X-Demo-User": "stranger"}).status_code == 403
    path = f"/partner/demolition-requests/{request['id']}/bids"
    bid_1 = client.post(path, json={"amount": 9500000, "startDate": "2026-12-01", "scopeNote": "전체 철거 포함"}, headers=VENDOR_1)
    bid_2 = client.post(path, json={"amount": 8800000, "startDate": "2026-12-05"}, headers=VENDOR_2)
    assert bid_1.status_code == 201 and bid_2.status_code == 201
    assert client.post(path, json={"amount": 1, "startDate": "2026-12-05"}, headers=VENDOR_2).status_code == 409
    assert client.post(path, json={"amount": 1000, "startDate": "내일"}, headers=VENDOR_3).status_code == 422

    # 3. 사용자가 싼 순으로 비교하고 한 곳을 고른다.
    bids = client.get(f"/demolition-requests/{request['id']}/bids").json()
    assert [b["amount"] for b in bids] == [8800000, 9500000]
    assert bids[0]["vendorName"] == "대한철거"
    accept_path = f"/demolition-requests/{request['id']}/accept"
    accepted = client.post(accept_path, json={"bid_id": bids[0]["id"]}).json()
    assert accepted["status"] == "accepted" and accepted["acceptedBidId"] == bids[0]["id"]
    statuses = {b["vendorName"]: b["status"] for b in client.get(f"/demolition-requests/{request['id']}/bids").json()}
    assert statuses == {"대한철거": "accepted", "한솔철거": "rejected"}

    # 4. 한 번 고르면 다시 고를 수 없고, 마감된 요청에는 견적을 더 낼 수 없다.
    assert client.post(accept_path, json={"bid_id": bids[1]["id"]}).status_code == 409
    late = client.post(path, json={"amount": 7000000, "startDate": "2026-12-09"}, headers=VENDOR_3)
    assert late.status_code == 409


def test_other_user_cannot_see_bids(client):
    request = client.post("/demolition-requests", json={"spaceId": "seongsu-stn-2f"}).json()
    other = {"X-Demo-User": "other-user"}
    assert client.get(f"/demolition-requests/{request['id']}/bids", headers=other).status_code == 404
    assert client.post(f"/demolition-requests/{request['id']}/accept", json={"bid_id": "x"}, headers=other).status_code == 404
    assert client.post(f"/demolition-requests/{request['id']}/accept", json={"bid_id": "x"}).status_code == 404

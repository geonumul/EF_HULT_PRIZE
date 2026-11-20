"""시연 공간 두 곳(사진 08 = 성수동2가 315-30, 사진 02 = 성수동2가 331-14)의 도면을 tools/plans-src/에 쓴다.

도면 좌표는 mm이고 사진에서 보정한 카메라(tools/calib/*.json)와 같은 좌표계다. 가구는 기준(간격, 입구 비움)을 지키도록 직접 놓았다.
이 도면으로 가이드(guide_render.py)를 그리고, 가이드로 이미지를 만든다. 실행: python tools/build_plans.py
"""
import json
import math
import os

import guide_render as g

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "plans-src")
os.makedirs(SRC, exist_ok=True)


def table(x, y, angles, dia=700):
    fp = dia + 900
    return {"productId": "table", "name": "원형 테이블", "category": "table", "kind": "table", "widthMm": fp, "depthMm": fp, "chairs": len(angles), "x": x, "y": y, "round": True, "tableDiaMm": dia, "chairAngles": angles}


def fx(name, cat, x, y, w, d):
    return {"productId": cat, "name": name, "category": cat, "kind": "fixture", "widthMm": w, "depthMm": d, "chairs": 0, "x": x, "y": y}


def lamp(x, y):
    return {"productId": "lamp", "name": "조명", "category": "lamp", "kind": "fixture", "widthMm": 300, "depthMm": 300, "chairs": 0, "x": x, "y": y, "hanging": True}


def reformer(x, y):
    return fx("필라테스 리포머", "reformer", x, y, 2400, 700)


def column(x, y, size=500):
    return {"kind": "column", "label": "기둥", "x": x - size // 2, "y": y - size // 2, "widthMm": size, "depthMm": size}


def camera_of(photo_size, calib_file, crop_dx):
    calib = json.load(open(os.path.join(HERE, "calib", calib_file), encoding="utf-8"))
    cam = g.Camera(photo_size[0], photo_size[1], calib, crop_dx, 0)
    return cam, cam.view_cone(photo_size[0], photo_size[1])


def pins_of(cam, size, placed):
    """도면 번호(조명을 뺀 placed 순서)가 이미지의 어디에 보이는지. 이미지 가로, 세로에 대한 퍼센트이고 화면 밖이면 null이다."""
    pins = []
    for item in placed:
        if item.get("hanging"):
            continue
        z = 1100 if item["category"] == "counter" else 900
        pt = cam.project(item["x"] + item["widthMm"] / 2, item["y"] + item["depthMm"] / 2, z)
        if pt is None or not (0 <= pt[0] <= size[0] and 0 <= pt[1] <= size[1]):
            pins.append(None)
        else:
            pins.append({"x": round(pt[0] / size[0] * 100, 1), "y": round(pt[1] / size[1] * 100, 1)})
    return pins


def write(key, use, room, placed, structures, camera, cam=None, size=None):
    plan = {"key": key, "useType": use, "room": room, "placed": placed, "structures": structures, "camera": camera}
    if cam is not None:
        plan["pins"] = pins_of(cam, size, placed)
    json.dump(plan, open(os.path.join(SRC, key + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("쓴 도면:", key, len(placed), "개")


# ---------------- 사진 08 (315-30) ----------------
ROOM_08 = {"widthMm": 8970, "depthMm": 9945, "ceilingMm": 3000}
CAM_08, CAMERA_08 = camera_of((1272, 848), "08.json", 4)
STRUCT_08 = [column(1268, 3477), column(3337, 8705), column(8320, 2692)]

write("08-cafe", "cafe", ROOM_08, [
    fx("바 카운터", "counter", 1700, 1300, 2400, 600),
    fx("디저트 쇼케이스", "fixture", 4200, 1300, 900, 600),
    table(1700, 3100, [180, 0, 270]), table(1700, 5550, [180, 0]), table(3600, 5550, [180, 0, 270]),
    table(5500, 1300, [180, 0]), table(5500, 3750, [180, 0, 270]), table(5500, 6200, [180, 0]),
    lamp(2000, 1450), lamp(2900, 1450), lamp(3800, 1450), lamp(4700, 1450), lamp(2350, 3750), lamp(6050, 4300),
], STRUCT_08, CAMERA_08, CAM_08, (1272, 848))

write("08-popup", "popup", ROOM_08, [
    fx("계산대", "counter", 600, 6800, 800, 2200),
    fx("벽 선반", "shelf", 1700, 500, 1500, 400), fx("벽 선반", "shelf", 3300, 500, 1500, 400), fx("벽 선반", "shelf", 4900, 500, 1500, 400),
    fx("벽 선반", "shelf", 6500, 500, 1200, 400), fx("벽 선반", "shelf", 150, 4400, 400, 1300), fx("벽 선반", "shelf", 8300, 3600, 400, 1200),
    fx("전시 테이블", "table", 1900, 2300, 1200, 700), fx("전시 테이블", "table", 3800, 2800, 1200, 700), fx("큰 전시 테이블", "table", 5800, 2200, 2000, 900),
    fx("전시 테이블", "table", 2400, 4600, 1200, 700), fx("전시 테이블", "table", 4600, 4400, 1200, 700), fx("큰 전시 테이블", "table", 5800, 5800, 2000, 900),
    lamp(2400, 1700), lamp(4300, 1700), lamp(6300, 1700), lamp(3000, 3900), lamp(5200, 3800), lamp(6800, 5000),
], STRUCT_08, CAMERA_08, CAM_08, (1272, 848))

write("08-pilates", "pilates", ROOM_08, [
    *[reformer(x, y) for y in (1800, 3400, 5000, 6600) for x in (1800, 4900)],
    fx("요가 매트 거치대", "fixture", 600, 8400, 1500, 400),
], STRUCT_08, CAMERA_08, CAM_08, (1272, 848))

# ---------------- 사진 02 (331-14) ----------------
ROOM_02 = {"widthMm": 8000, "depthMm": 11200, "ceilingMm": 3000}
cam02, CAMERA_02 = camera_of((1236, 927), "02.json", 22)


def ground_plan(u, v, z=0):
    """원본 사진 픽셀(u, v)에서 높이 z인 점의 도면 좌표"""
    r = cam02.ray(u - 22, v)
    t = (cam02.h - z) / r.dot(cam02.down)
    p = r * t
    return round(p.dot(cam02.d2) - cam02.left), round(cam02.back - p.dot(cam02.d1))


door_l, door_y = ground_plan(890, 573)
door_r, _ = ground_plan(952, 573)
ring_c = ground_plan(750, 262, 2750)
print("문 x", door_l, door_r, "y", door_y, "원형 구조물 중심", ring_c)
STRUCT_02 = [
    {"kind": "window", "label": "창", "x": 0, "y": 0, "widthMm": 200, "depthMm": 6600},
    {"kind": "door", "label": "문", "x": door_l, "y": 0, "widthMm": max(900, door_r - door_l), "depthMm": 200},
    {"kind": "ring", "label": "천장 구조물", "x": ring_c[0] - 1400, "y": ring_c[1] - 1400, "widthMm": 2800, "depthMm": 2800},
]

write("02-popup", "popup", ROOM_02, [
    fx("계산대", "counter", 500, 3700, 1300, 1900),
    fx("벽 선반", "shelf", 300, 100, 1300, 400), fx("벽 선반", "shelf", 1700, 100, 1300, 400),
    fx("벽 선반", "shelf", 4800, 100, 1300, 400), fx("벽 선반", "shelf", 6200, 100, 1300, 400), fx("벽 선반", "shelf", 7500, 2400, 400, 1800),
    fx("전시 테이블", "table", 2800, 1700, 1500, 800), fx("전시 테이블", "table", 4700, 2400, 1500, 800),
    fx("전시 테이블", "table", 3100, 3800, 1500, 800), fx("큰 전시 테이블", "table", 5200, 4400, 1600, 800),
    lamp(1800, 1800), lamp(3600, 1500), lamp(5400, 1500), lamp(6300, 3500), lamp(2600, 3300),
], STRUCT_02, CAMERA_02, cam02, (1236, 927))

write("02-pilates", "pilates", ROOM_02, [
    *[reformer(x, y) for y in (900, 2500, 4100, 5700) for x in (600, 4600)],
], STRUCT_02, CAMERA_02, cam02, (1236, 927))

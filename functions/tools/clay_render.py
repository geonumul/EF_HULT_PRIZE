"""배치 결과(layout.json)로 간단한 3D 점토 렌더링을 그린다.

이미지 생성 모델은 공간의 깊이와 크기를 잘 모르기 때문에, 우리가 계산한 좌표로 원근이 맞는 구조 그림을 만들어
참고 이미지로 함께 준다. 모델이 이 그림의 위치와 원근을 따라 사진처럼 바꾸게 하는 용도다.

사용: python tools/clay_render.py layout.json out.png
좌표는 mm. X는 오른쪽, Y는 안쪽 벽(0)에서 입구(깊이)까지, Z는 위쪽이다. 카메라는 입구 쪽 눈높이에서 안쪽을 본다.
"""
import json
import math
import sys

from PIL import Image, ImageDraw

WIDTH, HEIGHT = 1376, 768
EYE_HEIGHT = 1500
HORIZONTAL_FOV_DEGREES = 85

COLORS = {
    "floor": (176, 170, 160),
    "back": (214, 206, 192),
    "side": (196, 188, 174),
    "ceiling": (232, 230, 226),
    "table": (150, 110, 70),
    "chair": (200, 170, 120),
    "counter": (96, 64, 40),
    "lamp": (250, 250, 245),
    "shelf": (120, 120, 120),
    "other": (110, 140, 170),
    "door": (70, 60, 52),
}

DOOR_WIDTH, DOOR_HEIGHT = 900, 2100  # 크기를 가늠하는 기준 문(mm)
SEAT_HEIGHT = 450


def shade(color, factor):
    return tuple(max(0, min(255, int(channel * factor))) for channel in color)


class Camera:
    def __init__(self, room):
        self.cx = room["widthMm"] / 2
        self.cy = room["depthMm"] - 100  # 입구 쪽 벽 바로 안쪽
        self.focal = (WIDTH / 2) / math.tan(math.radians(HORIZONTAL_FOV_DEGREES) / 2)

    def project(self, x, y, z):
        depth = self.cy - y
        if depth < 80:
            return None
        return (WIDTH / 2 + (x - self.cx) * self.focal / depth, HEIGHT / 2 - (z - EYE_HEIGHT) * self.focal / depth)

    def distance(self, x, y):
        return math.hypot(x - self.cx, y - self.cy)


def polygon(draw, camera, points, fill):
    projected = [camera.project(*point) for point in points]
    if any(point is None for point in projected):
        return
    draw.polygon(projected, fill=fill, outline=shade(fill, 0.7))


def box(draw, camera, x, y, z, width, depth, height, color):
    """상자 하나. 카메라에서 보이는 윗면, 앞면, 옆면만 그린다."""
    x2, y2, z2 = x + width, y + depth, z + height
    polygon(draw, camera, [(x, y2, z), (x2, y2, z), (x2, y2, z2), (x, y2, z2)], shade(color, 1.0))  # 앞면(입구 쪽)
    side_x = x if camera.cx < x else x2
    if camera.cx < x:
        polygon(draw, camera, [(x, y, z), (x, y2, z), (x, y2, z2), (x, y, z2)], shade(color, 0.8))
    elif camera.cx > x2:
        polygon(draw, camera, [(x2, y, z), (x2, y2, z), (x2, y2, z2), (x2, y, z2)], shade(color, 0.8))
    if z2 < EYE_HEIGHT:
        polygon(draw, camera, [(x, y, z2), (x2, y, z2), (x2, y2, z2), (x, y2, z2)], shade(color, 1.15))  # 윗면
    return side_x


def parts_of(item, room):
    """배치 한 개를 (x, y, z, 너비, 깊이, 높이, 색) 상자 목록으로 바꾼다."""
    name = item["name"]
    clearance = item.get("clearanceMm") or 0
    x, y = item["x"] + clearance, item["y"] + clearance
    width, depth = item["widthMm"] - 2 * clearance, item["depthMm"] - 2 * clearance
    if "조명" in name:
        return [(x, y, 2250, width, depth, item.get("heightMm") or 350, COLORS["lamp"])]
    if "카운터" in name:
        return [(x, y, 0, width, depth, item.get("heightMm") or 1000, COLORS["counter"])]
    if item["kind"] == "table":
        chairs = item.get("chairs", 0)
        chair_depth = 450 if chairs else 0
        top_depth = depth - 2 * chair_depth if chairs >= 2 else depth - chair_depth
        parts = [(x, y + chair_depth, 0, width, max(top_depth, 300), item.get("heightMm") or 720, COLORS["table"])]
        if chairs >= 1:
            parts.append((x + (width - 450) / 2, y, 0, 450, 450, 450, COLORS["chair"]))
        if chairs >= 2:
            parts.append((x + (width - 450) / 2, y + depth - 450, 0, 450, 450, 450, COLORS["chair"]))
        return parts
    if item["kind"] == "fixture" and ("리포머" in name or "사물함" in name):
        return [(x, y, 0, width, depth, item.get("heightMm") or 400, COLORS["other"])]
    if "선반" in name:
        return [(x, y, 0, width, depth, item.get("heightMm") or 1800, COLORS["shelf"])]
    return [(x, y, 0, width, depth, item.get("heightMm") or 900, COLORS["other"])]


def main(layout_path, out_path):
    layout = json.load(open(layout_path, encoding="utf-8"))
    room = layout["room"]
    camera = Camera(room)
    image = Image.new("RGB", (WIDTH, HEIGHT), (255, 255, 255))
    draw = ImageDraw.Draw(image)
    w, d, h = room["widthMm"], room["depthMm"], room["ceilingMm"]

    # 방: 바닥, 안쪽 벽, 양옆 벽, 천장
    polygon(draw, camera, [(0, 0, h), (w, 0, h), (w, d - 200, h), (0, d - 200, h)], COLORS["ceiling"])
    polygon(draw, camera, [(0, 0, 0), (w, 0, 0), (w, 0, h), (0, 0, h)], COLORS["back"])
    polygon(draw, camera, [(0, 0, 0), (0, d - 200, 0), (0, d - 200, h), (0, 0, h)], COLORS["side"])
    polygon(draw, camera, [(w, 0, 0), (w, d - 200, 0), (w, d - 200, h), (w, 0, h)], COLORS["side"])
    polygon(draw, camera, [(0, 0, 0), (w, 0, 0), (w, d - 200, 0), (0, d - 200, 0)], COLORS["floor"])

    parts = [part for item in layout["placed"] for part in parts_of(item, room)]
    # 안쪽 벽에 폭 0.9m, 높이 2.1m 문을 그린다. 사람 크기를 가늠하는 기준이다. 사람 모형은 배치를 흐트러뜨려 쓰지 않는다.
    door_x = room["widthMm"] * 0.72
    polygon(draw, camera, [(door_x, 1, 0), (door_x + DOOR_WIDTH, 1, 0), (door_x + DOOR_WIDTH, 1, DOOR_HEIGHT), (door_x, 1, DOOR_HEIGHT)], COLORS["door"])
    parts.sort(key=lambda part: -camera.distance(part[0] + part[3] / 2, part[1] + part[4] / 2))  # 먼 것부터 그린다
    for x, y, z, width, depth, height, color in parts:
        box(draw, camera, x, y, z, width, depth, height, color)

    image.save(out_path)
    print("저장:", out_path)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

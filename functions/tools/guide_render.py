"""도면(plan.json)을 공간 사진과 같은 카메라로 투영해서, 가구 자리를 색 상자로 표시한 가이드 이미지를 만든다.

이미지 생성 모델은 가구를 "여기쯤"으로만 알아듣는다. 사진에서 구한 소실점으로 카메라를 세우고 도면의 가구를
원근에 맞게 그려서 주면, 모델이 그 상자 자리에 실제 가구를 그린다. 바탕은 사진에서 뽑은 건축 선화다.

사용: python tools/guide_render.py 사진.jpg 보정.json 도면.json 출력.png [--crop-aspect 1.5] [--overlay]
보정.json: { "vp1": [u, v], "vp2": [u, v], "f": 초점거리(px), "h": 카메라 높이(mm), "anchor": { "u":, "v":, "x":, "y": } }
  vp1 = 깊이 방향 소실점, vp2 = 가로 방향 소실점(원본 사진 픽셀). anchor는 사진의 바닥 점 하나와 그 점의 도면 좌표(mm)다.
좌표는 mm. 도면 x는 오른쪽, y는 안쪽 벽(0)에서 입구 쪽이다.
"""
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

BLUR_RADIUS = 1.6
EDGE_PERCENTILE = 91

COLORS = {
    "counter": (150, 90, 40),
    "showcase": (50, 140, 210),
    "table": (235, 150, 40),
    "chair": (40, 170, 120),
    "shelf": (80, 100, 210),
    "display": (160, 80, 180),
    "reformer": (220, 60, 60),
    "lamp": (250, 210, 40),
    "other": (110, 110, 110),
}
HEIGHTS = {"counter": 1000, "showcase": 1100, "table": 720, "chair": 450, "shelf": 1800, "display": 800, "reformer": 450, "lamp": 300, "other": 800}


def unit(v):
    return v / np.linalg.norm(v)


class Camera:
    def __init__(self, width, height, calib, crop_dx=0, crop_dy=0):
        self.f = calib["f"]
        self.cx, self.cy = width / 2, height / 2
        vp1 = (calib["vp1"][0] - crop_dx, calib["vp1"][1] - crop_dy)
        vp2 = (calib["vp2"][0] - crop_dx, calib["vp2"][1] - crop_dy)
        self.h = calib["h"]
        ray = lambda u, v: np.array([(u - self.cx) / self.f, (v - self.cy) / self.f, 1.0])
        self.d1 = unit(ray(*vp1))
        raw2 = ray(*vp2)
        self.d2 = unit(raw2 - raw2.dot(self.d1) * self.d1)
        if vp2[0] < self.cx:  # 가로 소실점이 왼쪽에 있으면 방향을 뒤집어 도면 x가 오른쪽으로 커지게 한다.
            self.d2 = -self.d2
        down = np.cross(self.d1, self.d2)
        self.down = down if down[1] > 0 else -down
        self.ray = ray
        # 기준점으로 도면 좌표의 원점을 맞춘다.
        a = calib["anchor"]
        lateral, depth = self.ground(a["u"] - crop_dx, a["v"] - crop_dy)
        self.left = lateral - a["x"]
        self.back = depth + a["y"]

    def ground(self, u, v):
        r = self.ray(u, v)
        p = r * (self.h / r.dot(self.down))
        return p.dot(self.d2), p.dot(self.d1)

    def view_cone(self, width, height):
        """도면에서 카메라 위치와 시야 양 끝 방향. 카메라는 lateral=0, depth=0 지점이다."""
        origin = (round(-self.left), round(self.back))
        edges = []
        for u in (0, width):
            lateral, depth = self.ground(u, self.cy + 140)
            n = math.hypot(lateral, depth)
            edges.append((round(lateral / n, 4), round(-depth / n, 4)))
        return {"x": origin[0], "y": origin[1], "left": edges[0], "right": edges[1]}

    def project(self, x, y, z):
        """도면 좌표 (x, y)와 바닥에서의 높이 z(mm) -> 사진 픽셀"""
        lateral, depth = x + self.left, self.back - y
        p = lateral * self.d2 + depth * self.d1 + (self.h - z) * self.down
        if p[2] < 150:
            return None
        return (self.cx + self.f * p[0] / p[2], self.cy + self.f * p[1] / p[2], p[2])


def edge_image(photo):
    gray = ImageOps.autocontrast(photo.convert("L")).filter(ImageFilter.GaussianBlur(BLUR_RADIUS))
    px = np.asarray(gray, dtype=np.float32)
    gx = np.zeros_like(px)
    gy = np.zeros_like(px)
    gx[:, 1:-1] = px[:, 2:] - px[:, :-2]
    gy[1:-1, :] = px[2:, :] - px[:-2, :]
    mag = np.hypot(gx, gy)
    lines = mag >= np.percentile(mag, EDGE_PERCENTILE)
    return Image.fromarray(np.where(lines, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).convert("RGB")


def shade(color, k):
    return tuple(max(0, min(255, int(c * k))) for c in color)


def draw_box(draw, cam, x, y, z, w, d, h, color):
    """바닥 모서리 (x, y, z), 크기 w x d x h 상자. 앞면(입구 쪽)과 위, 옆면을 칠한다."""
    corners = {}
    for i, (cxo, cyo) in enumerate([(0, 0), (w, 0), (w, d), (0, d)]):
        corners[("b", i)] = cam.project(x + cxo, y + cyo, z)
        corners[("t", i)] = cam.project(x + cxo, y + cyo, z + h)
    if any(v is None for v in corners.values()):
        return
    pt = lambda k: corners[k][:2]
    faces = [
        ([("b", 3), ("b", 2), ("t", 2), ("t", 3)], 1.0),  # 앞면
        ([("b", 0), ("b", 3), ("t", 3), ("t", 0)], 0.78),  # 왼쪽 면
        ([("b", 1), ("b", 2), ("t", 2), ("t", 1)], 0.78),  # 오른쪽 면
        ([("t", 0), ("t", 1), ("t", 2), ("t", 3)], 1.2),  # 윗면
    ]
    for keys, k in faces:
        draw.polygon([pt(key) for key in keys], fill=shade(color, k), outline=shade(color, 0.55))


def draw_cylinder(draw, cam, cx, cy, radius, height, color, steps=28):
    top = [cam.project(cx + radius * math.cos(2 * math.pi * i / steps), cy + radius * math.sin(2 * math.pi * i / steps), height) for i in range(steps)]
    bottom = [cam.project(cx + radius * math.cos(2 * math.pi * i / steps), cy + radius * math.sin(2 * math.pi * i / steps), height - 60) for i in range(steps)]
    if any(p is None for p in top + bottom):
        return
    # 옆면은 위와 아래 원의 바깥 윤곽을 이어 칠한다.
    pts = [p[:2] for p in top] + [p[:2] for p in reversed(bottom)]
    hull = convex_hull(pts)
    draw.polygon(hull, fill=shade(color, 0.8), outline=shade(color, 0.5))
    draw.polygon([p[:2] for p in top], fill=shade(color, 1.15), outline=shade(color, 0.6))


def convex_hull(points):
    pts = sorted(set((round(x, 2), round(y, 2)) for x, y in points))
    if len(pts) <= 2:
        return pts
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def kind_of(item):
    name, category = item["name"], item["category"]
    if category == "counter":
        return "counter"
    if item.get("round") or category == "table" and item.get("chairs", 0) > 0:
        return "table"
    if category == "shelf":
        return "shelf"
    if category == "reformer":
        return "reformer"
    if category == "table":
        return "display"
    if "쇼케이스" in name:
        return "showcase"
    return "other"


def render(photo_path, calib_path, plan_path, out_path, crop_aspect=None, overlay=False):
    photo = Image.open(photo_path).convert("RGB")
    calib = json.load(open(calib_path, encoding="utf-8"))
    plan = json.load(open(plan_path, encoding="utf-8"))
    crop_dx = crop_dy = 0
    if crop_aspect:
        w, h = photo.size
        if w / h > crop_aspect:
            nw = round(h * crop_aspect)
            crop_dx = (w - nw) // 2
            photo = photo.crop((crop_dx, 0, crop_dx + nw, h))
        else:
            nh = round(w / crop_aspect)
            crop_dy = (h - nh) // 2
            photo = photo.crop((0, crop_dy, w, crop_dy + nh))
    cam = Camera(photo.size[0], photo.size[1], calib, crop_dx, crop_dy)
    if not overlay:
        photo.save(out_path.rsplit(".", 1)[0] + "-photo.jpg", quality=95)  # 가이드와 같은 범위로 자른 사진
    canvas = photo.copy() if overlay else edge_image(photo)
    if overlay:
        canvas = Image.blend(canvas, Image.new("RGB", canvas.size, (255, 255, 255)), 0.35)
    draw = ImageDraw.Draw(canvas, "RGBA")

    room = plan["room"]
    # 바닥 윤곽(얇은 선)
    floor = [cam.project(0, 0, 0), cam.project(room["widthMm"], 0, 0), cam.project(room["widthMm"], room["depthMm"], 0), cam.project(0, room["depthMm"], 0)]
    if all(p is not None for p in floor):
        draw.polygon([p[:2] for p in floor], outline=(120, 120, 120, 255))

    items = []
    for item in plan["placed"]:
        items.append(item)
    for s in plan.get("structures", []):
        if s["kind"] == "column":
            items.append({"_column": s})

    # 먼 것부터 그린다(화가 알고리즘)
    def depth_key(it):
        if "_column" in it:
            s = it["_column"]
            return -(s["y"] + s["depthMm"] / 2)
        return -(it["y"] + it["depthMm"] / 2)

    for item in sorted(items, key=depth_key):
        if "_column" in item:
            s = item["_column"]
            draw_box(draw, cam, s["x"], s["y"], 0, s["widthMm"], s["depthMm"], 3000, (150, 150, 150))
            continue
        kind = "lamp" if item.get("hanging") else kind_of(item)
        if item.get("hanging"):
            draw_box(draw, cam, item["x"], item["y"], 1800, item["widthMm"], item["depthMm"], 350, COLORS["lamp"])
            continue
        if item.get("round") and item.get("tableDiaMm"):
            cx = item["x"] + item["widthMm"] / 2
            cy = item["y"] + item["depthMm"] / 2
            r = item["tableDiaMm"] / 2
            for deg in item.get("chairAngles", []):
                a = math.radians(deg)
                dist = r + 260
                draw_box(draw, cam, cx + math.cos(a) * dist - 200, cy + math.sin(a) * dist - 200, 0, 400, 400, 450, COLORS["chair"])
            draw_box(draw, cam, cx - 45, cy - 45, 0, 90, 90, 700, shade(COLORS["table"], 0.7))  # 가운데 다리
            draw_cylinder(draw, cam, cx, cy, r, 720, COLORS["table"])
            continue
        draw_box(draw, cam, item["x"], item["y"], 0, item["widthMm"], item["depthMm"], HEIGHTS.get(kind, 800) if kind != "shelf" else (1800 if item["widthMm"] > 300 else 1800), COLORS[kind])

    canvas.save(out_path)
    print("저장:", out_path, canvas.size)
    return canvas.size


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    aspect = None
    if "--crop-aspect" in sys.argv:
        aspect = float(sys.argv[sys.argv.index("--crop-aspect") + 1])
        args = [a for a in args if a != str(aspect) and a != sys.argv[sys.argv.index("--crop-aspect") + 1]]
    render(args[0], args[1], args[2], args[3], aspect, "--overlay" in sys.argv)

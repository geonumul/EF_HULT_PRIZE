"""도면의 번호를 이미지 위에 같은 번호로 표시한다. python number_overlay.py 이미지 보정.json 도면.json 크롭한사진.jpg 원본사진 출력.png --crop-aspect 1.5
번호는 LayoutPlan이 도면에 붙이는 번호와 같다(조명을 뺀 placed 순서)."""
import json, sys
from PIL import Image, ImageDraw, ImageFont
import guide_render as g
args = [a for a in sys.argv[1:] if not a.startswith("--")]
aspect = float(sys.argv[sys.argv.index("--crop-aspect") + 1]) if "--crop-aspect" in sys.argv else None
if aspect: args = [a for a in args if a != sys.argv[sys.argv.index("--crop-aspect") + 1]]
image_path, calib_path, plan_path, original, out = args
img = Image.open(image_path).convert("RGB")
calib = json.load(open(calib_path, encoding="utf-8")); plan = json.load(open(plan_path, encoding="utf-8"))
orig = Image.open(original); w, h = orig.size; dx = dy = 0
if aspect:
    if w / h > aspect: dx = (w - round(h * aspect)) // 2
    else: dy = (h - round(w / aspect)) // 2
cw, ch = w - 2 * dx, h - 2 * dy
cam = g.Camera(cw, ch, calib, dx, dy)
sx, sy = img.size[0] / cw, img.size[1] / ch
draw = ImageDraw.Draw(img)
try: font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 26)
except Exception: font = ImageFont.load_default()
n = 0
for item in plan["placed"]:
    if item.get("hanging"): continue
    n += 1
    cx = item["x"] + item["widthMm"] / 2; cy = item["y"] + item["depthMm"] / 2
    z = 1100 if item["category"] == "counter" else 900
    pt = cam.project(cx, cy, z)
    if not pt: continue
    x, y = pt[0] * sx, pt[1] * sy
    draw.ellipse([x - 20, y - 20, x + 20, y + 20], fill=(220, 40, 40), outline="white", width=3)
    draw.text((x, y), str(n), fill="white", font=font, anchor="mm")
img.save(out); print("저장", out)

"""브라우저에서 도면으로 가이드 이미지를 다시 그릴 때 쓰는 파일을 만든다.
공간 사진마다 (1) 가이드와 같은 범위로 자른 사진, (2) 그 사진의 건축 선화, (3) 자른 사진 기준으로 옮긴 카메라 보정값.

  python functions/tools/export_guide_assets.py
결과: frontend/public/images/spaces/guide/<번호>-photo.jpg, <번호>-edges.png, frontend/src/lib/guideCalib.ts
"""
import json
import os

from PIL import Image

from guide_render import edge_image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SPACES = os.path.join(ROOT, "frontend", "public", "images", "spaces")
OUT = os.path.join(SPACES, "guide")

# 사진 번호, 보정 파일, 자르는 가로세로 비율, 모델에 요청할 비율
TARGETS = [("08", "08", 1.5, "3:2"), ("02", "02", 4 / 3, "4:3")]


def main():
    os.makedirs(OUT, exist_ok=True)
    entries = {}
    for number, calib_name, aspect, ratio in TARGETS:
        photo = Image.open(os.path.join(SPACES, f"space-{number}.jpg")).convert("RGB")
        calib = json.load(open(os.path.join(HERE, "calib", f"{calib_name}.json"), encoding="utf-8"))
        w, h = photo.size
        dx = dy = 0
        if w / h > aspect:
            nw = round(h * aspect)
            dx = (w - nw) // 2
            photo = photo.crop((dx, 0, dx + nw, h))
        else:
            nh = round(w / aspect)
            dy = (h - nh) // 2
            photo = photo.crop((0, dy, w, dy + nh))
        photo.save(os.path.join(OUT, f"{number}-photo.jpg"), quality=92)
        edge_image(photo).save(os.path.join(OUT, f"{number}-edges.png"))
        a = calib["anchor"]
        entries[number] = {
            "width": photo.size[0],
            "height": photo.size[1],
            "aspectRatio": ratio,
            "f": calib["f"],
            "h": calib["h"],
            "vp1": [round(calib["vp1"][0] - dx, 2), round(calib["vp1"][1] - dy, 2)],
            "vp2": [round(calib["vp2"][0] - dx, 2), round(calib["vp2"][1] - dy, 2)],
            "anchor": {"u": a["u"] - dx, "v": a["v"] - dy, "x": a["x"], "y": a["y"]},
        }
    body = json.dumps(entries, ensure_ascii=False, indent=2)
    ts = (
        "// 도면으로 가이드 이미지를 다시 그릴 때 쓰는 카메라 보정값. functions/tools/export_guide_assets.py가 만든다. 직접 고치지 않는다.\n"
        "// 좌표는 사진을 가이드 비율로 자른 뒤의 픽셀이다.\n"
        "export type GuideCalib = {\n  width: number;\n  height: number;\n  aspectRatio: string;\n  f: number;\n  h: number;\n"
        "  vp1: [number, number];\n  vp2: [number, number];\n  anchor: { u: number; v: number; x: number; y: number };\n};\n\n"
        f"export const GUIDE_CALIB: Record<string, GuideCalib> = {body};\n"
    )
    with open(os.path.join(ROOT, "frontend", "src", "lib", "guideCalib.ts"), "w", encoding="utf-8") as f:
        f.write(ts)
    print("완료", list(entries))


if __name__ == "__main__":
    main()

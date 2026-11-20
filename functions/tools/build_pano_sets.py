"""사방 이미지(pano_views.mjs 결과)를 화면용으로 줄여 frontend/public/images/pano에 옮기고, panoViews.ts의 PANO_KEYS를 맞춘다.

사용: python functions/tools/build_pano_sets.py <결과 폴더>
결과 폴더 안에 <사진 번호>-<업종>-<스타일>/view-<방향>.jpg 네 장이 있는 묶음만 옮긴다.
"""
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend" / "public" / "images" / "pano"
TS = ROOT / "frontend" / "src" / "lib" / "panoViews.ts"
YAWS = (0, 90, 180, 270)
WIDTH = 1024


def main():
    source = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for folder in sorted(p for p in source.iterdir() if p.is_dir()):
        files = [folder / f"view-{yaw}.jpg" for yaw in YAWS]
        if not all(f.exists() for f in files):
            print("건너뜀(네 장이 아님):", folder.name)
            continue
        for yaw, file in zip(YAWS, files):
            image = Image.open(file).convert("RGB")
            image = image.resize((WIDTH, round(image.height * WIDTH / image.width)))
            image.save(OUT / f"{folder.name}-{yaw}.jpg", quality=82)
        print("옮김:", folder.name)

    keys = sorted({re.sub(r"-(0|90|180|270)\.jpg$", "", p.name) for p in OUT.glob("*.jpg")})
    keys = [k for k in keys if all((OUT / f"{k}-{y}.jpg").exists() for y in YAWS)]
    text = TS.read_text(encoding="utf-8")
    block = "// build_pano_sets.py 시작\nexport const PANO_KEYS: string[] = [" + ", ".join(f'"{k}"' for k in keys) + "];\n// build_pano_sets.py 끝"
    text = re.sub(r"// build_pano_sets.py 시작.*?// build_pano_sets.py 끝", block, text, flags=re.S)
    TS.write_text(text, encoding="utf-8")
    print("PANO_KEYS", len(keys), "개")


if __name__ == "__main__":
    main()

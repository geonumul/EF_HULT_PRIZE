"""make_demo_renders.sh가 만든 이미지를 frontend/public/images/renders에 jpg로 옮기고, 화면에 켤 사진 번호를 알려 준다."""
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "functions" / "renders-raw"
OUT = ROOT / "frontend" / "public" / "images" / "renders"
OUT.mkdir(parents=True, exist_ok=True)

done = {}
for folder in sorted(RAW.glob("*-*-*")):
    number, use, style = folder.name.split("-")
    files = [path for path in folder.glob(f"{use}-1.*")]
    if not files:
        continue
    image = Image.open(files[0]).convert("RGB")
    if image.width > 1600:
        image = image.resize((1600, round(image.height * 1600 / image.width)))
    image.save(OUT / f"space-{number}-{use}-{style}.jpg", quality=85, optimize=True)
    done.setdefault(number, []).append(f"{use}-{style}")

for number, items in done.items():
    print(f"space-{number}: {len(items)}장 ({'완성' if len(items) == 9 else '일부만 있음'})")
complete = [number for number, items in done.items() if len(items) == 9]
print(f"frontend/src/lib/generatedRenders.ts의 GENERATED_PHOTO_NUMBERS를 {complete} 로 바꾸세요.")

"""make_demo_renders.sh가 만든 이미지를 frontend/public/images/renders에 jpg로 옮기고, 화면이 쓸 목록(manifest)을 만든다.

사용: python functions/tools/collect_renders.py [--exclude 02-cafe ...]
--exclude는 목록에서 뺄 "공간-업종"이다. 검수에 통과하지 못했거나 다시 만들 조합에 쓴다.
"""
import argparse
from pathlib import Path

from PIL import Image

parser = argparse.ArgumentParser(description="생성한 렌더링을 화면용 폴더로 옮기고 사용할 목록을 만든다.")
parser.add_argument("--exclude", nargs="*", default=[], help="목록에서 뺄 공간-업종. 예: 02-cafe")
args = parser.parse_args()

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "functions" / "renders-raw-v2"
OUT = ROOT / "frontend" / "public" / "images" / "renders"
MANIFEST = ROOT / "frontend" / "src" / "lib" / "generatedRenders.manifest.ts"
OUT.mkdir(parents=True, exist_ok=True)

found = {}
for folder in sorted(RAW.glob("*-*-*")):
    number, use, style = folder.name.split("-")
    files = list(folder.glob(f"{use}-1.*"))
    if not files:
        continue
    image = Image.open(files[0]).convert("RGB")
    if image.width > 1600:
        image = image.resize((1600, round(image.height * 1600 / image.width)))
    image.save(OUT / f"space-{number}-{use}-{style}.jpg", quality=85, optimize=True)
    found.setdefault(number, []).append(f"{use}-{style}")

usable = []
for number, entries in sorted(found.items()):
    for entry in sorted(entries):
        use = entry.split("-")[0]
        if f"{number}-{use}" not in args.exclude:
            usable.append(f"{number}-{entry}")
    print(f"space-{number}: {len(entries)}장")

body = ",\n".join(f'  "{name}"' for name in usable)
MANIFEST.write_text(
    "// 사전 생성한 렌더링 목록. functions/tools/collect_renders.py가 만든다. 직접 고치지 않는다.\n"
    '// 항목은 "<사진 번호>-<업종>-<스타일>"이고, 파일은 public/images/renders/space-<번호>-<업종>-<스타일>.jpg이다.\n'
    f"export const GENERATED_RENDERS: string[] = [\n{body},\n];\n",
    encoding="utf-8",
)
print(f"목록 {len(usable)}개 저장: {MANIFEST}")

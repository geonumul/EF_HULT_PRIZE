#!/bin/bash
# 사진에서 보정한 카메라로 그린 가이드(tools/guides)로 우드톤 기준 이미지를 만들고, 화이트 미니멀과 인더스트리얼은 기준 이미지를 고쳐서 만든다.
# 실행(functions에서): bash tools/make_guided_renders.sh   먼저 python tools/build_plans.py 와 guide_render.py로 가이드를 만든다(docs/RENDER_API.md 참고).
set -u
cd "$(dirname "$0")/.."
OUT="$PWD/tools/guides/out"
WOOD="Style: warm natural wood tones, oak furniture, warm lighting"
WHITE="white minimal, white walls, light oak furniture, bright clean Scandinavian feel"
INDUSTRIAL="industrial, exposed concrete and black steel, dark metal pendant lights, leather and dark wood"
has_image() { compgen -G "$1/*-1.jpg" >/dev/null || compgen -G "$1/*-1.png" >/dev/null; }
run() { local dir="$1"; shift; has_image "$dir" && { echo "건너뜀: $dir"; return 0; }; node lib/scripts/pregenerate.js "$@" --count 1 --out "$dir" 2>&1 | grep -E "시도|저장|실패" | cut -c1-240; has_image "$dir"; }
# 인수: 키(예: 08-cafe), 업종, 비율
make() {
  local key="$1" use="$2" aspect="$3"
  run "$OUT/$key-wood" --use "$use" --ceiling 3000 --layout "tools/plans-src/$key.json" --photo "tools/guides/$key-guide-photo.jpg" --structure "tools/guides/$key-guide.png" --structure-kind guide --aspect "$aspect" --attempts 2 --prompt "$WOOD" || { echo "실패: $key wood"; return; }
  local base; base=$(ls "$OUT/$key-wood"/$use-1.* | head -1)
  run "$OUT/$key-white" --use "$use" --ceiling 3000 --layout "tools/plans-src/$key.json" --photo "$base" --restyle --aspect "$aspect" --attempts 1 --prompt "$WHITE" || echo "실패: $key white"
  run "$OUT/$key-industrial" --use "$use" --ceiling 3000 --layout "tools/plans-src/$key.json" --photo "$base" --restyle --aspect "$aspect" --attempts 1 --prompt "$INDUSTRIAL" || echo "실패: $key industrial"
}
make 08-cafe cafe 3:2
make 08-popup popup 3:2
make 08-pilates pilates 3:2
make 02-popup popup 4:3
make 02-pilates pilates 4:3
echo "끝"

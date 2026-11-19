#!/bin/bash
# 시연용 렌더링 27장을 만든다: 공간 사진 3개 x 업종 3개 x 스타일 3개. 이미지 한 장에 약 $0.034이고 검수에 실패하면 다시 만들어서 전체 $1.5~2.5가 든다.
# 우드톤을 기준 이미지로 만들고(건축 선화 가이드 + 설계 기준 자동 검수, 최대 4번), 화이트 미니멀과 인더스트리얼은 기준 이미지를 고쳐서 만든다(최대 2번).
# 실행(저장소 루트에서): bash functions/tools/make_demo_renders.sh   먼저 functions에서 npm run build, functions/.env에 GEMINI_API_KEY가 필요하다.
# 끝나면 python functions/tools/collect_renders.py 로 결과를 frontend/public/images/renders에 옮긴다.
set -u
cd "$(dirname "$0")/.."
OUT="$PWD/renders-raw-v2"
PHOTOS="../frontend/public/images/spaces"
mkdir -p "$OUT/edges"

WOOD="Style: warm natural wood tones, oak furniture, warm lighting"
WHITE="white minimal, white walls, light oak furniture, bright clean Scandinavian feel"
INDUSTRIAL="industrial, exposed concrete and black steel, dark metal pendant lights, leather and dark wood"

has_image() {  # 폴더에 생성된 이미지가 있으면 성공
  compgen -G "$1/*-1.jpg" >/dev/null || compgen -G "$1/*-1.png" >/dev/null || compgen -G "$1/*-1.jpeg" >/dev/null
}

run() {  # 인수: 출력 폴더, 이어서 pregenerate 옵션. 이미 만든 이미지는 건너뛴다.
  local dir="$1"; shift
  has_image "$dir" && { echo "건너뜀(이미 있음): $dir"; return 0; }
  node lib/scripts/pregenerate.js "$@" --count 1 --out "$dir" 2>&1 | grep -E "시도|저장|실패" | cut -c1-220
  has_image "$dir"
}

make_space() {  # 인수: 사진 번호, 가로(mm), 깊이(mm)
  local n="$1" w="$2" d="$3"
  local edges="$OUT/edges/space-$n-edges.png"
  [ -f "$edges" ] || python tools/edge_map.py "$PHOTOS/space-$n.jpg" "$edges" >/dev/null
  for use in cafe popup pilates; do
    base="$OUT/$n-$use-wood"
    run "$base" --use "$use" --width "$w" --depth "$d" --ceiling 3000 --attempts 4 --photo "$PHOTOS/space-$n.jpg" --structure "$edges" --structure-kind edges --prompt "$WOOD" || { echo "실패: $n $use wood"; continue; }
    baseimg=$(ls "$base"/$use-1.* | head -1)
    run "$OUT/$n-$use-white" --use "$use" --width "$w" --depth "$d" --ceiling 3000 --attempts 2 --photo "$baseimg" --restyle --prompt "$WHITE" || echo "실패: $n $use white"
    run "$OUT/$n-$use-industrial" --use "$use" --width "$w" --depth "$d" --ceiling 3000 --attempts 2 --photo "$baseimg" --restyle --prompt "$INDUSTRIAL" || echo "실패: $n $use industrial"
  done
}

# 사진 번호, 가로, 깊이(mm). 성수동2가 331-14(90㎡), 성수동2가 315-30(89㎡), 성수동2가 333-41(66㎡)에 붙는 사진이다.
make_space 02 8000 11200
make_space 08 8000 11170
make_space 09 6860 9610
echo "끝. python functions/tools/collect_renders.py 를 실행하세요."

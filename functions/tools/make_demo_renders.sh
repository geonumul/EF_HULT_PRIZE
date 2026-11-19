#!/bin/bash
# 시연용 렌더링 27장을 만든다: 공간 사진 3개 x 업종 3개 x 스타일 3개. 이미지 한 장에 약 $0.034, 전체 약 $0.9가 든다.
# 우드톤을 기준 이미지로 만들고, 화이트 미니멀과 인더스트리얼은 기준 이미지를 고쳐서 만들어 구도를 같게 한다.
# 실행(저장소 루트에서): bash functions/tools/make_demo_renders.sh   먼저 functions에서 npm run build, functions/.env에 GEMINI_API_KEY가 필요하다.
# 끝나면 python functions/tools/collect_renders.py 로 결과를 frontend/public/images/renders에 옮긴다.
set -u
cd "$(dirname "$0")/.."
OUT="$PWD/renders-raw"
PHOTOS="../frontend/public/images/spaces"
mkdir -p "$OUT"

WOOD="warm natural wood tones, oak furniture, warm lighting"
WHITE="white minimal, white walls, light oak furniture, bright clean Scandinavian feel"
INDUSTRIAL="industrial, exposed concrete and black steel, dark metal pendant lights, leather and dark wood"

run() {  # 인수: 출력 폴더, 이어서 pregenerate 옵션. 실패하면 한 번 더 한다.
  local dir="$1"; shift
  for attempt in 1 2; do
    node lib/scripts/pregenerate.js "$@" --count 1 --out "$dir" 2>&1 | tail -1
    ls "$dir"/*.jp* "$dir"/*.png >/dev/null 2>&1 && return 0
    sleep 5
  done
  return 1
}

make_space() {  # 인수: 사진 번호, 가로(mm), 깊이(mm)
  local n="$1" w="$2" d="$3"
  for use in cafe popup pilates; do
    base="$OUT/$n-$use-wood"
    run "$base" --use "$use" --width "$w" --depth "$d" --ceiling 3000 --photo "$PHOTOS/space-$n.jpg" --prompt "Style: $WOOD" || { echo "실패: $n $use wood"; continue; }
    baseimg=$(ls "$base"/$use-1.* | head -1)
    run "$OUT/$n-$use-white" --use "$use" --width "$w" --depth "$d" --ceiling 3000 --photo "$baseimg" --restyle --prompt "$WHITE" || echo "실패: $n $use white"
    run "$OUT/$n-$use-industrial" --use "$use" --width "$w" --depth "$d" --ceiling 3000 --photo "$baseimg" --restyle --prompt "$INDUSTRIAL" || echo "실패: $n $use industrial"
  done
}

# 사진 번호, 가로, 깊이. 성수동1가 14-53(40㎡), 성수동2가 331-14(90㎡), 성수동2가 310-7(88㎡)에 붙는 사진이다.
make_space 01 5400 7500
make_space 02 8000 11200
make_space 03 7900 11100
echo "끝. python functions/tools/collect_renders.py 를 실행하세요."

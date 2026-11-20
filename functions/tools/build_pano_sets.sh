#!/bin/bash
# 공간, 업종, 스타일마다 사방 이미지를 만든다. 개발 서버(3100)가 떠 있고 puppeteer-core가 NODE_PATH에 있어야 한다.
# 이미지 한 장에 약 50원이고, 묶음 하나(네 장)에 약 200원이다. 이미 있는 묶음은 건너뛴다.
#   NODE_PATH=<node_modules 경로> bash functions/tools/build_pano_sets.sh
set -u
cd "$(dirname "$0")/../.."
WORK="${PANO_WORK:-functions/tools/pano-out}"
RENDERS=frontend/public/images/renders
# 공간 번호:공간 id:업종들
SPACES=("08:1120011500103150030-1:cafe popup pilates" "02:1120011500103310014-1:popup pilates")
declare -A NAME=([cafe]="a cafe" [popup]="a pop-up retail store" [pilates]="a pilates studio")
for entry in "${SPACES[@]}"; do
  IFS=: read -r number id uses <<< "$entry"
  for use in $uses; do
    models="$WORK/models/$number-$use"
    ls "$models"/view-270.png >/dev/null 2>&1 || node functions/tools/capture_pano_views.cjs "$models" "$id" "$use" || { echo "촬영 실패: $number-$use"; continue; }
    for style in wood white industrial; do
      key="$number-$use-$style"
      node functions/tools/pano_views.mjs "$models" "$RENDERS/space-$key.jpg" "$WORK/$key" "${NAME[$use]}" 0,90,180,270 2>&1 | tail -4
    done
  done
done
python functions/tools/build_pano_sets.py "$WORK"

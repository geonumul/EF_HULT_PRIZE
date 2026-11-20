// 방 안 한 자리에서 사방을 찍은 AI 이미지 묶음. 3D 360 보기가 이 이미지들을 모형 위에 입힌다.
// 이미지는 public/images/pano/<사진 번호>-<업종>-<스타일>-<방향>.jpg이고, 만드는 법은 docs/STUDIO_EDIT_3D.md의 "사방 이미지 만들기"에 있다.
// 아래 PANO_KEYS는 functions/tools/build_pano_sets.py가 이미지 폴더를 읽어 만든다. 직접 고치지 않는다.
import type { UseType } from "@/types";
import type { Room } from "@/lib/api/functions";
import type { RenderStyleKey } from "@/types/studio";

export type PanoSet = {
  /** 같은 묶음인지 알아보는 이름. 이름이 같으면 이미지를 다시 읽지 않는다. */
  id: string;
  /** 서 있는 자리(모형 좌표, mm). 도면 x, 눈높이, 도면 y */
  position: [number, number, number];
  hfovDeg: number;
  /** 이미지 가로 / 세로 */
  aspect: number;
  /** yaw는 도. 0이 안쪽 벽 방향이고 시계 방향으로 커진다. */
  views: { yaw: number; url: string }[];
};

// build_pano_sets.py 시작
export const PANO_KEYS: string[] = ["02-popup-white", "02-popup-wood", "08-cafe-industrial", "08-cafe-white", "08-cafe-wood", "08-pilates-industrial", "08-pilates-white", "08-pilates-wood", "08-popup-industrial", "08-popup-white", "08-popup-wood"];
// build_pano_sets.py 끝

/** 방 안에서 서 있는 자리. functions/tools/capture_pano_views.cjs가 모형을 찍는 자리와 같다. */
export function panoPosition(room: Room): [number, number, number] {
  return [Math.round(room.widthMm * 0.55), 1500, Math.round(room.depthMm * 0.72)];
}

export function panoSetOf(spaceNumber: string | null, use: UseType, style: RenderStyleKey, room: Room | null): PanoSet | null {
  const key = `${spaceNumber}-${use}-${style}`;
  if (!spaceNumber || !room || !PANO_KEYS.includes(key)) return null;
  return {
    id: key,
    position: panoPosition(room),
    hfovDeg: 100,
    aspect: 4 / 3,
    views: [0, 90, 180, 270].map((yaw) => ({ yaw, url: `/images/pano/${key}-${yaw}.jpg` })),
  };
}

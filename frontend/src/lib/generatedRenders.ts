// 사전 생성한 렌더링 이미지. 공간 사진, 업종, 스타일마다 한 장씩 있다.
// 파일은 public/images/renders/space-<사진 번호>-<업종>-<스타일>.jpg 이다. 만들어 둔 조합은 generatedRenders.manifest.ts에 있다.
// 목록에 없는 조합은 기존 기본 이미지에 색 필터를 걸어 보여 준다.
import type { RenderStyleKey } from "@/types/studio";
import { GENERATED_RENDERS } from "./generatedRenders.manifest";

/** 공간 사진 경로("/images/spaces/space-02.jpg")에서 번호("02")를 꺼낸다. */
function photoNumberOf(thumbnail: string): string | null {
  return thumbnail.match(/\/images\/spaces\/space-(\d\d)\.jpg$/)?.[1] ?? null;
}

/** 이 공간, 업종, 스타일로 만들어 둔 렌더링 주소. 없으면 null. */
export function generatedRenderUrl(thumbnail: string, use: string, style: RenderStyleKey): string | null {
  const number = photoNumberOf(thumbnail);
  if (!number || !GENERATED_RENDERS.includes(`${number}-${use}-${style}`)) return null;
  return `/images/renders/space-${number}-${use}-${style}.jpg`;
}

/** 이 공간 사진으로 만든 렌더링이 하나라도 있으면 true. 사전 생성한 공간이다. */
export function hasGeneratedSpace(thumbnail: string): boolean {
  const number = photoNumberOf(thumbnail);
  return number !== null && GENERATED_RENDERS.some((name) => name.startsWith(`${number}-`));
}

/** 사전 생성한 공간인데 이 업종의 이미지가 없으면 true. 이 업종 탭은 기본 이미지가 대신 보여 공간과 맞지 않는다. */
export function isUseMissing(thumbnail: string, use: string): boolean {
  const number = photoNumberOf(thumbnail);
  if (!number || !hasGeneratedSpace(thumbnail)) return false;
  return !GENERATED_RENDERS.some((name) => name.startsWith(`${number}-${use}-`));
}

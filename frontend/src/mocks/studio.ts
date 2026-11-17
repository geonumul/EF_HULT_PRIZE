// 스튜디오 화면의 가짜 데이터. 스타일 이름과 추천 요청 문구는 Figma S03, S04 시안을 따른다.
import type { RenderStyleKey } from "@/types/studio";

// 스타일마다 이미지에 CSS 필터를 걸어 다른 분위기처럼 보이게 한다. 실제 서비스에서는 스타일별로 이미지를 새로 만든다.
export const RENDER_STYLES: { key: RenderStyleKey; label: string; filter: string }[] = [
  { key: "wood", label: "우드톤", filter: "none" },
  { key: "white", label: "화이트 미니멀", filter: "brightness(1.12) saturate(0.55) contrast(0.95)" },
  { key: "industrial", label: "인더스트리얼", filter: "grayscale(0.55) contrast(1.1) brightness(0.9)" },
];

/** 채팅 화면 입력창 위에 놓이는 추천 요청 문구 */
export const QUICK_REQUESTS = ["조명 더 밝게", "좌석 늘리기", "화이트 톤"];

/** "+ 업종 추가"를 눌렀을 때 보이는 아직 렌더링이 없는 업종 */
export const COMING_USES = ["restaurant", "retail", "service", "office"] as const;

// 스튜디오(S03)와 텍스트 렌더링 요청(S04)에서 쓰는 타입.
import type { UseType } from "./index";

/** 스튜디오가 보여 주는 화면. 업종 하나이거나 빈 공간이다. */
export type StudioView = UseType | "empty";

/** 렌더링 이미지의 스타일. 시안 아래쪽 스타일 바의 항목이다. */
export type RenderStyleKey = "wood" | "white" | "industrial";

/** 스튜디오의 렌더링 방식. image는 이미지 먼저, products는 상품 먼저 */
export type StudioMode = "image" | "products";

/** AI가 제안한 배치 계획 */
export type ChatPlan = {
  tables: number;
  seats: number;
  aisleMm: number; // 통로 폭
  waitingM: number; // 카운터 앞 대기 공간
};

/** 치수 검증 한 줄. ok가 false면 주황 경고로 보인다. */
export type ChatCheck = { ok: boolean; text: string };

export type ChatMessage =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "ai"; text?: string; plan?: ChatPlan; checks?: ChatCheck[] }
  | { id: number; kind: "rendering"; progress: number; seconds?: number; renderId?: string };

/** 새로 넣을 메시지. id는 넣을 때 붙인다. */
export type NewChatMessage =
  | { kind: "user"; text: string }
  | { kind: "ai"; text?: string; plan?: ChatPlan; checks?: ChatCheck[] }
  | { kind: "rendering"; progress: number };

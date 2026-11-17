// 공실 지도 화면(S01, S02)에서만 쓰는 타입.
import type { UseType } from "./index";

/** 목록 정렬 기준 */
export type SortKey = "latest" | "cost" | "popular";

/** 지도 위 필터 칩 세 개의 켜짐 상태 */
export type MapFilters = {
  under5000: boolean; // 창업비 5천만 이하
  firstFloorOnly: boolean; // 1층만
  noPremium: boolean; // 권리금 없음
};

/** 여러 공실을 묶어 숫자로 보여 주는 핀. 정적 지도에서만 쓴다. */
export type ClusterPin = {
  id: string;
  count: string; // "8", "100+"
  x: number; // 지도 안 위치 (0~100 %)
  y: number;
  uses: UseType[]; // 이 묶음에 들어 있는 업종
};

/** 카테고리 탭 하나. use가 null이면 "전체" */
export type CategoryTab = {
  label: string;
  use: UseType | null;
};

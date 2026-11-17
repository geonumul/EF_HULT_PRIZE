// 금액과 면적을 화면에 보이는 글자로 바꾸는 작은 함수 모음.

/** 4200 → "4,200만" */
export function formatMan(value: number): string {
  return `${value.toLocaleString("ko-KR")}만`;
}

/** 1140000 → "1,140,000원" */
export function formatWon(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

/** 39.6 → "39.6m²" */
export function formatArea(areaM2: number): string {
  return `${areaM2}m²`;
}

/** 업종 id를 화면에 보이는 이름으로 바꾼다. */
export const USE_LABELS = {
  cafe: "카페",
  popup: "팝업",
  pilates: "필라테스",
  restaurant: "음식점",
  retail: "소매점",
  service: "서비스",
  office: "사무실",
} as const;

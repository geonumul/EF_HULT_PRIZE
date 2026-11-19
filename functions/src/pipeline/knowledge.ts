// 건축, 인테리어 기본 기준표. 배치 규칙과 검증이 읽는 값을 한 곳에 모은다. 단위는 mm다.
// status는 값이 얼마나 확인되었는지 알려 준다. 공간디자인 전공 팀원이 검수한 뒤 "검수됨"으로 바꾼다.
//   general: 일반적으로 쓰는 설계 기준. 출처 확인 전.
//   law:     법령에 근거가 있다고 알려진 값. 법령 원문 확인 전.
//   temp:    임시값. 전문가 확인이 필요하다.
// docs/DESIGN_KNOWLEDGE.md가 같은 내용을 설명한다. 값을 바꿀 때는 둘을 함께 고친다.

export type RuleStatus = "general" | "law" | "temp" | "reviewed";

export interface DesignRule {
  id: string;
  group: "동선" | "입구" | "높이" | "업종" | "조닝";
  label: string;
  /** 정해진 값 하나. 범위는 min, max로 적는다. */
  valueMm?: number;
  minMm?: number;
  maxMm?: number;
  /** 배치 검증이나 구조 그림에 실제로 쓰고 있으면 true */
  enforced: boolean;
  status: RuleStatus;
  note: string;
}

export const DESIGN_RULES: DesignRule[] = [
  // 동선
  { id: "aisle.main", group: "동선", label: "주 통로 폭(입구에서 카운터와 좌석 구역으로 가는 길)", valueMm: 1200, enforced: false, status: "general", note: "두 사람이 마주 지나갈 수 있는 폭. 현재 배치는 줄 사이 900을 쓴다." },
  { id: "aisle.sub", group: "동선", label: "보조 통로 폭", valueMm: 900, enforced: true, status: "general", note: "줄 사이 통로. 검증의 최소값은 850, 배치할 때는 900을 둔다." },
  { id: "aisle.staff", group: "동선", label: "카운터 안쪽 직원 동선 폭", minMm: 900, maxMm: 1000, enforced: false, status: "temp", note: "바 안에서 직원이 오가는 폭." },
  { id: "chair.pullout", group: "동선", label: "의자를 빼고 앉고 일어서는 여유(의자 뒤)", valueMm: 450, enforced: true, status: "general", note: "테이블 한 세트의 깊이에 의자 깊이 450을 양쪽에 더해 계산한다." },
  { id: "chair.passby", group: "동선", label: "앉은 사람 뒤로 다른 사람이 지나갈 때 의자 뒤 폭", valueMm: 900, enforced: false, status: "general", note: "의자 뒤가 통로이면 이 폭이 필요하다." },
  { id: "table.gap", group: "동선", label: "테이블과 테이블 사이(좌우)", valueMm: 600, enforced: true, status: "general", note: "나란히 놓이는 테이블 가장자리 사이." },
  { id: "wall.margin", group: "동선", label: "벽과 집기 사이 기본 여유", valueMm: 300, enforced: true, status: "temp", note: "벽에 붙이는 집기(카운터, 선반)는 예외로 다룰 수 있다. 벽 쪽에 의자가 있으면 의자 뒤 450이 필요하다." },
  // 입구
  { id: "entry.clear", group: "입구", label: "입구 앞 비움 구역(폭 × 깊이)", valueMm: 1200, enforced: true, status: "general", note: "문이 열리고 사람이 멈추는 자리. 폭 1200, 깊이 1200 안에는 집기를 놓지 않는다." },
  { id: "door.width", group: "입구", label: "출입문 유효 폭 최소", minMm: 900, enforced: false, status: "law", note: "장애인등편의법 기준으로 알려진 값. 원문 확인 필요." },
  { id: "wheelchair.turn", group: "입구", label: "휠체어 회전 지름", valueMm: 1500, enforced: false, status: "law", note: "장애인등편의법 기준으로 알려진 값. 원문 확인 필요." },
  { id: "route.width", group: "입구", label: "접근 통로 유효 폭", minMm: 1200, enforced: false, status: "law", note: "장애인등편의법 기준으로 알려진 값. 원문 확인 필요." },
  // 높이
  { id: "height.table", group: "높이", label: "테이블 상판 높이", minMm: 720, maxMm: 750, enforced: true, status: "general", note: "구조 그림은 상품의 실제 높이를 쓴다." },
  { id: "height.seat", group: "높이", label: "의자 좌면 높이", minMm: 430, maxMm: 460, enforced: true, status: "general", note: "구조 그림은 450으로 그린다." },
  { id: "height.counter", group: "높이", label: "바 카운터 높이", minMm: 1000, maxMm: 1100, enforced: true, status: "general", note: "서비스 카운터는 900 안팎. 휠체어 대응 구간은 더 낮게." },
  { id: "height.pendant", group: "높이", label: "펜던트 조명 바닥에서 테이블 상판까지", minMm: 750, maxMm: 900, enforced: false, status: "general", note: "테이블 위에 달 때. 지금은 천장 쪽에 일정 높이로 그린다." },
  { id: "height.ceiling", group: "높이", label: "거실 반자(천장) 높이 최소", minMm: 2100, enforced: false, status: "law", note: "건축법령으로 알려진 값. 원문 확인 필요." },
  // 업종
  { id: "cafe.seatArea", group: "업종", label: "카페 좌석 한 개당 면적(㎡)", minMm: 1.2, maxMm: 1.8, enforced: false, status: "temp", note: "mm가 아니라 ㎡ 단위. 좌석 수를 정하는 참고값." },
  { id: "pilates.reformer", group: "업종", label: "리포머 한 대 차지 폭(좌우 여유 포함)", minMm: 1300, maxMm: 1600, enforced: false, status: "temp", note: "기구 700에 양옆 여유. 머리와 발 쪽에도 600 이상." },
  { id: "popup.aisle", group: "업종", label: "팝업 진열 통로 폭", valueMm: 1200, enforced: false, status: "temp", note: "손님이 둘러보며 멈추는 폭. 중앙 진열대 높이는 1200 이하로 시선을 열어 둔다." },
  // 조닝
  { id: "zone.cafe", group: "조닝", label: "카페 구역 비율(좌석 홀 : 카운터와 주방 : 저장과 직원)", note: "대략 60~70 : 20~25 : 10~15. 입구에서 카운터가 보이고, 저장과 직원 구역은 안쪽에 둔다.", enforced: false, status: "temp" },
];

export function ruleOf(id: string): DesignRule {
  const rule = DESIGN_RULES.find((candidate) => candidate.id === id);
  if (!rule) throw new Error(`기준을 찾을 수 없습니다: ${id}`);
  return rule;
}

/** 입구 앞 비움 구역의 폭과 깊이(mm) */
export const ENTRY_CLEAR_MM = ruleOf("entry.clear").valueMm as number;

/** 입구 앞 비움 구역. 입구는 앞쪽 벽(깊이 끝) 가운데에 있다고 본다. */
export function entryZone(room: { widthMm: number; depthMm: number }): { left: number; right: number; top: number } {
  const left = (room.widthMm - ENTRY_CLEAR_MM) / 2;
  return { left, right: left + ENTRY_CLEAR_MM, top: room.depthMm - ENTRY_CLEAR_MM };
}

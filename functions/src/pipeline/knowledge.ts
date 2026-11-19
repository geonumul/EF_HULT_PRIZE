// 건축, 인테리어 기준표. 배치 규칙, 검증, 법령 점검, 이미지 요청이 읽는 값을 한 곳에 모은다.
// 값은 웹 조사로 모았고 출처와 확인 정도를 함께 적는다. docs/DESIGN_KNOWLEDGE.md가 같은 내용을 설명한다. 값을 바꿀 때는 둘을 함께 고친다.
//
// status: 값을 얼마나 확인했는지
//   original  법령 원문(별표 PDF)을 직접 읽어 확인했다. 개정 여부는 시행일 기준으로만 안다.
//   secondary 법령 해설이나 법령 미러 자료로 확인했다. 최신 개정 확인 전이다.
//   survey    여러 업체, 가이드 자료를 종합했다. 대부분 미국 자료이고 출처마다 값이 다르다. 한국 기준이 아닐 수 있다.
//   proposal  근거가 약한 제안값이다. 공간디자인 전공 팀원의 검수가 필요하다.
// 공간디자인 전공 팀원이 검수한 값은 status를 reviewed로 바꾼다.

export type RuleStatus = "original" | "secondary" | "survey" | "proposal" | "reviewed";
export type RuleUnit = "mm" | "㎡" | "lux" | "K" | "%";

export interface DesignRule {
  id: string;
  group: "동선" | "입구" | "높이" | "법령" | "카페" | "필라테스" | "팝업" | "조명" | "카메라";
  label: string;
  unit: RuleUnit;
  /** 정해진 값 하나. 범위는 min, max로 적는다. */
  value?: number;
  min?: number;
  max?: number;
  /** 배치, 검증, 점검, 이미지 요청 중 하나에 실제로 쓰고 있으면 true */
  enforced: boolean;
  status: RuleStatus;
  source: string;
  note: string;
}

const LAW = "건축법 시행령 별표1";
const DISABLED_RULE = "장애인등편의법 시행규칙 별표1(해설 자료)";

export const DESIGN_RULES: DesignRule[] = [
  // ---- 동선 ----
  { id: "aisle.main", group: "동선", label: "주 통로 폭", unit: "mm", min: 1200, max: 1520, enforced: false, status: "survey", source: "Oak Street 좌석 가이드, 장애인등편의법 복도 1.2m", note: "입구에서 카운터와 좌석 구역으로 가는 길. 두 사람이 마주 지나가는 폭." },
  { id: "aisle.sub", group: "동선", label: "보조 통로 폭", unit: "mm", min: 910, max: 1120, value: 900, enforced: true, status: "survey", source: "Oak Street 좌석 가이드", note: "줄 사이 통로. 배치는 900을 쓰고, 검증 최소값은 850이다." },
  { id: "aisle.staff", group: "동선", label: "카운터 안쪽 직원 통로 폭", unit: "mm", min: 610, max: 760, enforced: false, status: "proposal", source: "RFP Space Planning 자료", note: "출처 1건이고 약하다." },
  { id: "chair.pullout", group: "동선", label: "의자 뒤 여유(앉고 일어서는 공간)", unit: "mm", value: 450, enforced: true, status: "survey", source: "Oak Street 좌석 가이드(약 460)", note: "테이블 세트 깊이에 양쪽 450을 더한다." },
  { id: "chair.back", group: "동선", label: "테이블 사이 의자 간격", unit: "mm", min: 610, max: 760, enforced: false, status: "survey", source: "Oak Street, Toast 가이드", note: "앉은 사람 뒤로 지나가려면 더 넓어야 한다." },
  { id: "table.gap", group: "동선", label: "나란한 테이블 가장자리 사이", unit: "mm", value: 600, enforced: true, status: "survey", source: "좌석 간격 24~30in 요약", note: "" },
  { id: "wall.margin", group: "동선", label: "벽과 집기 사이 기본 여유", unit: "mm", value: 300, enforced: true, status: "proposal", source: "자체 설정", note: "벽에 붙이는 집기(카운터, 선반)는 예외로 다룰 수 있다." },
  { id: "aisle.retail.main", group: "동선", label: "소매 주 통로 폭", unit: "mm", min: 1200, max: 1800, enforced: false, status: "survey", source: "storesupply.com 통로 가이드", note: "" },
  { id: "aisle.retail.sub", group: "동선", label: "소매 보조 통로 폭", unit: "mm", min: 900, max: 1200, enforced: false, status: "survey", source: "storesupply.com 통로 가이드", note: "진열대 사이 최소 760~910." },
  { id: "aisle.accessible", group: "동선", label: "접근 가능 통로 폭(휠체어)", unit: "mm", min: 910, max: 1070, enforced: false, status: "survey", source: "ADA 소매 가이드(미국)", note: "미국 기준. 한국 기준은 복도 1.2m(별표1 제7호)." },
  // ---- 입구 ----
  { id: "entry.clear", group: "입구", label: "입구 앞 비움 구역(폭과 깊이)", unit: "mm", value: 1200, enforced: true, status: "secondary", source: DISABLED_RULE + " 제6호 출입구 전면 유효거리 1.2m", note: "문이 열리고 사람이 멈추는 자리. 이 안에는 집기를 놓지 않는다." },
  { id: "door.width", group: "입구", label: "출입문 통과 유효 폭", unit: "mm", min: 900, enforced: false, status: "secondary", source: DISABLED_RULE + " 제6호", note: "장애인 이용 출입구. 자동문이 아니면 문 옆 활동공간 600 이상." },
  { id: "door.side", group: "입구", label: "여닫이문 옆 활동공간", unit: "mm", min: 600, enforced: false, status: "secondary", source: DISABLED_RULE + " 제6호", note: "" },
  { id: "threshold", group: "입구", label: "주출입구 높이 차이", unit: "mm", max: 20, enforced: false, status: "secondary", source: DISABLED_RULE + " 제5호, 제6호", note: "문턱은 두지 않는 것이 원칙이고 부득이하면 2cm 이하." },
  { id: "route.width", group: "입구", label: "접근로, 복도, 경사로 유효 폭", unit: "mm", min: 1200, enforced: false, status: "secondary", source: DISABLED_RULE + " 제1호, 제7호, 제12호", note: "경사로 시작, 끝, 굴절부는 1500×1500 활동공간." },
  { id: "toilet.accessible", group: "입구", label: "장애인 화장실 대변기 유효 바닥(폭×깊이)", unit: "mm", value: 1600, enforced: false, status: "secondary", source: DISABLED_RULE + " 제13호", note: "신축 1.6m×2.0m, 전면 회전공간 1.4m×1.4m. 기존 시설은 1.0m×1.8m까지 완화." },
  // ---- 높이 ----
  { id: "height.ceiling", group: "높이", label: "거실 반자(천장) 높이 최소", unit: "mm", min: 2100, enforced: true, status: "secondary", source: "건축물의 피난·방화구조 등의 기준에 관한 규칙 제16조", note: "공장, 창고 등은 제외. 관람석, 집회실 200㎡ 이상은 4m." },
  { id: "height.table", group: "높이", label: "테이블 상판 높이", unit: "mm", min: 720, max: 750, enforced: true, status: "proposal", source: "일반 설계 기준(출처 확인 전)", note: "구조 그림은 상품의 실제 높이를 쓴다." },
  { id: "height.seat", group: "높이", label: "의자 좌면 높이", unit: "mm", min: 430, max: 460, enforced: true, status: "proposal", source: "일반 설계 기준(출처 확인 전)", note: "구조 그림은 450으로 그린다." },
  { id: "height.counter", group: "높이", label: "바 카운터 높이", unit: "mm", min: 1000, max: 1100, enforced: true, status: "survey", source: "한국 카페 인테리어 업체 글(약 1050), ADA 바 가이드", note: "ADA는 상판 710~865 접근 구간을 요구한다(미국)." },
  { id: "height.desk", group: "높이", label: "접수대, 작업대 상단 높이(휠체어 이용)", unit: "mm", min: 700, max: 900, enforced: false, status: "secondary", source: DISABLED_RULE + " 제21호", note: "음식점 카운터에 적용되는지는 확인 전." },
  { id: "height.gondola", group: "높이", label: "소매 곤돌라 진열대 높이", unit: "mm", min: 1220, max: 1830, enforced: false, status: "survey", source: "txstorefixtures 가이드", note: "독립 진열대. 중앙 진열대는 시선을 열어 두는 높이가 좋다." },
  // ---- 법령(분류, 대상) ----
  { id: "law.cafe300", group: "법령", label: "휴게음식점, 제과점 1종 근생 면적 상한", unit: "㎡", value: 300, enforced: true, status: "original", source: LAW + " 제3호나목, 제4호", note: "300㎡ 미만이면 1종 근린생활시설, 이상이면 2종. 일반음식점은 면적과 관계없이 2종." },
  { id: "law.academy500", group: "법령", label: "학원, 체력단련장 2종 근생 면적 상한", unit: "㎡", value: 500, enforced: false, status: "original", source: LAW + " 제4호", note: "500㎡ 미만이 2종 근린생활시설. 필라테스가 학원인지 체력단련장업인지는 확정 전." },
  { id: "law.barrierfree", group: "법령", label: "장애인 편의시설 설치 대상 면적(음식점, 소매점)", unit: "㎡", value: 50, enforced: true, status: "secondary", source: "장애인등편의법 시행령 별표1(해설, 신문 기사)", note: "2022.5.1 이후 신축, 증축, 개축, 재축 건물부터 적용. 기존 건물에 새로 입점하는 경우는 제외." },
  { id: "law.fire100", group: "법령", label: "음식점 영업장 다중이용업 소방시설 대상 면적", unit: "㎡", value: 100, enforced: true, status: "original", source: "식품위생법 시행규칙 별표14 제8호나목", note: "지하층은 66㎡. 지상 1층이고 주출입구가 지면과 직접 연결되면 제외." },
  { id: "law.exit33", group: "법령", label: "비상구 예외: 피난층 개방 영업장 면적 상한", unit: "㎡", value: 33, enforced: false, status: "original", source: "다중이용업소법 시행령 별표1의2(2020.12.1. 본)", note: "구획된 실이 없고 각 부분에서 출입구까지 수평거리 10m 이하일 때." },
  { id: "law.basement50", group: "법령", label: "지하층 비상탈출구 필요 거실 면적", unit: "㎡", value: 50, enforced: false, status: "secondary", source: "피난·방화구조 규칙 제25조", note: "유효폭 0.75m 이상, 유효높이 1.5m 이상." },
  { id: "law.partition", group: "법령", label: "휴게음식점 객석 칸막이 높이", unit: "mm", max: 1500, enforced: false, status: "original", source: "식품위생법 시행규칙 별표14 제8호나목", note: "객실은 둘 수 없고, 2면 이상 완전히 막으면 안 된다." },
  // ---- 카페 ----
  { id: "cafe.seatArea", group: "카페", label: "좌석 한 개당 면적", unit: "㎡", min: 1.1, max: 1.9, value: 1.4, enforced: false, status: "survey", source: "Toast 가이드", note: "카페와 일반 식당 약 1.4㎡, 파인다이닝 1.7~1.9㎡, 밀집 0.9㎡." },
  { id: "cafe.hallRatio", group: "카페", label: "손님 홀 비율(나머지는 주방, 저장, 직원)", unit: "%", value: 60, enforced: false, status: "survey", source: "The Restaurant HQ 가이드", note: "60:40이 흔한 기준. 후방 30~40%." },
  // ---- 필라테스 ----
  { id: "pilates.gap", group: "필라테스", label: "리포머 사이 간격", unit: "mm", min: 450, max: 1200, value: 900, enforced: true, status: "survey", source: "studiogrowth, marianatek(출처 간 차이 큼)", note: "배치는 900을 쓰고 기구마다 양쪽 450씩 여유를 둔다." },
  { id: "pilates.head", group: "필라테스", label: "리포머 머리, 발 쪽 여유", unit: "mm", value: 1830, enforced: false, status: "survey", source: "marianatek(리포머 뒤 최소 6ft)", note: "측면 여유는 610." },
  { id: "pilates.area", group: "필라테스", label: "리포머 1대가 차지하는 면적", unit: "㎡", min: 3.7, max: 7.4, enforced: false, status: "survey", source: "marianatek, skelcore", note: "강사 여유 포함 3.7~4.6㎡, 넓게 잡으면 5.6~7.4㎡." },
  { id: "pilates.ceiling", group: "필라테스", label: "스튜디오 천장 높이 최소 권장", unit: "mm", min: 2740, enforced: false, status: "survey", source: "marianatek, studiogrowth", note: "측정은 마감 바닥에서 보, 덕트, 스프링클러 같은 가장 낮은 장애물까지. 법정 최소는 2100." },
  { id: "pilates.corridor", group: "필라테스", label: "스튜디오 복도 폭 최소", unit: "mm", min: 910, enforced: false, status: "survey", source: "marianatek", note: "" },
  { id: "pilates.support", group: "필라테스", label: "대기, 탈의, 수납 면적(㎡ 순서대로 9~14, 5~9, 5~7)", unit: "㎡", min: 5, max: 14, enforced: false, status: "survey", source: "studiogrowth", note: "한국 학원, 체력단련장 시설 기준 수치는 확인하지 못했다." },
  // ---- 팝업 ----
  { id: "popup.aisle", group: "팝업", label: "진열 통로 폭", unit: "mm", min: 900, max: 1800, value: 1200, enforced: true, status: "survey", source: "storesupply.com", note: "주 통로 1.2~1.8m, 보조 0.9~1.2m. 막다른 통로는 300 더 넓게." },
  { id: "popup.lux", group: "팝업", label: "매장 일반 조도", unit: "lux", min: 300, max: 500, enforced: true, status: "survey", source: "c-store.com.au, lightingdesignonline", note: "강조 조명 750~1500, 강조와 일반 비율 2:1~5:1(일반 3:1)." },
  // ---- 조명 ----
  { id: "light.cafe.lux", group: "조명", label: "카페 테이블면 조도", unit: "lux", min: 100, max: 300, enforced: false, status: "proposal", source: "lightnox, montreallighting(출처마다 50~300으로 다름)", note: "한국 KS A 3011 식당, 카페 항목은 원문 확인 전." },
  { id: "light.pendant", group: "조명", label: "펜던트 조명 하단에서 테이블 상판까지", unit: "mm", min: 710, max: 915, enforced: false, status: "survey", source: "thelampgoods, lightnox(유럽 자료는 550~750)", note: "" },
  { id: "light.color", group: "조명", label: "색온도(카페와 식음)", unit: "K", min: 2400, max: 2700, enforced: true, status: "survey", source: "montreallighting, lightingdesignonline", note: "연색성 CRI 90 이상 권장." },
  // ---- 카메라(이미지 요청) ----
  { id: "camera.height", group: "카메라", label: "렌더링 카메라 높이(눈높이)", unit: "mm", min: 1200, max: 1800, value: 1500, enforced: true, status: "survey", source: "picfair, vdci, d5render", note: "자료마다 1.2~1.8m. 구조 그림은 1500을 쓴다." },
  { id: "camera.lens", group: "카메라", label: "실내 렌즈 환산 초점거리", unit: "mm", min: 24, max: 35, enforced: true, status: "survey", source: "maverickframe", note: "18~20mm 이하는 왜곡 위험. 수직선은 곧게 맞춘다(2점 투시, 모든 자료 일치)." },
];

export function ruleOf(id: string): DesignRule {
  const rule = DESIGN_RULES.find((candidate) => candidate.id === id);
  if (!rule) throw new Error(`기준을 찾을 수 없습니다: ${id}`);
  return rule;
}

/** 입구 앞 비움 구역의 폭과 깊이(mm) */
export const ENTRY_CLEAR_MM = ruleOf("entry.clear").value as number;

/** 입구 앞 비움 구역. 입구는 앞쪽 벽(깊이 끝) 가운데에 있다고 본다. */
export function entryZone(room: { widthMm: number; depthMm: number }): { left: number; right: number; top: number } {
  const left = (room.widthMm - ENTRY_CLEAR_MM) / 2;
  return { left, right: left + ENTRY_CLEAR_MM, top: room.depthMm - ENTRY_CLEAR_MM };
}

// 공실 지도 화면용 가짜 데이터. 시안(S01 18:44)의 핀 위치와 숫자를 그대로 옮겼다.
import type { UseType } from "@/types";
import type { CategoryTab, ClusterPin } from "@/types/map";

export const CATEGORY_TABS: CategoryTab[] = [
  { label: "전체", use: null },
  { label: "카페·디저트", use: "cafe" },
  { label: "음식점", use: "restaurant" },
  { label: "소매점", use: "retail" },
  { label: "서비스", use: "service" },
  { label: "사무실·기타", use: "office" },
];

const ALL_USES: UseType[] = ["cafe", "popup", "pilates", "restaurant", "retail", "service", "office"];

// 좌표는 시안 지도(1040 x 784) 안 핀 끝 위치를 %로 바꾼 값이다.
export const CLUSTER_PINS: ClusterPin[] = [
  { id: "c1", count: "8", x: 12.7, y: 29.8, uses: ["cafe", "restaurant"] },
  { id: "c2", count: "15", x: 25.2, y: 54.1, uses: ["cafe", "popup", "retail"] },
  { id: "c3", count: "21", x: 72.1, y: 26.5, uses: ["pilates", "service", "office"] },
  { id: "c4", count: "32", x: 83.8, y: 46.4, uses: ALL_USES },
  { id: "c5", count: "12", x: 18.8, y: 68.1, uses: ["restaurant", "retail"] },
  { id: "c6", count: "100+", x: 69.1, y: 68.1, uses: ALL_USES },
  { id: "c7", count: "9", x: 90.4, y: 79.5, uses: ["service", "office"] },
  { id: "c8", count: "27", x: 42.3, y: 89.8, uses: ["cafe", "pilates", "service"] },
  { id: "c9", count: "6", x: 59.6, y: 96.2, uses: ["popup", "retail"] },
];

// 카카오 지도 없이 정적 지도를 쓸 때 공실 핀을 놓을 위치(%). 공실 id를 키로 쓴다.
// 첫 번째 공실은 카드와 말풍선이 겹치지 않도록 시안 선택 핀(470, 470)보다 조금 아래에 둔다.
export const FALLBACK_POINTS: Record<string, { x: number; y: number }> = {
  "seongsu-2ga-1f": { x: 49.5, y: 76 },
  "ttukseom-1f": { x: 74, y: 40 },
  "seoulsup-corner-1f": { x: 22, y: 72 },
  "seongsu-stn-2f": { x: 60, y: 90 },
};

// "권리금 없음" 칩에 쓰는 가짜 값. Listing에 권리금 항목이 없어서 여기서 정한다.
export const NO_PREMIUM_IDS = ["seongsu-2ga-1f", "seoulsup-corner-1f"];

// 미리보기 카드의 "현재 상태" 사진. 시안에 빈 공간 사진이 한 장뿐이라 모든 공실이 같이 쓴다.
export const EMPTY_SPACE_PHOTO = "/images/space-d.jpg";

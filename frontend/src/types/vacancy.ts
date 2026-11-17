// 공실 후보. 공공 데이터로 찾은 "비어 있을 가능성이 있는 상가 층"이다. 임대 중이라는 뜻은 아니다.
export type VacancyCandidate = {
  id: string;
  address: string;
  buildingName: string;
  floor: number;
  floorUse: string; // 건축물대장 층별 주용도. 예: 소매점
  floorDetail: string;
  floorAreaM2: number | null;
  confidence: number; // 0~1. 높을수록 비어 있을 가능성이 크다.
  reasons: string[];
  status: "candidate" | "confirmed" | "rejected";
  storesOnFloor: number;
  unknownFloorStores: number;
  position: { lat: number; lng: number };
};

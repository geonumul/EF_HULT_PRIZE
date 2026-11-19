// 공실 후보를 건물 단위로 묶는 도구.
import type { VacancyCandidate } from "@/types/vacancy";

// "공실 가능성 높음"으로 보여 줄 후보의 조건. 점수는 규칙으로 매긴 추정치이고 통계 확률이 아니다. 공공데이터만으로는 0.65가 가장 높다.
export const HIGH_CONFIDENCE = 0.65;
const HIGH_AREA_RANGE_M2 = { min: 20, max: 150 };

/** 점수가 가장 높은 구간이고, 1층이며, 면적이 20~150㎡인 후보. 지도에는 이 후보만 보여 준다. */
export function isHighCandidate(candidate: VacancyCandidate): boolean {
  const area = candidate.floorAreaM2;
  return (
    candidate.confidence >= HIGH_CONFIDENCE &&
    candidate.floor === 1 &&
    area !== null &&
    area >= HIGH_AREA_RANGE_M2.min &&
    area <= HIGH_AREA_RANGE_M2.max
  );
}

/** 같은 건물의 후보는 좌표가 같으므로, 좌표를 소수 다섯째 자리(약 1m)까지 잘라 건물 키로 쓴다. */
export function buildingKey(candidate: VacancyCandidate): string {
  return `${candidate.position.lat.toFixed(5)}:${candidate.position.lng.toFixed(5)}`;
}

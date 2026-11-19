// 공실 후보를 건물 단위로 묶는 도구.
import type { VacancyCandidate } from "@/types/vacancy";

/** 같은 건물의 후보는 좌표가 같으므로, 좌표를 소수 다섯째 자리(약 1m)까지 잘라 건물 키로 쓴다. */
export function buildingKey(candidate: VacancyCandidate): string {
  return `${candidate.position.lat.toFixed(5)}:${candidate.position.lng.toFixed(5)}`;
}

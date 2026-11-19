// 공간과 업종으로 법령상 확인할 점을 뽑는다. 화면과 렌더링 결과에 "이 공간에서 확인할 것"으로 보여 준다.
// 법률 자문이 아니다. 기준표(knowledge.ts)의 값과 출처를 그대로 쓰고, 최신 개정과 건물별 사정은 현장에서 확인해야 한다.
import type { Room } from "../types";
import { ruleOf } from "./knowledge";

export interface DesignNote {
  level: "error" | "check";
  text: string;
  source: string;
}

const FOOD_USES = ["cafe", "restaurant"];
const RETAIL_USES = ["popup", "retail"];

export function areaM2(room: Pick<Room, "widthMm" | "depthMm">): number {
  return (room.widthMm * room.depthMm) / 1_000_000;
}

export function legalNotes(room: Room, useType: string): DesignNote[] {
  const notes: DesignNote[] = [];
  const area = areaM2(room);
  const isFood = FOOD_USES.includes(useType);
  const isRetail = RETAIL_USES.includes(useType);

  const ceiling = ruleOf("height.ceiling");
  if (room.ceilingMm < (ceiling.min as number)) {
    notes.push({ level: "error", text: `천장 높이 ${room.ceilingMm}mm가 거실 반자높이 최소 ${ceiling.min}mm보다 낮습니다.`, source: ceiling.source });
  }

  const barrierFree = ruleOf("law.barrierfree");
  if ((isFood || isRetail) && area >= (barrierFree.value as number)) {
    notes.push({
      level: "check",
      text: `${Math.round(area)}㎡로 장애인 편의시설 설치 대상일 수 있습니다(2022.5.1 이후 신축, 증축 건물). 출입구 통과 폭 900mm, 문 앞 1200mm, 복도 1200mm, 문턱 20mm 이하를 확인하세요.`,
      source: barrierFree.source,
    });
  }

  const fire = ruleOf("law.fire100");
  if (isFood && area >= (fire.value as number)) {
    notes.push({ level: "check", text: `영업장이 ${Math.round(area)}㎡로 100㎡ 이상이면 다중이용업소 소방시설과 내부 피난통로를 확인해야 합니다(1층이고 주출입구가 지면과 직접 연결되면 제외).`, source: fire.source });
  }

  const cafe300 = ruleOf("law.cafe300");
  if (useType === "cafe" && area >= (cafe300.value as number)) {
    notes.push({ level: "check", text: `휴게음식점이 300㎡ 이상이면 2종 근린생활시설로 분류됩니다.`, source: cafe300.source });
  }

  if (isFood) {
    notes.push({
      level: "check",
      text: "조리장에는 환기시설, 손 씻는 시설, 바닥 배수구 덮개, 폐기물 용기가 필요합니다. 객석 칸막이는 높이 1.5m 미만이어야 합니다.",
      source: "식품위생법 시행규칙 별표14 제8호",
    });
  }

  if (useType === "pilates") {
    const pilatesCeiling = ruleOf("pilates.ceiling");
    if (room.ceilingMm < (pilatesCeiling.min as number)) {
      notes.push({ level: "check", text: `천장 ${room.ceilingMm}mm는 필라테스 권장 높이 ${pilatesCeiling.min}mm보다 낮습니다. 기구와 스트레칭 동작에 제약이 있을 수 있습니다.`, source: pilatesCeiling.source });
    }
    notes.push({ level: "check", text: "필라테스가 학원인지 체력단련장업인지에 따라 시설 기준이 다릅니다. 관할 교육청이나 구청에 확인하세요.", source: ruleOf("law.academy500").source });
  }

  return notes;
}

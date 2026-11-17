// 텍스트 요청에 대한 가짜 배치 계획과 치수 검증. 서버가 생기면 AI 응답으로 바뀐다.
import type { ChatCheck, ChatPlan } from "@/types/studio";

const DEFAULT_TABLES = 6;

/** 요청 문장에서 테이블 수를 읽는다. "2인석 8개"처럼 숫자가 있으면 그 수를 쓴다. */
export function makePlan(requestText: string, previous?: ChatPlan): ChatPlan {
  let tables = previous?.tables ?? DEFAULT_TABLES;
  const found = requestText.match(/(\d+)\s*개/);
  if (found) tables = Number(found[1]);
  if (requestText.includes("늘리기")) tables += 2;
  tables = Math.min(12, Math.max(2, tables));
  return planFromTables(tables);
}

/** 테이블을 하나 뺀 계획을 만든다. */
export function removeOneTable(plan: ChatPlan): ChatPlan {
  return planFromTables(Math.max(2, plan.tables - 1));
}

function planFromTables(tables: number): ChatPlan {
  return {
    tables,
    seats: tables * 2,
    aisleMm: 1260 - tables * 60,
    waitingM: Math.round((1.9 - tables * 0.13) * 10) / 10,
  };
}

export function makeChecks(plan: ChatPlan): ChatCheck[] {
  return [
    {
      ok: plan.aisleMm >= 850,
      text: `통로 폭 ${plan.aisleMm}mm (기준 850mm ${plan.aisleMm >= 850 ? "이상" : "미만"})`,
    },
    { ok: true, text: `좌석 ${plan.seats}석 · 테이블 간격 600mm` },
    {
      ok: plan.waitingM >= 1.2,
      text: `카운터 앞 대기 공간 ${plan.waitingM}m (권장 1.2m)`,
    },
  ];
}

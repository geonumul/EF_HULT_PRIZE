// 만든 렌더링 이미지를 설계 기준 체크리스트로 자동 검수한다. 사람이 하나씩 지적하지 않아도 기준을 어긴 이미지는 걸러서 다시 만들게 한다.
// 비전 모델(기본 gemini-flash-latest)에 이미지와 체크리스트를 주고 항목마다 통과 여부와 이유를 JSON으로 받는다.
// 모델이 이미지에서 길이를 정확히 재지는 못하므로 "눈에 띄게 어긋난 것"을 걸러 내는 용도다. 정확한 치수 보증은 배치 검증이 맡는다.
import { ruleOf } from "../pipeline/knowledge";

export interface CriticImage {
  bytes: Uint8Array;
  contentType: string;
}

export interface CritiqueItem {
  id: string;
  pass: boolean;
  note: string;
}

export interface CritiqueResult {
  items: CritiqueItem[];
  /** 필수 항목이 모두 통과했는지 */
  passed: boolean;
  /** 통과한 항목 수 */
  score: number;
  failed: CritiqueItem[];
}

interface ChecklistEntry {
  id: string;
  critical: boolean;
  question: string;
}

const MODEL = "gemini-flash-latest";
const ENDPOINT = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const COUNTER_FRONT_M = (ruleOf("counter.front").value as number) / 1000;
const COUNTER_BACK_M = (ruleOf("counter.back").value as number) / 1000;
const MAIN_AISLE_M = (ruleOf("aisle.main").min as number) / 1000;

/** 업종별 체크리스트. 값은 기준표에서 읽는다. */
export function checklistFor(useType: string, hasOriginal: boolean): ChecklistEntry[] {
  const common: ChecklistEntry[] = [
    { id: "scale", critical: true, question: "가구와 설비의 크기가 문, 창, 사람 크기와 비교해 현실적인가? (테이블 상판 높이 약 0.72m, 의자 좌면 약 0.45m, 카운터 약 1.0m, 문 높이 약 2.1m)" },
    { id: "entry_clear", critical: true, question: "입구(문) 앞 약 1.2m 안쪽에 가구나 진열이 막고 있지 않은가?" },
    { id: "no_artifacts", critical: true, question: "가구가 서로 겹치거나, 벽을 뚫거나, 형태가 일그러지거나, 공중에 떠 있는 등 부자연스러운 오류가 없는가?" },
    { id: "empty_zone", critical: false, question: "화면에서 바닥의 큰 부분(예: 앞쪽 절반)이 아무 이유 없이 텅 비어 있지 않은가? 비어 있다면 통로나 의도된 여유 공간으로 보이는가?" },
  ];
  if (hasOriginal) {
    common.unshift({ id: "matches_photo", critical: true, question: "첫 번째 이미지(원본 사진)와 비교해 창, 기둥, 보, 천장 구조물, 문, 벽의 위치와 개수와 카메라 시점이 같은가? 구조가 바뀌었거나 방이 다른 방처럼 보이면 실패다." });
  }
  const byUse: Record<string, ChecklistEntry[]> = {
    cafe: [
      { id: "counter_back", critical: true, question: `카운터 뒤쪽 벽과 카운터 사이에 직원이 지나갈 폭(약 ${COUNTER_BACK_M}m 이상)이 있어 보이는가? 카운터가 벽에 거의 붙어 있으면 실패다.` },
      { id: "counter_front", critical: true, question: `카운터 앞에서 가장 가까운 테이블이나 의자까지 손님이 서고 지나갈 수 있는 공간(약 ${COUNTER_FRONT_M}m 이상)이 있어 보이는가? 테이블이 카운터에 바짝 붙어 있으면 실패다.` },
      { id: "aisle_main", critical: false, question: `입구에서 카운터와 좌석 구역으로 이어지는 주 통로가 약 ${MAIN_AISLE_M}m 이상 폭으로 끊기지 않고 보이는가?` },
      { id: "use_features", critical: false, question: "카페로 보이는가? (주문 카운터, 좌석이 있는 테이블, 조명)" },
    ],
    pilates: [
      { id: "equipment_gap", critical: true, question: "리포머 사이와 둘레에 사람이 서서 운동할 수 있는 여유 공간(기구 사이 약 0.9m)이 있어 보이는가? 기구가 서로 붙어 있으면 실패다." },
      { id: "use_features", critical: false, question: "필라테스 스튜디오로 보이는가? (리포머 여러 대, 한쪽 벽의 거울, 밝은 바닥, 수납)" },
    ],
    popup: [
      { id: "counter_front", critical: true, question: `계산대 앞에 손님이 설 수 있는 공간(약 ${COUNTER_FRONT_M}m 이상)이 있어 보이는가?` },
      { id: "aisle_main", critical: true, question: "진열대 사이 통로가 사람이 지나가기에 충분히 넓어 보이는가(약 1.2m)?" },
      { id: "use_features", critical: false, question: "팝업스토어로 보이는가? (벽면 진열, 중앙 진열대, 계산대, 스포트 조명)" },
    ],
  };
  return [...common, ...(byUse[useType] ?? [])];
}

type FetchLike = typeof fetch;

/** 모델이 이미지에서 추정한 길이와 비율. 해당 없으면 null. 통과 기준은 우리 기준표 값으로 코드가 판정한다. */
export interface Measurements {
  counter_front_m: number | null;
  counter_back_m: number | null;
  main_aisle_m: number | null;
  front_empty_percent: number | null;
}

const FRONT_EMPTY_MAX = ruleOf("layout.frontEmpty").max as number;

/** 추정 길이를 기준표 값과 비교해 항목 판정으로 바꾼다. 측정값이 있는 항목은 모델의 통과 판단 대신 이 판정을 쓴다. */
export function judgeMeasurements(measurements: Measurements | undefined, useType: string): CritiqueItem[] {
  if (!measurements) return [];
  const rows: Array<{ id: string; value: number | null | undefined; min?: number; max?: number; unit: string; label: string; uses?: string[] }> = [
    { id: "counter_front", value: measurements.counter_front_m, min: COUNTER_FRONT_M, unit: "m", label: "카운터 앞 공간", uses: ["cafe", "popup"] },
    { id: "counter_back", value: measurements.counter_back_m, min: COUNTER_BACK_M, unit: "m", label: "카운터 뒤 통로", uses: ["cafe"] },
    { id: "aisle_main", value: measurements.main_aisle_m, min: MAIN_AISLE_M, unit: "m", label: "주 통로 폭", uses: ["cafe", "popup"] },
    { id: "empty_zone", value: measurements.front_empty_percent, max: FRONT_EMPTY_MAX, unit: "%", label: "카메라 쪽 빈 바닥 비율" },
  ];
  const items: CritiqueItem[] = [];
  for (const row of rows) {
    if (row.value === null || row.value === undefined || (row.uses && !row.uses.includes(useType))) continue;
    const pass = row.min !== undefined ? row.value >= row.min : row.value <= (row.max as number);
    const limit = row.min !== undefined ? `${row.min}${row.unit} 이상` : `${row.max}${row.unit} 이하`;
    items.push({ id: row.id, pass, note: `${row.label} 추정 ${row.value}${row.unit} (기준 ${limit})` });
  }
  return items;
}

export function summarize(items: CritiqueItem[], checklist: ChecklistEntry[]): CritiqueResult {
  const critical = new Set(checklist.filter((entry) => entry.critical).map((entry) => entry.id));
  const failed = items.filter((item) => !item.pass);
  return {
    items,
    passed: !failed.some((item) => critical.has(item.id)),
    score: items.filter((item) => item.pass).length,
    failed,
  };
}

export class GeminiCritic {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = MODEL,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  /** original이 있으면 원본 사진과 구조가 같은지도 본다. */
  async critique(params: { image: CriticImage; original?: CriticImage; useType: string }): Promise<CritiqueResult> {
    const checklist = checklistFor(params.useType, Boolean(params.original));
    const lines = checklist.map((entry, index) => `${index + 1}. id=${entry.id}${entry.critical ? " (필수)" : ""}: ${entry.question}`);
    const text = [
      "당신은 실내건축 설계 검수자다. 아래 이미지는 AI가 만든 인테리어 렌더링이다.",
      params.original ? "첫 번째 이미지는 원본 공간 사진이고, 두 번째 이미지가 검수할 렌더링이다." : "이미지가 검수할 렌더링이다.",
      "체크리스트 항목마다 이미지에서 보이는 대로 엄격하게 판정하라. 확신이 없으면 실패로 하고 이유를 적어라. note는 한국어로 한 문장.",
      "또 measurements에 길이를 미터로 추정해 적어라. 문(폭 0.9m, 높이 2.1m), 의자 좌면(0.45m), 테이블 상판(지름이나 한 변 약 0.6~0.7m)을 기준자로 써서 바닥에서의 거리를 재고, 후하게 보지 말고 보이는 그대로 추정하라. 해당하지 않으면 null.",
      "- counter_front_m: 카운터 앞면에서 가장 가까운 테이블, 의자, 진열대까지의 거리",
      "- counter_back_m: 카운터 뒤쪽 벽에서 카운터까지의 거리(직원 통로)",
      "- main_aisle_m: 입구에서 안쪽으로 이어지는 가장 좁은 주 통로 폭",
      "- front_empty_percent: 화면 아래쪽 절반(카메라에 가까운 바닥)에서 가구나 진열이 전혀 없는 바닥이 차지하는 비율(0~100)",
      "",
      ...lines,
    ].join("\n");

    const parts: Array<Record<string, unknown>> = [{ text }];
    for (const image of [params.original, params.image]) {
      if (image) parts.push({ inlineData: { mimeType: image.contentType, data: Buffer.from(image.bytes).toString("base64") } });
    }

    const response = await this.fetchImpl(ENDPOINT(this.model), {
      method: "POST",
      headers: { "x-goog-api-key": this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              measurements: {
                type: "OBJECT",
                properties: {
                  counter_front_m: { type: "NUMBER", nullable: true },
                  counter_back_m: { type: "NUMBER", nullable: true },
                  main_aisle_m: { type: "NUMBER", nullable: true },
                  front_empty_percent: { type: "NUMBER", nullable: true },
                },
              },
              items: {
                type: "ARRAY",
                items: { type: "OBJECT", properties: { id: { type: "STRING" }, pass: { type: "BOOLEAN" }, note: { type: "STRING" } }, required: ["id", "pass", "note"] },
              },
            },
            required: ["items"],
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`검수 요청이 실패했습니다(${response.status}). ${(await response.text()).slice(0, 200)}`);

    const body = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const parsed = JSON.parse(raw) as { items?: CritiqueItem[]; measurements?: Measurements };
    // 체크리스트에 있는 항목만 받고, 응답에서 빠진 항목은 실패로 본다.
    const judged = judgeMeasurements(parsed.measurements, params.useType);
    const items = checklist.map(
      (entry) => judged.find((item) => item.id === entry.id) ?? parsed.items?.find((item) => item.id === entry.id) ?? { id: entry.id, pass: false, note: "응답에 없음" },
    );
    return summarize(items, checklist);
  }
}

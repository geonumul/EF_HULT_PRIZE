// 만든 렌더링 이미지에서 상품마다 가장 잘 보이는 가구 하나의 위치를 찾는다. 번호 핀(태그)을 상품과 이미지 속 가구에 잇는 데 쓴다.
// 비전 모델에 이미지와 상품 목록을 주고 중심 위치를 이미지 크기 대비 비율(0~100)로 받는다. 위치는 추정이라 정확하지 않을 수 있다.
import type { CriticImage } from "./geminiCritic";

export interface TagTarget {
  id: string;
  /** 모델이 찾을 대상 설명. 예: "오크 원목 체어 (chair)" */
  label: string;
}

export interface Located {
  id: string;
  x: number;
  y: number;
}

const MODEL = "gemini-flash-latest";
const ENDPOINT = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

type FetchLike = typeof fetch;

const clamp = (value: number) => Math.max(2, Math.min(98, value));

export class GeminiLocator {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = MODEL,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async locate(image: CriticImage, targets: TagTarget[]): Promise<Located[]> {
    if (targets.length === 0) return [];
    const lines = targets.map((target) => `- id=${target.id}: ${target.label}`);
    const text = [
      "이 이미지는 실내 렌더링이다. 아래 물건마다 이미지에서 가장 뚜렷하게 보이는 하나를 찾아 그 중심의 위치를 이미지 가로, 세로 길이에 대한 비율(0~100)로 적어라.",
      "x는 왼쪽 끝이 0, 오른쪽 끝이 100. y는 위쪽 끝이 0, 아래쪽 끝이 100이다. 이미지에 없으면 found를 false로 하라.",
      "같은 종류가 여러 개면 화면에서 가장 앞에 있고 잘 보이는 것을 고른다.",
      ...lines,
    ].join("\n");

    const response = await this.fetchImpl(ENDPOINT(this.model), {
      method: "POST",
      headers: { "x-goog-api-key": this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }, { inlineData: { mimeType: image.contentType, data: Buffer.from(image.bytes).toString("base64") } }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: { id: { type: "STRING" }, found: { type: "BOOLEAN" }, x: { type: "NUMBER" }, y: { type: "NUMBER" } },
                  required: ["id", "found"],
                },
              },
            },
            required: ["items"],
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`위치 찾기 요청이 실패했습니다(${response.status}).`);

    const body = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const parsed = JSON.parse(raw) as { items?: Array<{ id: string; found: boolean; x?: number; y?: number }> };
    const known = new Set(targets.map((target) => target.id));
    return (parsed.items ?? [])
      .filter((item) => known.has(item.id) && item.found && typeof item.x === "number" && typeof item.y === "number")
      .map((item) => ({ id: item.id, x: clamp(item.x as number), y: clamp(item.y as number) }));
  }
}

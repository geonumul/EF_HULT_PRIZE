// 무드 이미지에서 색을 읽어 스타일(우드, 화이트, 인더스트리얼)을 고른다. 서버 호출 없이 브라우저에서 계산한다.
import type { RenderStyleKey } from "@/types/studio";

export type MoodResult = {
  style: RenderStyleKey;
  swatches: string[]; // 주요 색 (#rrggbb)
  brightness: number; // 0~1
  saturation: number; // 0~1
  warmth: number; // -1(차가움) ~ 1(따뜻함)
};

const STYLE_REASON: Record<RenderStyleKey, string> = {
  wood: "따뜻한 색이 많아서 우드톤으로 골랐어요.",
  white: "밝고 채도가 낮아서 화이트 미니멀로 골랐어요.",
  industrial: "어둡거나 회색빛이 많아서 인더스트리얼로 골랐어요.",
};

export function reasonOf(style: RenderStyleKey): string {
  return STYLE_REASON[style];
}

function hex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** 픽셀 목록(RGBA)에서 평균 밝기, 채도, 따뜻함과 주요 색을 구한다. */
export function analyzePixels(data: Uint8ClampedArray): MoodResult {
  let sumBright = 0;
  let sumSat = 0;
  let sumWarm = 0;
  let count = 0;
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    sumBright += max / 255;
    sumSat += max === 0 ? 0 : (max - min) / max;
    sumWarm += (r - b) / 255;
    count += 1;

    const key = `${r >> 5}-${g >> 5}-${b >> 5}`; // 색을 8단계로 묶는다.
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }

  const brightness = sumBright / count;
  const saturation = sumSat / count;
  const warmth = sumWarm / count;
  const swatches = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((bucket) => hex(Math.round(bucket.r / bucket.n), Math.round(bucket.g / bucket.n), Math.round(bucket.b / bucket.n)));

  return { style: pickStyle(brightness, saturation, warmth), swatches, brightness, saturation, warmth };
}

export function pickStyle(brightness: number, saturation: number, warmth: number): RenderStyleKey {
  if (brightness < 0.45 || (saturation < 0.18 && warmth < 0.05 && brightness < 0.65)) return "industrial";
  if (brightness > 0.7 && saturation < 0.25) return "white";
  return warmth > 0.02 ? "wood" : "white";
}

/** 여러 장의 결과를 합친다. 스타일은 가장 많이 나온 것, 색은 장마다 앞의 둘씩 모은다. */
export function mergeMoods(results: MoodResult[]): MoodResult | null {
  if (results.length === 0) return null;
  const votes = new Map<RenderStyleKey, number>();
  for (const result of results) votes.set(result.style, (votes.get(result.style) ?? 0) + 1);
  const style = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const mean = (pick: (r: MoodResult) => number) => results.reduce((sum, r) => sum + pick(r), 0) / results.length;
  return {
    style,
    swatches: results.flatMap((r) => r.swatches.slice(0, 2)).slice(0, 8),
    brightness: mean((r) => r.brightness),
    saturation: mean((r) => r.saturation),
    warmth: mean((r) => r.warmth),
  };
}

/** 이미지 파일을 64px로 줄여서 분석한다. */
export async function analyzeFile(file: File): Promise<MoodResult> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지를 분석할 수 없어요.");
    ctx.drawImage(image, 0, 0, 64, 64);
    return analyzePixels(ctx.getImageData(0, 0, 64, 64).data);
  } finally {
    URL.revokeObjectURL(url);
  }
}

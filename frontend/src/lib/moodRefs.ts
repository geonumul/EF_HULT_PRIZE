// 고객이 고른 분위기 참고 사진. 핀터레스트 같은 곳에서 저장하거나 붙여넣은 사진을 이 브라우저에만 둔다.
// 서버에는 "사진 다시 만들기"를 누를 때만 줄인 JPEG로 보낸다. 핀터레스트 주소를 직접 읽지는 않는다(공식 연동이 없다).

const KEY = "shopportunity-mood-refs";
export const MAX_MOOD_REFS = 2;
const MAX_SIDE = 768;

export function loadMoodRefs(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_MOOD_REFS) : [];
  } catch {
    return [];
  }
}

export function saveMoodRefs(refs: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(refs.slice(0, MAX_MOOD_REFS)));
  } catch {
    // 저장 공간이 없으면 이번 화면에서만 쓴다.
  }
}

/** 이미지 파일을 긴 변 768px의 JPEG data URL로 줄인다. */
export async function fileToMoodRef(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
      img.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지를 줄일 수 없어요.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** data URL에서 base64 부분만 꺼낸다. 서버가 이 모양으로 받는다. */
export function base64Of(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/jpeg;base64,/, "");
}

// 외부 이미지 생성 API 어댑터. 어떤 서비스를 쓸지 정하지 않아서 가짜 구현만 있다.
import type { Room } from "../types";
import type { PlacedItem } from "../pipeline/layout";

export interface ImageGenerationRequest {
  prompt: string;
  room: Room;
  /** 치수 검증을 통과한 배치. 공간을 고정하고 이 배치대로 그리게 하는 조건이다. */
  placed: PlacedItem[];
  /** products 모드에서 레퍼런스로 넣을 상품 이미지 주소 */
  referenceImageUrls: string[];
}

export interface GeneratedImage {
  bytes: Uint8Array;
  contentType: string;
}

export interface ImageGenerator {
  generate(request: ImageGenerationRequest): Promise<GeneratedImage>;
}

// 1x1 PNG. 가짜 구현이 돌려주는 이미지다.
const PLACEHOLDER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export class FakeImageGenerator implements ImageGenerator {
  async generate(_request: ImageGenerationRequest): Promise<GeneratedImage> {
    return { bytes: Buffer.from(PLACEHOLDER_PNG_BASE64, "base64"), contentType: "image/png" };
  }
}

// TODO: 이미지 생성 API를 정하면 IMAGE_GEN_API_KEY를 읽는 구현을 여기에 추가한다. 공식 문서 확인 필요.

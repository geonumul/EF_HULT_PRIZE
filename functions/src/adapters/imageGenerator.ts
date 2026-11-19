// 외부 이미지 생성 API 어댑터. 키가 없을 때 쓰는 가짜 구현이 여기 있다.
import type { Room } from "../types";
import type { PlacedItem } from "../pipeline/layout";

export interface ImageGenerationRequest {
  prompt: string;
  /** 업종 id. cafe, popup, pilates 등 */
  useType: string;
  room: Room;
  /** 치수 검증을 통과한 배치. 공간을 고정하고 이 배치대로 그리게 하는 조건이다. */
  placed: PlacedItem[];
  /** products 모드에서 레퍼런스로 넣을 상품 이미지 주소 */
  referenceImageUrls: string[];
  /** 실제 공간 사진. 있으면 벽, 창, 문 위치를 그대로 두고 꾸미게 한다. */
  spacePhoto?: { bytes: Uint8Array; contentType: string };
  /** 우리가 계산한 좌표로 그린 구조 그림(점토 렌더링). 공간의 원근, 크기, 물건 위치를 정확히 따르게 하는 가이드다. */
  structureImage?: { bytes: Uint8Array; contentType: string };
  /** structureImage의 종류. clay는 우리가 그린 3D 상자 그림, edges는 공간 사진에서 뽑은 건축 요소 선화다. 기본은 clay. */
  structureKind?: "clay" | "edges";
  /** 상품 사진. 이름과 함께 주면 그 상품의 생김새를 따라 그리게 한다. */
  referenceImages?: Array<{ label: string; bytes: Uint8Array; contentType: string }>;
  /** restyle이면 spacePhoto는 이미 꾸며진 기준 이미지다. 구도와 가구는 그대로 두고 재료와 색만 prompt의 스타일로 바꾼다. */
  mode?: "restyle";
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

// 실제 구현은 geminiImageGenerator.ts에 있다. GEMINI_API_KEY가 있으면 adapters/index.ts가 그것을 고른다.

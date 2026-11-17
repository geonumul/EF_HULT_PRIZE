// 렌더링 이미지 속 집기를 찾는 어댑터. Figma 문서의 Grounding DINO 자리다.
import type { ProductCategory } from "../types";

export interface DetectedObject {
  category: ProductCategory;
  /** 이미지 안 위치(0~1) */
  box: { x: number; y: number; width: number; height: number };
  /** 잘라낸 이미지. 임베딩 입력으로 쓴다. */
  crop: Uint8Array;
}

export interface ObjectDetector {
  /** labels에 든 카테고리의 집기만 찾는다. */
  detect(image: Uint8Array, labels: ProductCategory[]): Promise<DetectedObject[]>;
}

/** 라벨마다 한 개를 찾은 것처럼 돌려준다. 자른 이미지는 라벨 글자 그대로다. */
export class FakeObjectDetector implements ObjectDetector {
  async detect(_image: Uint8Array, labels: ProductCategory[]): Promise<DetectedObject[]> {
    return labels.map((category, index) => ({
      category,
      box: { x: 0.1 + 0.2 * index, y: 0.5, width: 0.15, height: 0.2 },
      crop: Buffer.from(category, "utf8"),
    }));
  }
}

// TODO: 검출 모델(Grounding DINO 호스팅 또는 외부 API)을 정하면 구현을 추가한다. 공식 문서 확인 필요.

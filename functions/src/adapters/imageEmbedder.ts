// 이미지를 벡터로 바꾸는 어댑터. Figma 문서의 CLIP 자리다.

export interface ImageEmbedder {
  embedBytes(image: Uint8Array): Promise<number[]>;
  /** 상품 대표 이미지 주소로 임베딩한다. 배경 제거도 여기서 맡는다. */
  embedUrl(imageUrl: string): Promise<number[]>;
}

const FAKE_DIMENSION = 16;

/** 같은 입력이면 같은 벡터가 나오는 가짜 임베딩. 실제 모델과 무관하다. */
export class FakeImageEmbedder implements ImageEmbedder {
  async embedBytes(image: Uint8Array): Promise<number[]> {
    return hashToVector(image);
  }

  async embedUrl(imageUrl: string): Promise<number[]> {
    return hashToVector(Buffer.from(imageUrl, "utf8"));
  }
}

export function hashToVector(bytes: Uint8Array): number[] {
  const vector = new Array<number>(FAKE_DIMENSION).fill(0);
  // 값이 양수와 음수로 섞여야 서로 다른 입력의 유사도가 낮게 나온다.
  for (const byte of bytes) {
    for (let k = 0; k < FAKE_DIMENSION; k += 1) {
      vector[k] += ((byte * (k + 3)) % 17) - 8;
    }
  }
  return vector;
}

// TODO: 임베딩 모델(CLIP 호스팅 또는 외부 API)을 정하면 구현을 추가한다. 차원은 products.embedding 열과 맞춘다. 공식 문서 확인 필요.

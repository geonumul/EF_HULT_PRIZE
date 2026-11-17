// 6단계 상품 매칭 규칙. 검출과 임베딩은 어댑터가 하고, 여기서는 유사도로 태그 종류만 정한다.
import type { Candidate, MatchType } from "../types";

export const SAME_PRODUCT_THRESHOLD = 0.85;
/** 이보다 낮으면 맞는 상품이 없다고 보고 태그를 달지 않는다. */
// TODO: 0.6은 임시값이다. 실제 임베딩 모델을 정한 뒤 샘플로 조정한다.
export const MIN_SIMILAR_THRESHOLD = 0.6;
export const CANDIDATE_LIMIT = 3;

export interface MatchResult {
  matchType: MatchType;
  productId: string | null;
  similarity: number | null;
  /** 유사도 높은 순 상위 3개 */
  candidates: Candidate[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function classifyMatch(found: Candidate[]): MatchResult {
  const candidates = [...found].sort((a, b) => b.similarity - a.similarity).slice(0, CANDIDATE_LIMIT);
  const best = candidates[0];

  if (!best || best.similarity < MIN_SIMILAR_THRESHOLD) {
    return { matchType: "none", productId: null, similarity: null, candidates };
  }

  const matchType = best.similarity >= SAME_PRODUCT_THRESHOLD ? "same" : "similar";
  return { matchType, productId: best.productId, similarity: best.similarity, candidates };
}

// 마켓 카테고리 이름표. mocks/products.ts의 category 값과 같은 키를 쓴다.
export const CATEGORY_LABELS: Record<string, string> = {
  chair: "의자·스툴",
  table: "테이블",
  lamp: "조명",
  counter: "카운터",
  fridge: "냉장고",
  machine: "기기",
  shelf: "선반",
  mirror: "거울",
  locker: "사물함",
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

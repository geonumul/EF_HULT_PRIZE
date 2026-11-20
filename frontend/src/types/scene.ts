// 공간 상태 하나(Scene). 평면도, 견적, 텍스트 수정이 모두 이 모양을 읽고 쓴다.
// 도면의 가구(placed)와 구조물(structures)은 functions의 planLayout 응답과 같은 모양이다.
import type { PlacedItem, PlanCamera, PlanResult, PlanStructure } from "@/lib/api/functions";
import type { UseType } from "@/types";

/** 도면의 가구 하나. id는 드래그와 텍스트 수정이 가리키는 이름표다. */
export type SceneItem = PlacedItem & {
  id: string;
  /** 상품 카탈로그에서 직접 고른 가구면 그 상품 id. 견적이 이 id를 읽는다. */
  catalogId?: string;
  /** 둥근 테이블에 딸린 의자의 상품 id. 없으면 기본 의자. */
  chairCatalogId?: string;
};

export type Scene = {
  version: 1;
  spaceId: string;
  useType: UseType;
  room: PlanResult["room"];
  items: SceneItem[];
  structures: PlanStructure[];
  /** 법령과 설계 확인 사항. 공간과 업종이 정해지면 바뀌지 않는다. */
  notes: PlanResult["notes"];
  camera?: PlanCamera;
  /** 처음 배치가 어디서 왔는지. 화면에 근거로 보여 준다. */
  source: "image-plan" | "auto-layout";
  /** 입구(아래쪽 벽 문) 가운데의 가로 위치(mm). 없으면 가운데. 실측한 값을 넣을 때 쓴다. */
  entryX?: number;
  /** 방 크기나 기둥, 창, 문을 실측값으로 고쳤으면 true. 사진 보정에 맞춘 가이드 이미지는 더 쓸 수 없다. */
  measured?: boolean;
  updatedAt: number;
  /** 처음 배치에서 한 번이라도 고쳤으면 true. 렌더링 이미지는 처음 배치 그대로라서 화면에 알린다. */
  edited?: boolean;
};

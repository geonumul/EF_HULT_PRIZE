// 철거비 추정과 철거 견적 요청. Figma 시안이 없는 추가 기능이라 기존 토큰과 공통 컴포넌트로 만들었다.
import PlannerLoader from "@/components/demolition/PlannerLoader";

export default async function DemolitionPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlannerLoader id={id} />;
}

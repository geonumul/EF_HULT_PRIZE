// 철거비 추정과 철거 견적 요청. Figma 시안이 없는 추가 기능이라 기존 토큰과 공통 컴포넌트로 만들었다.
import { notFound } from "next/navigation";
import Planner from "@/components/demolition/Planner";
import { findListing } from "@/mocks/listings";

export default async function DemolitionPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = findListing(id);
  if (!listing) notFound();
  return <Planner listing={listing} />;
}

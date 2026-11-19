"use client";

// 철거비 추정 화면. 공간을 불러온 뒤 Planner를 보여 준다.
import SpaceMessage from "@/components/common/SpaceMessage";
import { useSpace } from "@/lib/spaces";
import Planner from "./Planner";

export default function PlannerLoader({ id }: { id: string }) {
  const { listing, status } = useSpace(id);
  if (!listing) return <SpaceMessage status={status} />;
  return <Planner listing={listing} />;
}

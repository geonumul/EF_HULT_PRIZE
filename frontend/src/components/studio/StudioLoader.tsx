"use client";

// 스튜디오 화면. 공간을 불러온 뒤 StudioView를 보여 준다. 없는 공간이면 안내를 보여 준다.
import SpaceMessage from "@/components/common/SpaceMessage";
import { useSpace } from "@/lib/spaces";
import type { UseType } from "@/types";
import StudioView from "./StudioView";

export default function StudioLoader({ id, use }: { id: string; use?: string }) {
  const { listing, status } = useSpace(id);
  if (!listing) return <SpaceMessage status={status} />;

  const uses = Object.keys(listing.costs) as UseType[];
  const initialUse = uses.find((candidate) => candidate === use) ?? uses[0];
  return <StudioView listing={listing} initialUse={initialUse} />;
}

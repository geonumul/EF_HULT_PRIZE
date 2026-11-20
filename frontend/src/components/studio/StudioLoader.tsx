"use client";

// 스튜디오 화면. 공간을 불러온 뒤 StudioView를 보여 준다. 없는 공간이면 안내를 보여 준다.
import SpaceMessage from "@/components/common/SpaceMessage";
import { useSpace } from "@/lib/spaces";
import type { UseType } from "@/types";
import type { RenderStyleKey } from "@/types/studio";
import StudioView from "./StudioView";

const STYLE_KEYS: RenderStyleKey[] = ["wood", "white", "industrial"];

export default function StudioLoader({ id, use, style }: { id: string; use?: string; style?: string }) {
  const { listing, status } = useSpace(id);
  if (!listing) return <SpaceMessage status={status} />;

  const uses = Object.keys(listing.costs) as UseType[];
  const initialUse = uses.find((candidate) => candidate === use) ?? uses[0];
  const initialStyle = STYLE_KEYS.find((key) => key === style);
  return <StudioView listing={listing} initialUse={initialUse} initialStyle={initialStyle} />;
}

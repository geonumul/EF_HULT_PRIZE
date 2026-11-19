"use client";

// 텍스트 렌더링 요청 화면. 공간을 불러온 뒤 ChatView를 보여 준다.
import SpaceMessage from "@/components/common/SpaceMessage";
import { useSpace } from "@/lib/spaces";
import type { UseType } from "@/types";
import ChatView from "./ChatView";

export default function ChatLoader({ id, use }: { id: string; use?: string }) {
  const { listing, status } = useSpace(id);
  if (!listing) return <SpaceMessage status={status} />;

  const uses = Object.keys(listing.costs) as UseType[];
  const initialUse = uses.find((candidate) => candidate === use) ?? uses[0];
  return <ChatView listing={listing} initialUse={initialUse} />;
}

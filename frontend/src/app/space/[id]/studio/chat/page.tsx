// S04 텍스트 렌더링 요청. Figma 25:242.
import { notFound } from "next/navigation";
import type { UseType } from "@/types";
import { findListing } from "@/mocks/listings";
import ChatView from "@/components/studio/ChatView";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ use?: string }>;
};

export default async function StudioChatPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { use } = await searchParams;

  const listing = findListing(id);
  if (!listing) notFound();

  const uses = Object.keys(listing.costs) as UseType[];
  const initialUse = uses.find((candidate) => candidate === use) ?? uses[0];

  return <ChatView listing={listing} initialUse={initialUse} />;
}

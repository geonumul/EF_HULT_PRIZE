// S03 공간 스튜디오. Figma 24:242.
// 공실 id는 주소, 업종은 ?use= 쿼리로 받는다. 없는 공실이면 404, 없는 업종이면 그 공실의 첫 업종으로 연다.
import { notFound } from "next/navigation";
import type { UseType } from "@/types";
import { findListing } from "@/mocks/listings";
import StudioView from "@/components/studio/StudioView";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ use?: string }>;
};

export default async function StudioPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { use } = await searchParams;

  const listing = findListing(id);
  if (!listing) notFound();

  const uses = Object.keys(listing.costs) as UseType[];
  const initialUse = uses.find((candidate) => candidate === use) ?? uses[0];

  return <StudioView listing={listing} initialUse={initialUse} />;
}

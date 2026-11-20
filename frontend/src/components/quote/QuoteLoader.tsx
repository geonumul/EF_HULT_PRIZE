"use client";

// 견적 확정 화면. 렌더링 id의 공간을 불러온 뒤 QuoteView를 보여 준다.
import SpaceMessage from "@/components/common/SpaceMessage";
import Footer from "@/components/layout/Footer";
import { USE_LABELS } from "@/lib/format";
import { spaceIdOfRender, useSpace } from "@/lib/spaces";
import { findRender } from "@/mocks/renders";
import QuoteView from "./QuoteView";
import { parseUsedParam } from "./payment";

export default function QuoteLoader({ renderId, used, fromScene }: { renderId: string; used?: string; fromScene?: boolean }) {
  const { listing, status } = useSpace(spaceIdOfRender(renderId));
  const render = listing ? findRender(renderId) : undefined;
  if (!listing || !render) return <SpaceMessage status={listing ? "missing" : status} />;

  const title = `${listing.address} ${listing.tag.split(" ")[0]} · ${USE_LABELS[render.useType]}`;
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  return (
    <>
      <QuoteView renderId={renderId} title={title} today={today} initialUsedIds={parseUsedParam(used)} fromScene={fromScene} />
      <Footer />
    </>
  );
}

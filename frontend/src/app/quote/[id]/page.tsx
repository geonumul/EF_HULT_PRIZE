// 견적 확정 · 결제 (Figma S05 25:483). 존재하지 않는 렌더링 id는 404다.
import { notFound } from "next/navigation";
import Footer from "@/components/layout/Footer";
import QuoteView from "@/components/quote/QuoteView";
import { parseUsedParam } from "@/components/quote/payment";
import { findListing } from "@/mocks/listings";
import { findRender } from "@/mocks/renders";
import { USE_LABELS } from "@/lib/format";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ used?: string }>;
};

export default async function QuotePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { used } = await searchParams;

  const render = findRender(id);
  const listing = render ? findListing(render.listingId) : undefined;
  if (!render || !listing) notFound();

  const title = `${listing.address} ${listing.tag.split(" ")[0]} · ${USE_LABELS[render.useType]}`;
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <QuoteView renderId={id} title={title} today={today} initialUsedIds={parseUsedParam(used)} />
      <Footer />
    </>
  );
}

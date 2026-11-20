// 견적 확정 · 결제 (Figma S05 25:483). 공간은 화면에서 불러오고, 없는 렌더링 id는 안내를 보여 준다.
import QuoteLoader from "@/components/quote/QuoteLoader";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ used?: string; scene?: string }>;
};

export default async function QuotePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { used, scene } = await searchParams;
  return <QuoteLoader renderId={id} used={used} fromScene={scene === "1"} />;
}

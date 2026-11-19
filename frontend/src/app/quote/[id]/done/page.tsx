// 결제 완료 (Figma S06 30:1340). 본문은 QuoteDone이 그린다.
import QuoteDone from "@/components/quote/QuoteDone";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orderNo?: string; used?: string }>;
};

export default async function QuoteDonePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { orderNo = "", used } = await searchParams;
  return <QuoteDone id={id} orderNo={orderNo} used={used} />;
}

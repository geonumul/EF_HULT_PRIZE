// 받은 철거 견적 비교와 선택. 요청은 localStorage에 있어서 존재 확인은 화면 안에서 한다.
import BidCompare from "@/components/demolition/BidCompare";

export default async function DemolitionRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  return <BidCompare requestId={requestId} />;
}

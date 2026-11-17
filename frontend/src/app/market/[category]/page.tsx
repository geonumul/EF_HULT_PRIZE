// S07 집기 마켓 카테고리별 화면. 없는 카테고리는 안내 문구와 /market 링크를 보여 준다.
import Link from "next/link";
import ClosingCta from "@/components/market/ClosingCta";
import MarketBrowser from "@/components/market/MarketBrowser";
import Footer from "@/components/layout/Footer";
import { CATEGORY_LABELS } from "@/components/market/categories";

type Props = {
  params: Promise<{ category: string }>;
};

export default async function MarketCategoryPage({ params }: Props) {
  const { category } = await params;

  if (!(category in CATEGORY_LABELS)) {
    return (
      <>
        <main style={{ maxWidth: 1040, margin: "0 auto", padding: "120px 0", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>찾을 수 없는 카테고리입니다</h1>
          <p style={{ margin: "0 0 24px", color: "var(--gray-600)", fontSize: 14 }}>
            주소를 다시 확인하거나 전체 집기 마켓으로 돌아가세요.
          </p>
          <Link href="/market" style={{ color: "var(--brand-600)", fontWeight: 700 }}>
            집기 마켓으로 돌아가기
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <MarketBrowser category={category} />
      <ClosingCta />
      <Footer />
    </>
  );
}

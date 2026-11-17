// S07 집기 마켓 전체 카테고리. Figma 38:482.
import ClosingCta from "@/components/market/ClosingCta";
import MarketBrowser from "@/components/market/MarketBrowser";
import Footer from "@/components/layout/Footer";

export default function MarketPage() {
  return (
    <>
      <MarketBrowser />
      <ClosingCta />
      <Footer />
    </>
  );
}

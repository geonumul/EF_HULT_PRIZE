"use client";

// 집기 마켓 본문. Figma S07 38:482. 카테고리는 주소로, 나머지 필터와 정렬은 화면 안에서 바꾼다.
import Link from "next/link";
import { useState } from "react";
import Chip from "@/components/ui/Chip";
import { useRenderBoard } from "@/lib/renderBoard";
import { useProducts } from "@/lib/api/hooks";
import type { Product } from "@/types";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "./categories";
import ProductCard from "./ProductCard";
import RenderBoardPanel from "./RenderBoardPanel";
import styles from "./MarketBrowser.module.css";

type Condition = "new" | "used";
type Sort = "recommend" | "priceAsc" | "priceDesc";

// 가격대. 값은 원 단위이고 max가 없으면 상한이 없다.
const PRICE_RANGES = [
  { label: "전체", min: 0, max: Infinity },
  { label: "10만 원 이하", min: 0, max: 100000 },
  { label: "10~50만 원", min: 100000, max: 500000 },
  { label: "50~300만 원", min: 500000, max: 3000000 },
  { label: "300만 원 이상", min: 3000000, max: Infinity },
];

const SORTS: { key: Sort; label: string }[] = [
  { key: "recommend", label: "추천순" },
  { key: "priceAsc", label: "낮은 가격순" },
  { key: "priceDesc", label: "높은 가격순" },
];

/** 신품 보기면 신품 가격, 중고 보기면 중고 가격. */
function priceOf(product: Product, condition: Condition): number {
  return condition === "used" ? (product.usedPrice ?? 0) : product.price;
}

type Props = {
  category?: string; // 없으면 전체
};

export default function MarketBrowser({ category }: Props) {
  const [condition, setCondition] = useState<Condition>("new");
  const [sort, setSort] = useState<Sort>("recommend");
  const [priceIndex, setPriceIndex] = useState(0);
  const [keyword, setKeyword] = useState("");
  const board = useRenderBoard();
  const { products } = useProducts();

  const range = PRICE_RANGES[priceIndex];
  const text = keyword.trim();

  const filtered = products.filter((product) => {
    if (category && product.category !== category) return false;
    if (condition === "used" && !product.usedPrice) return false;
    if (text && !product.name.includes(text)) return false;
    const price = priceOf(product, condition);
    return price >= range.min && price <= range.max;
  });

  const shown = [...filtered];
  if (sort === "priceAsc") shown.sort((a, b) => priceOf(a, condition) - priceOf(b, condition));
  if (sort === "priceDesc") shown.sort((a, b) => priceOf(b, condition) - priceOf(a, condition));

  function countInBoard(productId: string): number {
    return board.items.find((item) => item.productId === productId)?.qty ?? 0;
  }

  function resetFilters() {
    setCondition("new");
    setPriceIndex(0);
    setKeyword("");
    setSort("recommend");
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>{category ? CATEGORY_LABELS[category] : "집기 마켓"}</h1>
        <p className={styles.subtitle}>렌더링에 쓰인 상품 1,240개 · 신품, 중고, 대여</p>
      </header>

      <div className={styles.body}>
        <aside className={styles.side}>
          <section className={styles.group}>
            <p className={styles.groupTitle}>카테고리</p>
            <Link href="/market" className={category ? styles.option : styles.optionOn}>
              <span className={category ? styles.box : styles.boxOn} />
              전체
            </Link>
            {CATEGORY_KEYS.map((key) => (
              <Link key={key} href={`/market/${key}`} className={category === key ? styles.optionOn : styles.option}>
                <span className={category === key ? styles.boxOn : styles.box} />
                {CATEGORY_LABELS[key]}
              </Link>
            ))}
          </section>

          <section className={styles.group}>
            <p className={styles.groupTitle}>상태</p>
            <button type="button" className={condition === "new" ? styles.optionOn : styles.option} onClick={() => setCondition("new")}>
              <span className={condition === "new" ? styles.boxOn : styles.box} />
              신품
            </button>
            <button type="button" className={condition === "used" ? styles.optionOn : styles.option} onClick={() => setCondition("used")}>
              <span className={condition === "used" ? styles.boxOn : styles.box} />
              중고
            </button>
          </section>

          <section className={styles.group}>
            <p className={styles.groupTitle}>가격</p>
            {PRICE_RANGES.map((item, index) => (
              <button
                key={item.label}
                type="button"
                className={priceIndex === index ? styles.optionOn : styles.option}
                onClick={() => setPriceIndex(index)}
              >
                <span className={priceIndex === index ? styles.boxOn : styles.box} />
                {item.label}
              </button>
            ))}
          </section>
        </aside>

        <div className={styles.main}>
          <div className={styles.source}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/render-cafe.jpg" alt="" className={styles.sourceImage} />
            <div className={styles.sourceText}>
              <span className={styles.sourceBadge}>렌더링 연결</span>
              <p className={styles.sourceTitle}>성수동2가 39.6m² · 카페 우드톤 렌더링</p>
              <p className={styles.sourceSub}>렌더링 속 상품 12개 · 합계 2,140만 원</p>
            </div>
            <Link href="/space/seongsu-2ga-1f/studio?use=cafe" className={styles.sourceButton}>
              렌더링으로 돌아가기
            </Link>
          </div>

          <div className={styles.toolbar}>
            <p className={styles.count}>상품 {shown.length}개</p>
            <input
              type="search"
              className={styles.search}
              placeholder="상품 이름 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              aria-label="상품 검색"
            />
            {SORTS.map((item) => (
              <Chip key={item.key} selected={sort === item.key} className={styles.sortChip} onClick={() => setSort(item.key)}>
                {item.label}
              </Chip>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className={styles.empty}>
              <p>조건에 맞는 상품이 없습니다.</p>
              <button type="button" className={styles.reset} onClick={resetFilters}>
                필터 초기화
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {shown.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showUsed={condition === "used"}
                  count={countInBoard(product.id)}
                  onAdd={() => board.add(product.id)}
                />
              ))}
            </div>
          )}

          <p className={styles.fee}>
            판매처 링크를 통해 구매하면 Shopportunity가 제휴 수수료를 받을 수 있습니다. 상품 가격과 재고는 판매처 기준입니다.
          </p>
        </div>
      </div>

      <RenderBoardPanel />
    </main>
  );
}

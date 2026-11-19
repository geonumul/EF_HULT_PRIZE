"use client";

// 오른쪽 견적 패널. 견적 그룹을 접고 펼 수 있고, 집기 줄을 누르면 그 상품의 태그가 열린다. Figma QuotePanel 24:333.
// 합계와 버튼은 TotalBar가 맡는다.
import { useState } from "react";
import Link from "next/link";
import type { Quote, RenderResult } from "@/types";
import { findProduct } from "@/mocks/products";
import { formatMan } from "@/lib/format";
import { AdChip, CertaintyChip } from "@/components/quote/CertaintyChip";
import TotalBar from "./TotalBar";
import styles from "./QuotePanel.module.css";

type Props = {
  title: string;
  listingId: string;
  render: RenderResult;
  quote: Quote;
  baseTotal: number; // 모두 신품일 때의 합계. 중고로 얼마 줄었는지 구할 때 쓴다.
  activeTagN: number | null;
  allUsed: boolean;
  onSelectTag: (n: number) => void;
  onSetAllUsed: (all: boolean) => void;
  confirmHref: string;
  disabled?: boolean; // 빈 공간 화면
};

// 시안에서 집기가 아닌 줄의 사진은 렌더링 이미지의 일부를 잘라 쓴다. 줄 순서마다 자르는 위치를 바꾼다.
const CROP_POSITIONS = ["10% 10%", "90% 20%", "50% 90%", "20% 70%"];

export default function QuotePanel(props: Props) {
  const { quote, render } = props;
  const [closedGroups, setClosedGroups] = useState<string[]>([]);

  function toggleGroup(key: string) {
    setClosedGroups(closedGroups.includes(key) ? closedGroups.filter((k) => k !== key) : [...closedGroups, key]);
  }

  const itemGroup = quote.groups.find((group) => group.key === "items");
  const facilityGroup = quote.groups.find((group) => group.key === "facility");
  const productCount = itemGroup ? itemGroup.items.reduce((sum, item) => sum + item.qty, 0) : 0;
  const facilityCount = facilityGroup ? facilityGroup.items.length : 0;

  return (
    <>
      <div className={props.disabled ? `${styles.head} ${styles.dimmed}` : styles.head}>
        <div className={styles.titleRow}>
          <p className={styles.title}>{props.title}</p>
          <div className={styles.segment}>
            <button type="button" className={!props.allUsed ? styles.segActive : styles.seg} onClick={() => props.onSetAllUsed(false)}>
              신품
            </button>
            <button type="button" className={props.allUsed ? styles.segActive : styles.seg} onClick={() => props.onSetAllUsed(true)}>
              중고 섞기
            </button>
          </div>
        </div>
        <p className={styles.sub}>
          집기 {productCount}개 · 설비 {facilityCount}건 · 시공 견적 3곳 평균
        </p>
      </div>

      <div className={props.disabled ? `${styles.groups} ${styles.dimmed}` : styles.groups}>
        {quote.groups.map((group) => {
          const isClosed = closedGroups.includes(group.key);
          return (
            <section key={group.key} className={styles.group}>
              <button type="button" className={styles.groupHead} onClick={() => toggleGroup(group.key)} aria-expanded={!isClosed}>
                <span className={styles.groupTitle}>
                  <span className={isClosed ? styles.arrowClosed : styles.arrow}>▾</span>
                  {group.title}
                </span>
                <span className={styles.groupSum}>{formatMan(Math.round(group.sum / 10000))}</span>
              </button>

              {!isClosed &&
                group.items.map((item, index) => {
                  const tag = item.productId ? render.tags.find((t) => t.productId === item.productId) : undefined;
                  const product = item.productId ? findProduct(item.productId) : undefined;
                  const isActive = tag !== undefined && tag.n === props.activeTagN;
                  const rowClass = isActive ? `${styles.row} ${styles.rowActive}` : styles.row;
                  const rowContent = (
                    <>
                      <span className={isActive ? `${styles.badge} ${styles.badgeActive}` : styles.badge}>{tag ? tag.n : ""}</span>
                      {product ? (
                        <img className={styles.thumb} src={product.imageUrl} alt="" />
                      ) : (
                        <span
                          className={styles.thumb}
                          style={{
                            backgroundImage: `url(${render.imageUrl})`,
                            backgroundSize: "357% 357%",
                            backgroundPosition: CROP_POSITIONS[index % CROP_POSITIONS.length],
                          }}
                        />
                      )}
                      <span className={styles.rowText}>
                        <span className={styles.rowName}>
                          {item.source === "partner" && <AdChip />}
                          {item.name}
                        </span>
                        <span className={styles.rowSpec}>
                          {item.spec}
                          {item.productId ? ` · ${item.qty}개` : ""}
                        </span>
                        {item.source === "internet" && <span className={styles.rowNote}>인터넷 최저가 기준</span>}
                      </span>
                      <span className={styles.rowRight}>
                        <span className={styles.rowPrice}>{formatMan(Math.round((item.unitPrice * item.qty) / 10000))}</span>
                        <CertaintyChip certainty={item.certainty} />
                      </span>
                    </>
                  );

                  return tag ? (
                    <button key={item.name + index} type="button" className={rowClass} onClick={() => props.onSelectTag(tag.n)}>
                      {rowContent}
                    </button>
                  ) : (
                    <div key={item.name + index} className={rowClass}>
                      {rowContent}
                    </div>
                  );
                })}

              {!isClosed && group.key === "demolition" && (
                <Link href={`/space/${props.listingId}/demolition`} className={styles.demolitionLink}>
                  철거 견적 받기
                </Link>
              )}
              {!isClosed && group.key === "items" && group.items.length === 0 && (
                <p className={styles.empty}>담긴 집기가 없어요. 태그에서 &quot;견적에 담기&quot;를 눌러 주세요.</p>
              )}
            </section>
          );
        })}
      </div>

      {!props.disabled && (
        <p className={styles.split}>
          확정 {formatMan(Math.round(quote.confirmedTotal / 10000))} + 예상 {formatMan(Math.round(quote.estimatedTotal / 10000))}
        </p>
      )}
      <TotalBar
        quote={quote}
        baseTotal={props.baseTotal}
        confirmHref={props.confirmHref}
        saveKey={render.id}
        disabled={props.disabled}
      />
    </>
  );
}

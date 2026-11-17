"use client";

// S10 파트너 콘솔의 틀. Figma 40:482. 윗줄, 사이드 메뉴, 메뉴에 맞는 패널.
// 사이트 공통 헤더가 이미 맨 위에 있어서 시안의 로고 줄에서 로고를 뺐다.
import Link from "next/link";
import { useState } from "react";
import { PARTNER_COMPANY } from "@/mocks/partner";
import { signOut, useSession } from "@/lib/session";
import { MEMBER_TYPE_LABELS } from "@/types/auth";
import ListingsPanel from "./ListingsPanel";
import { OverviewPanel, QuoteRequestsPanel, SettlementPanel } from "./OtherPanels";
import ProductsPanel from "./ProductsPanel";
import styles from "./PartnerConsole.module.css";

const TABS = [
  { id: "overview", label: "대시보드" },
  { id: "listings", label: "공실 관리" },
  { id: "products", label: "상품 관리" },
  { id: "quotes", label: "견적 요청" },
  { id: "settlement", label: "정산" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function PartnerConsole() {
  const [tab, setTab] = useState<TabId>("listings");
  const { session } = useSession();

  return (
    <div className={styles.console}>
      <div className={styles.topbar}>
        <span className={styles.badge}>파트너</span>
        <span className={styles.spacer} />
        <span className={styles.company}>
          {PARTNER_COMPANY}
          {session && ` · ${MEMBER_TYPE_LABELS[session.memberType]}`}
        </span>
        {session ? (
          <button type="button" className={styles.logout} onClick={() => signOut()}>
            로그아웃
          </button>
        ) : (
          <Link href="/login" className={styles.logout}>
            로그인
          </Link>
        )}
      </div>

      <div className={styles.body}>
        <nav className={styles.side} aria-label="파트너 메뉴">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? `${styles.menu} ${styles.menuActive}` : styles.menu}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
          {/* 시안에 없는 추가 기능(docs/FEATURES.md 2번). 화면은 /partner/demolition에 있다. */}
          <Link href="/partner/demolition" className={styles.menu}>
            철거 요청
          </Link>
        </nav>

        <main className={styles.content}>
          {tab === "overview" && <OverviewPanel />}
          {tab === "listings" && <ListingsPanel />}
          {tab === "products" && <ProductsPanel />}
          {tab === "quotes" && <QuoteRequestsPanel />}
          {tab === "settlement" && <SettlementPanel />}
        </main>
      </div>
    </div>
  );
}

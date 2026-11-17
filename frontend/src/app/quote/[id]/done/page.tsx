// 결제 완료 (Figma S06 30:1340). 주문 요약, 영수증, 다음 단계를 보여 준다.
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/layout/Footer";
import { buildPaymentPlan, dateOfOrderNo, formatManWon, parseUsedParam } from "@/components/quote/payment";
import { USE_LABELS, formatWon } from "@/lib/format";
import { buildQuote } from "@/lib/quote";
import { findListing } from "@/mocks/listings";
import { findRender } from "@/mocks/renders";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orderNo?: string; used?: string }>;
};

export default async function QuoteDonePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { orderNo = "", used } = await searchParams;

  const render = findRender(id);
  const listing = render ? findListing(render.listingId) : undefined;
  if (!render || !listing) notFound();

  const usedIds = parseUsedParam(used);
  const quote = buildQuote(render, usedIds);
  const plan = buildPaymentPlan(quote);
  const hasDemolition = quote.groups.some((group) => group.key === "demolition");
  const quoteHref = usedIds.length > 0 ? `/quote/${id}?used=${usedIds.join(",")}` : `/quote/${id}`;

  const nextSteps = [
    { title: "시공사 연결", text: "견적을 비교한 시공사 3곳이 영업일 기준 2일 안에 연락드립니다." },
    { title: "집기 배송", text: "발주가 전달된 판매처에서 배송 일정을 문자로 안내합니다." },
    ...(hasDemolition ? [{ title: "철거 일정 조율", text: "철거 업체가 현장 방문 일정을 잡습니다." }] : []),
  ];

  return (
    <>
      <main className={styles.main}>
        <section className={styles.card}>
          <svg className={styles.check} viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="28" r="28" fill="#00b368" />
            <path d="M17 29l8 8 14-16" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className={styles.title}>{formatManWon(plan.today)} 결제 완료</h1>
          <p className={styles.sub}>
            {listing.address} {listing.tag.split(" ")[0]} · {USE_LABELS[render.useType]} 견적 주문
          </p>

          <div className={styles.receipt}>
            <div className={styles.receiptHead}>
              <span>주문번호</span>
              <span className={styles.orderNo}>{orderNo || "-"}</span>
            </div>
            {dateOfOrderNo(orderNo) && (
              <div className={styles.receiptRow}>
                <span>결제일</span>
                <span>{dateOfOrderNo(orderNo)}</span>
              </div>
            )}
            {plan.lines.map((line) => (
              <div key={line.label} className={styles.receiptRow}>
                <span>{line.label}</span>
                <span>{formatWon(line.amount)}</span>
              </div>
            ))}
            <div className={styles.receiptTotal}>
              <span>결제 금액</span>
              <span>{formatWon(plan.today)}</span>
            </div>
            <div className={styles.receiptRow}>
              <span>잔금 (시공 완료 후 정산)</span>
              <span>{formatWon(plan.balance)}</span>
            </div>
          </div>

          <ol className={styles.steps}>
            {nextSteps.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNo}>{index + 1}</span>
                <div>
                  <p className={styles.stepTitle}>{step.title}</p>
                  <p className={styles.stepText}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.buttons}>
            <Link href={quoteHref} className={styles.quoteButton}>
              내 견적 보기
            </Link>
            <Link href="/map" className={styles.mapButton}>
              지도로 돌아가기
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

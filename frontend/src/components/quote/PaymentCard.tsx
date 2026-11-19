"use client";
// 결제 카드 (Figma S05 25:556). 토스페이먼츠 결제위젯을 쓰고, 키가 없으면 데모 모드로 가짜 승인한다.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Quote } from "@/types";
import { buildPaymentPlan, formatManWon, isValidPhone, makeOrderNo } from "./payment";
import styles from "./PaymentCard.module.css";

type Props = {
  renderId: string;
  quote: Quote;
  usedIds: string[];
  title: string; // 주문명에 쓴다
};

// 결제위젯 v1에서 쓰는 부분만 적은 타입
type MethodsWidget = { updateAmount: (value: number) => void };
type TossWidget = {
  renderPaymentMethods: (selector: string, amount: { value: number }) => MethodsWidget;
  requestPayment: (options: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerName: string;
    customerMobilePhone: string;
  }) => Promise<void>;
};
declare global {
  interface Window {
    PaymentWidget?: (clientKey: string, customerKey: string) => TossWidget;
  }
}

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
const IS_DEMO = CLIENT_KEY === "";
const SDK_URL = "https://js.tosspayments.com/v1/payment-widget";
const DEMO_METHODS = ["카드", "계좌이체", "간편결제"];

function loadTossScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaymentWidget) return resolve();
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

export default function PaymentCard({ renderId, quote, usedIds, title }: Props) {
  const router = useRouter();
  const plan = buildPaymentPlan(quote);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [demoMethod, setDemoMethod] = useState(DEMO_METHODS[0]);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  const widgetRef = useRef<TossWidget | null>(null);
  const methodsRef = useRef<MethodsWidget | null>(null);

  // 키가 있을 때만 결제위젯을 불러와 결제 수단 영역에 그린다.
  useEffect(() => {
    if (IS_DEMO) return;
    let cancelled = false;
    loadTossScript()
      .then(() => {
        if (cancelled || !window.PaymentWidget) return;
        widgetRef.current = window.PaymentWidget(CLIENT_KEY, "ANONYMOUS");
        methodsRef.current = widgetRef.current.renderPaymentMethods("#payment-method", { value: plan.today });
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
    // 위젯은 한 번만 그리고, 금액 변경은 아래 effect가 처리한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    methodsRef.current?.updateAmount(plan.today);
  }, [plan.today]);

  function usedQuery(): string {
    return usedIds.length > 0 ? `&used=${usedIds.join(",")}` : "";
  }

  function checkForm(): string {
    if (name.trim() === "") return "주문자 이름을 입력해 주세요.";
    if (!isValidPhone(phone)) return "연락처 형식이 올바르지 않습니다. 예: 010-1234-5678";
    if (!agreed) return "약관에 동의해 주세요.";
    return "";
  }

  async function handlePay() {
    const message = checkForm();
    setError(message);
    if (message) return;

    const orderNo = makeOrderNo();
    const donePath = `/quote/${renderId}/done`;
    setPaying(true);

    if (IS_DEMO) {
      // 가짜 승인: 잠깐 기다린 뒤 완료 화면으로 보낸다.
      await new Promise((resolve) => setTimeout(resolve, 600));
      router.push(`${donePath}?orderNo=${orderNo}${usedQuery()}`);
      return;
    }

    try {
      await widgetRef.current?.requestPayment({
        orderId: orderNo,
        orderName: `${title} 견적`,
        successUrl: `${window.location.origin}${donePath}?orderNo=${orderNo}${usedQuery()}`,
        failUrl: `${window.location.origin}/quote/${renderId}`,
        customerName: name.trim(),
        customerMobilePhone: phone.replace(/-/g, ""),
      });
    } catch {
      setError("결제가 취소되었거나 실패했습니다.");
      setPaying(false);
    }
  }

  return (
    <aside className={styles.card}>
      <h2 className={styles.title}>결제 · 발주</h2>

      {plan.lines.map((line) => (
        <div key={line.label} className={styles.line}>
          <span className={styles.lineLabel}>{line.label}</span>
          <span className={styles.lineValue}>{formatManWon(line.amount).replace(" 원", "")}</span>
        </div>
      ))}

      <hr className={styles.divider} />

      <div className={styles.todayRow}>
        <span className={styles.todayLabel}>오늘 결제</span>
        <span className={styles.todayValue}>{formatManWon(plan.today)}</span>
      </div>
      {quote.estimatedTotal > 0 && (
        <p className={styles.note}>
          확정 {formatManWon(quote.confirmedTotal)} + 예상 {formatManWon(quote.estimatedTotal)}
          <br />
          예상 금액은 판매처 가격 변동과 실제 견적에 따라 달라질 수 있어요.
        </p>
      )}
      <p className={styles.note}>잔금 {formatManWon(plan.balance)}은 시공 완료 후 정산</p>

      <div className={styles.form}>
        <input
          className={styles.input}
          placeholder="주문자 이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="주문자 이름"
        />
        <input
          className={styles.input}
          placeholder="연락처 (010-1234-5678)"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          aria-label="연락처"
        />
      </div>

      {IS_DEMO ? (
        <div className={styles.methods} role="radiogroup" aria-label="결제 수단">
          {DEMO_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={demoMethod === method}
              className={demoMethod === method ? `${styles.method} ${styles.methodOn}` : styles.method}
              onClick={() => setDemoMethod(method)}
            >
              {method}
            </button>
          ))}
        </div>
      ) : (
        <div id="payment-method" />
      )}

      <label className={styles.agree}>
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
        <span>이용약관 및 결제 대행 약관에 동의합니다.</span>
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <button type="button" className={styles.payButton} onClick={handlePay} disabled={paying}>
        {paying ? "결제 중..." : "발주 · 결제"}
      </button>
      <button type="button" className={styles.pdfButton} onClick={() => window.print()}>
        견적서 PDF 저장
      </button>

      {IS_DEMO && <p className={styles.demo}>데모 결제입니다. 실제 금액은 청구되지 않습니다.</p>}
    </aside>
  );
}

// 견적 확정 화면의 결제 보조 함수. 분할 비율과 주문번호 규칙을 한곳에 모았다.
import type { Quote } from "@/types";

// 시안(S05)의 분할: 집기는 전액 선결제, 설비 30%, 시공 10%. 철거는 시안에 없어 시공과 같은 10%로 둔다.
const DEPOSIT_RATE = { facility: 0.3, construction: 0.1, demolition: 0.1 };

export type PaymentLine = { label: string; amount: number };

export type PaymentPlan = {
  lines: PaymentLine[];
  today: number; // 오늘 결제할 금액. 원
  balance: number; // 잔금. 원
};

function sumOfGroup(quote: Quote, key: string): number {
  return quote.groups.find((group) => group.key === key)?.sum ?? 0;
}

export function buildPaymentPlan(quote: Quote): PaymentPlan {
  const lines: PaymentLine[] = [{ label: "집기 선결제", amount: sumOfGroup(quote, "items") }];

  const facility = Math.round(sumOfGroup(quote, "facility") * DEPOSIT_RATE.facility);
  lines.push({ label: "설비 계약금 (30%)", amount: facility });

  const construction = Math.round(sumOfGroup(quote, "construction") * DEPOSIT_RATE.construction);
  lines.push({ label: "시공 계약금 (10%)", amount: construction });

  if (quote.groups.some((group) => group.key === "demolition")) {
    const demolition = Math.round(sumOfGroup(quote, "demolition") * DEPOSIT_RATE.demolition);
    lines.push({ label: "철거 계약금 (10%)", amount: demolition });
  }

  const today = lines.reduce((sum, line) => sum + line.amount, 0);
  return { lines, today, balance: quote.total - today };
}

/** 원 단위 금액을 "2,522만 원"으로 쓴다. 1만 원 미만은 반올림한다. */
export function formatManWon(won: number): string {
  return `${Math.round(won / 10000).toLocaleString("ko-KR")}만 원`;
}

/** 주문번호: SP-20261117-4821 */
export function makeOrderNo(now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const serial = String(Math.floor(1000 + Math.random() * 9000));
  return `SP-${date}-${serial}`;
}

/** 주문번호에서 날짜를 읽어 "2026년 11월 17일"로 만든다. 형식이 다르면 빈 문자열이다. */
export function dateOfOrderNo(orderNo: string): string {
  const match = /^SP-(\d{4})(\d{2})(\d{2})-/.exec(orderNo);
  if (!match) return "";
  return `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일`;
}

export function isValidPhone(phone: string): boolean {
  return /^01[016789]-?\d{3,4}-?\d{4}$/.test(phone.trim());
}

/** used 쿼리("a,b")를 상품 id 배열로 바꾼다. */
export function parseUsedParam(value: string | string[] | undefined): string[] {
  const text = Array.isArray(value) ? value[0] : value;
  return text ? text.split(",").filter(Boolean) : [];
}

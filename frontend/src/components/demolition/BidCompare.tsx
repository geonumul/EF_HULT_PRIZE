"use client";
// 받은 철거 견적 비교와 업체 선택. 견적은 요청 시각에서 시간차를 두고 하나씩 도착한 것처럼 보인다.
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import BidCard from "@/components/demolition/BidCard";
import ReviewForm from "@/components/demolition/ReviewForm";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import { findRequest, loadAllBids, saveRequest } from "@/lib/demolition";
import { formatWon, USE_LABELS } from "@/lib/format";
import { findVendor } from "@/mocks/demolition";
import { findListing } from "@/mocks/listings";
import type { DemolitionBid, DemolitionRequest, DemolitionReview } from "@/types/demolition";
import styles from "./BidCompare.module.css";

type SortKey = "price" | "rating";

type Props = { requestId: string };

export default function BidCompare({ requestId }: Props) {
  // undefined는 아직 읽지 않았다는 뜻이고, null은 저장된 요청이 없다는 뜻이다.
  const [request, setRequest] = useState<DemolitionRequest | null | undefined>(undefined);
  const [now, setNow] = useState(Date.now());
  const [sortKey, setSortKey] = useState<SortKey>("price");

  useEffect(() => {
    setRequest(findRequest(requestId) ?? null);
  }, [requestId]);

  // 1초마다 시각을 갱신해 도착 시각이 지난 견적을 보여 준다. 파트너가 낸 견적도 같이 다시 읽는다.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (request === undefined) return <main className={styles.page} />;
  if (request === null) notFound();

  const listing = findListing(request.listingId);
  const allBids = loadAllBids(request);
  const arrived = allBids.filter((bid) => bid.arrivesAt <= now);
  const sorted = sortBids(arrived, sortKey);
  const selectedBid = arrived.find((bid) => bid.vendorId === request.selectedVendorId);
  const selectedVendor = request.selectedVendorId ? findVendor(request.selectedVendorId) : undefined;

  function updateRequest(changes: Partial<DemolitionRequest>) {
    const next = { ...(request as DemolitionRequest), ...changes };
    saveRequest(next);
    setRequest(next);
  }

  function selectBid(bid: DemolitionBid) {
    updateRequest({ status: "selected", selectedVendorId: bid.vendorId, selectedAmountWon: bid.amountWon });
  }

  function submitReview(review: DemolitionReview) {
    updateRequest({ review });
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>받은 철거 견적</h1>
      <p className={styles.lead}>
        {listing?.address} {listing?.tag} · 철거 후 {USE_LABELS[request.useType]} · 추정 {formatWon(request.estimate.minWon)} ~{" "}
        {formatWon(request.estimate.maxWon)}
      </p>

      <div className={styles.toolbar}>
        <span className={styles.count}>
          {request.region} 철거 업체 {request.vendorIds.length}곳 중 {arrived.length}곳 견적 도착
          {arrived.length < allBids.length && " · 견적을 기다리는 중"}
        </span>
        <div className={styles.sort}>
          <Chip selected={sortKey === "price"} onClick={() => setSortKey("price")}>
            금액순
          </Chip>
          <Chip selected={sortKey === "rating"} onClick={() => setSortKey("rating")}>
            평점순
          </Chip>
        </div>
      </div>

      {sorted.length === 0 && <p className={styles.empty}>업체가 요청을 확인하고 있습니다. 잠시만 기다려 주세요.</p>}

      <div className={styles.cards}>
        {sorted.map((bid) => {
          const vendor = findVendor(bid.vendorId);
          if (!vendor) return null;
          return (
            <BidCard
              key={bid.id}
              bid={bid}
              vendor={vendor}
              isSelected={bid.vendorId === request.selectedVendorId}
              canSelect={request.status === "open"}
              onSelect={() => selectBid(bid)}
            />
          );
        })}
      </div>

      {selectedBid && selectedVendor && (
        <section className={styles.confirm}>
          <h2 className={styles.confirmTitle}>
            {selectedVendor.name} 선택 · {formatWon(selectedBid.amountWon)}
          </h2>
          <p className={styles.confirmText}>확정 철거비가 견적서의 철거 항목에 반영됩니다.</p>
          <div className={styles.confirmActions}>
            <Link href={`/quote/r-${request.listingId}-${request.useType}`} className={styles.linkButton}>
              견적서에서 확인하기
            </Link>
            {request.status === "selected" && (
              <Button variant="secondary" onClick={() => updateRequest({ status: "done" })}>
                작업 완료 처리
              </Button>
            )}
          </div>
        </section>
      )}

      {request.status === "done" && !request.review && <ReviewForm onSubmit={submitReview} />}

      {request.review && (
        <section className={styles.review}>
          <h2 className={styles.confirmTitle}>작성한 후기</h2>
          <span className={styles.stars}>{"★".repeat(request.review.rating)}</span>
          <p className={styles.confirmText}>{request.review.body}</p>
        </section>
      )}
    </main>
  );
}

function sortBids(bids: DemolitionBid[], sortKey: SortKey): DemolitionBid[] {
  const copy = [...bids];
  if (sortKey === "price") return copy.sort((a, b) => a.amountWon - b.amountWon);
  return copy.sort((a, b) => (findVendor(b.vendorId)?.rating ?? 0) - (findVendor(a.vendorId)?.rating ?? 0));
}

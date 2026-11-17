"use client";
// 철거 업체가 받은 요청 목록과 견적 제출 화면. 데모에서는 업체를 골라 그 업체로 일한다.
import { useEffect, useState } from "react";
import PartnerBidForm from "@/components/demolition/PartnerBidForm";
import Chip from "@/components/ui/Chip";
import { SCOPE_LABELS, formatDate, loadPartnerBids, loadRequests, savePartnerBid } from "@/lib/demolition";
import { formatArea, formatWon, USE_LABELS } from "@/lib/format";
import { DEMOLITION_VENDORS, findVendor } from "@/mocks/demolition";
import { findListing } from "@/mocks/listings";
import type { DemolitionBid, DemolitionRequest } from "@/types/demolition";
import styles from "./PartnerConsole.module.css";

const DEMO_VENDORS = DEMOLITION_VENDORS.slice(0, 3); // 요청이 전달되는 업체

export default function PartnerConsole() {
  const [vendorId, setVendorId] = useState(DEMO_VENDORS[0].id);
  const [requests, setRequests] = useState<DemolitionRequest[]>([]);
  const [bids, setBids] = useState<DemolitionBid[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  function reload() {
    setRequests(loadRequests());
    setBids(loadPartnerBids());
  }

  useEffect(reload, []);

  const myRequests = requests.filter((request) => request.vendorIds.includes(vendorId)).sort((a, b) => b.createdAt - a.createdAt);

  function submitBid(bid: DemolitionBid) {
    savePartnerBid(bid);
    reload();
    setOpenId(null);
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>철거 요청</h1>
      <p className={styles.lead}>받은 요청을 열어 금액, 시작 가능일, 포함 범위를 입력하면 견적이 사용자에게 전달됩니다.</p>

      <div className={styles.vendors}>
        {DEMO_VENDORS.map((vendor) => (
          <Chip
            key={vendor.id}
            selected={vendorId === vendor.id}
            onClick={() => {
              setVendorId(vendor.id);
              setOpenId(null);
            }}
          >
            {vendor.name}
          </Chip>
        ))}
      </div>

      {myRequests.length === 0 && (
        <p className={styles.empty}>받은 요청이 없습니다. 공실 화면에서 철거 견적을 요청하면 여기에 나타납니다.</p>
      )}

      <ul className={styles.list}>
        {myRequests.map((request) => {
          const listing = findListing(request.listingId);
          const myBid = bids.find((bid) => bid.requestId === request.id && bid.vendorId === vendorId);
          const isOpen = openId === request.id;
          return (
            <li key={request.id} className={styles.item}>
              <div className={styles.row}>
                <div className={styles.summary}>
                  <strong className={styles.place}>
                    {listing?.address} {listing?.tag} · {listing ? formatArea(listing.areaM2) : ""}
                  </strong>
                  <span className={styles.meta}>
                    {request.region} · 철거 후 {USE_LABELS[request.useType]} · 범위 {request.input.scopes.map((s) => SCOPE_LABELS[s]).join(", ")}
                  </span>
                </div>
                <span className={statusClass(request, myBid, vendorId)}>{statusText(request, myBid, vendorId)}</span>
                <button type="button" className={styles.toggle} onClick={() => setOpenId(isOpen ? null : request.id)}>
                  {isOpen ? "닫기" : "열기"}
                </button>
              </div>
              {isOpen && (
                <div className={styles.detail}>
                  <p className={styles.meta}>
                    {findVendor(vendorId)?.name}로 제출합니다. 사용자의 추정 범위는 {formatWon(request.estimate.minWon)} ~{" "}
                    {formatWon(request.estimate.maxWon)}입니다.
                  </p>
                  {myBid && (
                    <p className={styles.meta}>
                      제출한 견적 {formatWon(myBid.amountWon)} · 시작 {formatDate(myBid.startDate)}
                    </p>
                  )}
                  <PartnerBidForm request={request} vendorId={vendorId} previous={myBid} onSubmit={submitBid} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function statusText(request: DemolitionRequest, myBid: DemolitionBid | undefined, vendorId: string): string {
  if (request.selectedVendorId === vendorId) return "선택됨";
  if (request.selectedVendorId) return "다른 업체 선택됨";
  return myBid ? "견적 제출됨" : "견적 대기";
}

function statusClass(request: DemolitionRequest, myBid: DemolitionBid | undefined, vendorId: string): string {
  const isDone = request.selectedVendorId === vendorId || Boolean(myBid);
  return isDone ? styles.statusDone : styles.statusWaiting;
}

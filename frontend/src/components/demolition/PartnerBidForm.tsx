"use client";
// 철거 업체가 금액, 시작 가능일, 포함 범위를 입력해 견적을 내는 폼.
import { useState } from "react";
import Button from "@/components/ui/Button";
import type { DemolitionBid, DemolitionRequest } from "@/types/demolition";
import styles from "./PartnerBidForm.module.css";

type Props = {
  request: DemolitionRequest;
  vendorId: string;
  previous?: DemolitionBid; // 이미 낸 견적이 있으면 그 값으로 채운다.
  onSubmit: (bid: DemolitionBid) => void;
};

export default function PartnerBidForm({ request, vendorId, previous, onSubmit }: Props) {
  const [amountMan, setAmountMan] = useState(previous ? String(previous.amountWon / 10000) : "");
  const [startDate, setStartDate] = useState(previous?.startDate ?? "");
  const [scopeNote, setScopeNote] = useState(previous?.scopeNote ?? "");

  const amount = Number(amountMan);
  const canSubmit = amount > 0 && startDate !== "" && scopeNote.trim() !== "";

  function submit() {
    onSubmit({
      id: `bid-${request.id}-${vendorId}`,
      requestId: request.id,
      vendorId,
      amountWon: Math.round(amount) * 10000,
      startDate,
      scopeNote: scopeNote.trim(),
      arrivesAt: Date.now(),
    });
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) submit();
      }}
    >
      <label className={styles.field}>
        금액 (만원)
        <input
          className={styles.input}
          type="number"
          min={1}
          value={amountMan}
          onChange={(event) => setAmountMan(event.target.value)}
        />
      </label>
      <label className={styles.field}>
        시작 가능일
        <input className={styles.input} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
      </label>
      <label className={styles.field}>
        포함 범위
        <textarea
          className={styles.input}
          rows={3}
          value={scopeNote}
          onChange={(event) => setScopeNote(event.target.value)}
        />
      </label>
      <Button type="submit" disabled={!canSubmit}>
        {previous ? "견적 수정해서 다시 제출" : "견적 제출"}
      </Button>
    </form>
  );
}

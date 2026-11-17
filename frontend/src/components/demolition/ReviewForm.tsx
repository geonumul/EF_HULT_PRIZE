"use client";
// 작업 완료 뒤 후기 작성 폼. 별점과 내용을 받는다.
import { useState } from "react";
import Button from "@/components/ui/Button";
import type { DemolitionReview } from "@/types/demolition";
import styles from "./ReviewForm.module.css";

type Props = { onSubmit: (review: DemolitionReview) => void };

export default function ReviewForm({ onSubmit }: Props) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const canSubmit = rating > 0 && body.trim().length > 0;

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit({ rating, body: body.trim() });
      }}
    >
      <h2 className={styles.title}>후기 작성</h2>
      <div className={styles.stars} role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value}점`}
            className={value <= rating ? styles.starOn : styles.star}
            onClick={() => setRating(value)}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className={styles.textarea}
        rows={4}
        placeholder="작업 품질, 일정, 소통은 어땠나요?"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <Button type="submit" disabled={!canSubmit}>
        후기 등록
      </Button>
    </form>
  );
}

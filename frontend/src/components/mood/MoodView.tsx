"use client";

// 무드 이미지 올리기. 원하는 분위기의 사진을 올리면 색을 읽어 어울리는 스타일을 고르고, 그 스타일로 스튜디오를 연다.
// 사진은 서버로 보내지 않고 이 브라우저에서만 읽는다.
import Link from "next/link";
import { useState } from "react";
import type { ChangeEvent } from "react";
import { USE_LABELS } from "@/lib/format";
import { analyzeFile, mergeMoods, reasonOf } from "@/lib/mood";
import type { MoodResult } from "@/lib/mood";
import { LISTINGS } from "@/mocks/listings";
import { RENDER_STYLES } from "@/mocks/studio";
import type { UseType } from "@/types";
import styles from "./MoodView.module.css";

const MAX_FILES = 6;

export default function MoodView() {
  const [previews, setPreviews] = useState<string[]>([]);
  const [mood, setMood] = useState<MoodResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_FILES);
    event.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const results = await Promise.all(files.map(analyzeFile));
      setMood(mergeMoods(results));
      setPreviews((before) => {
        before.forEach((url) => URL.revokeObjectURL(url));
        return files.map((file) => URL.createObjectURL(file));
      });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "이미지를 분석하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  const styleLabel = mood ? RENDER_STYLES.find((item) => item.key === mood.style)?.label : "";

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>원하는 분위기 올리기</h1>
      <p className={styles.lead}>
        마음에 드는 가게 사진을 최대 {MAX_FILES}장 올려 주세요. 색을 읽어 어울리는 스타일을 고르고, 그 스타일로 공간을 보여 드려요. 사진은 서버로 보내지 않아요.
      </p>

      <label className={styles.drop}>
        <input type="file" accept="image/*" multiple onChange={pick} className={styles.file} />
        {busy ? "읽는 중..." : "사진 고르기"}
      </label>
      {error && <p className={styles.error}>{error}</p>}

      {previews.length > 0 && (
        <ul className={styles.previews}>
          {previews.map((url) => (
            <li key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="올린 무드 사진" />
            </li>
          ))}
        </ul>
      )}

      {mood && (
        <section className={styles.result}>
          <h2>추천 스타일: {styleLabel}</h2>
          <p>{reasonOf(mood.style)}</p>
          <ul className={styles.swatches} aria-label="주요 색">
            {mood.swatches.map((color, index) => (
              <li key={`${color}-${index}`} style={{ background: color }} title={color} />
            ))}
          </ul>

          <h3>이 스타일로 공간 보기</h3>
          <ul className={styles.spaces}>
            {LISTINGS.slice(0, 4).map((listing) => {
              const use = Object.keys(listing.costs)[0] as UseType;
              return (
                <li key={listing.id}>
                  <Link href={`/space/${listing.id}/studio?use=${use}&style=${mood.style}`}>
                    {listing.address} · {listing.areaM2}㎡ · {USE_LABELS[use]}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/space/new" className={styles.own}>
            내 공간 크기를 넣고 보기
          </Link>
        </section>
      )}
    </main>
  );
}

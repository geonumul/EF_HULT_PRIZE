"use client";

// 창업 가이드 본문. Figma S08 39:482.
// 창업 순서는 눌러서 완료 표시를 하고, 표시는 브라우저에 저장한다. 처음에는 시안처럼 1~3단계가 완료 상태다.
import Link from "next/link";
import { useEffect, useState } from "react";
import Chip from "@/components/ui/Chip";
import { GUIDE_COSTS, GUIDE_PERMITS, GUIDE_STEPS } from "@/mocks/guide";
import type { UseType } from "@/types";
import styles from "./GuideView.module.css";

const STORAGE_KEY = "shopportunity-guide-steps";
const DEFAULT_DONE = [0, 1, 2];

export default function GuideView() {
  const [doneSteps, setDoneSteps] = useState<number[]>(DEFAULT_DONE);
  const [permitFilter, setPermitFilter] = useState<UseType | "all">("all");

  // 저장된 완료 표시를 화면이 뜬 뒤에 읽는다. 서버 화면과 맞추기 위해서다.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setDoneSteps(JSON.parse(saved));
    } catch {
      // 저장된 값이 깨졌으면 기본값을 그대로 쓴다.
    }
  }, []);

  function toggleStep(index: number) {
    const next = doneSteps.includes(index) ? doneSteps.filter((i) => i !== index) : [...doneSteps, index];
    setDoneSteps(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 공간이 막혀 있어도 화면은 계속 동작한다.
    }
  }

  const permits = permitFilter === "all" ? GUIDE_PERMITS : GUIDE_PERMITS.filter((p) => p.useType === permitFilter);

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>창업 가이드</h1>
        <p className={styles.subtitle}>
          업종별 평균 창업비와 인허가 절차 · 서울 성동구 1층 상가 33~50m², 2026년 11월 견적 기준
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>업종별 평균 창업비</h2>
        <div className={styles.cards}>
          {GUIDE_COSTS.map((cost) => (
            <article key={cost.useType} className={styles.card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cost.image} alt="" className={styles.cardImage} />
              <div className={styles.cardBody}>
                <div className={styles.cardHead}>
                  <p className={styles.cardName}>{cost.name}</p>
                  <p className={styles.cardPeriod}>{cost.period}</p>
                </div>
                <p className={styles.cardTotal}>{cost.total}</p>
                <div className={styles.rows}>
                  {cost.rows.map((row) => (
                    <div key={row.label} className={styles.row}>
                      <span className={styles.rowLabel}>{row.label}</span>
                      <span className={styles.rowValue}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <Link href={`/map?use=${cost.useType}`} className={styles.cardButton}>
                  {cost.button}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>창업 순서</h2>
        <div className={styles.steps}>
          {GUIDE_STEPS.map((step, index) => {
            const done = doneSteps.includes(index);
            return (
              <button
                key={step.title}
                type="button"
                className={done ? styles.stepDone : styles.step}
                aria-pressed={done}
                onClick={() => toggleStep(index)}
              >
                <span className={done ? styles.numberDone : styles.number}>{index + 1}</span>
                <span className={styles.stepTitle}>{step.title}</span>
                <span className={styles.stepText}>{step.text}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>업종별 인허가 체크리스트</h2>
        <div className={styles.tabs}>
          <Chip selected={permitFilter === "all"} onClick={() => setPermitFilter("all")}>
            전체
          </Chip>
          {GUIDE_PERMITS.map((permit) => (
            <Chip key={permit.useType} selected={permitFilter === permit.useType} onClick={() => setPermitFilter(permit.useType)}>
              {permit.name}
            </Chip>
          ))}
        </div>
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span className={styles.colUse}>업종</span>
            <span className={styles.colBuilding}>건축물 용도</span>
            <span className={styles.colReport}>신고·허가</span>
            <span className={styles.colDocs}>준비 서류</span>
          </div>
          {permits.map((permit) => (
            <div key={permit.useType} className={styles.tableRow}>
              <span className={`${styles.colUse} ${styles.bold}`}>{permit.name}</span>
              <span className={styles.colBuilding}>{permit.building}</span>
              <span className={styles.colReport}>{permit.report}</span>
              <span className={styles.colDocs}>{permit.documents}</span>
            </div>
          ))}
        </div>
        <p className={styles.note}>면적·층수에 따라 요건이 달라집니다. 계약 전 구청과 관할 소방서에 확인하세요.</p>
      </section>
    </main>
  );
}

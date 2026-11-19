"use client";

// 렌더링을 기다리는 동안 보여 주는 단계 안내. 시간이 흐르면 다음 단계로 넘어가고, 실제 완료되면 부모가 바로 닫는다.
import { useEffect, useState } from "react";
import styles from "./RenderProgress.module.css";

// 각 단계가 시작되는 시각(초). 실제 걸리는 시간은 30~90초다.
const STEPS = [
  { label: "배치 계산", from: 0 },
  { label: "건축 구조 반영", from: 4 },
  { label: "이미지 생성", from: 12 },
  { label: "기준 검수", from: 55 },
  { label: "가구와 상품 연결", from: 70 },
];

export default function RenderProgress() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  let current = 0;
  STEPS.forEach((step, index) => {
    if (seconds >= step.from) current = index;
  });

  return (
    <div className={styles.overlay} role="status" aria-live="polite" onClick={(event) => event.stopPropagation()}>
      <div className={styles.card}>
        <span className={styles.spinner} />
        <p className={styles.title}>AI로 렌더링을 만드는 중이에요</p>
        <p className={styles.hint}>보통 30~90초 걸려요. 창을 닫지 말고 기다려 주세요.</p>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.label} className={index < current ? styles.done : index === current ? styles.now : styles.todo}>
              <span className={styles.dot} aria-hidden="true">
                {index < current ? "✓" : index + 1}
              </span>
              {step.label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

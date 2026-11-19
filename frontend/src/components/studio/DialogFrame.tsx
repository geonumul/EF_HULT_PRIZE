"use client";

// 배치도 대화상자와 접근 코드 대화상자가 같이 쓰는 틀.
// ESC나 바깥 클릭으로 닫히고, 열릴 때 닫기 버튼으로 포커스를 옮기며, 닫히면 원래 버튼으로 돌려준다. 포커스를 가두지 않는다.
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import styles from "./DialogFrame.module.css";

type Props = {
  title: string;
  onClose: () => void;
  wide?: boolean; // 배치도처럼 넓은 내용
  children: ReactNode;
};

export default function DialogFrame({ title, onClose, wide, children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, []);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={wide ? `${styles.dialog} ${styles.wide}` : styles.dialog}
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          <button ref={closeRef} type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}

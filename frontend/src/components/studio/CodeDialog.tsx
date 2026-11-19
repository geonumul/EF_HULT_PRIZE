"use client";

// 렌더링 접근 코드를 입력받는 작은 대화상자
import { useState } from "react";
import DialogFrame from "./DialogFrame";
import styles from "./CodeDialog.module.css";

type Props = {
  /** 코드가 틀렸을 때 보여 줄 안내 */
  message?: string;
  onSubmit: (code: string) => void;
  onClose: () => void;
};

export default function CodeDialog({ message, onSubmit, onClose }: Props) {
  const [code, setCode] = useState("");

  return (
    <DialogFrame title="접근 코드 입력" onClose={onClose}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim()) onSubmit(code.trim());
        }}
      >
        <p className={styles.text}>AI 렌더링은 접근 코드가 있는 분만 쓸 수 있어요. 한 번 입력하면 이 기기에 저장돼요.</p>
        {message && (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}
        <label className={styles.label}>
          접근 코드
          <input
            className={styles.input}
            type="password"
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
        <button type="submit" className={styles.submit} disabled={!code.trim()}>
          렌더링 시작
        </button>
      </form>
    </DialogFrame>
  );
}

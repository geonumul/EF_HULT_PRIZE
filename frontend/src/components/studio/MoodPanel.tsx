"use client";

// 오른쪽 패널의 "무드" 탭. 마음에 드는 가게 사진(핀터레스트 등에서 저장하거나 붙여넣은 것)과 요청 문장을 넣는다.
// 위쪽의 "사진 다시 만들기"와 "360 다시 만들기"가 이 분위기를 따른다.
import { useState } from "react";
import { MAX_MOOD_REFS, fileToMoodRef } from "@/lib/moodRefs";
import styles from "./MoodPanel.module.css";

type Props = {
  moodRefs: string[];
  onMoodRefs: (next: string[]) => void;
  note: string;
  onNote: (note: string) => void;
  /** 색으로 스타일만 고르는 화면 */
  moodHref: string;
};

export default function MoodPanel({ moodRefs, onMoodRefs, note, onNote, moodHref }: Props) {
  const [error, setError] = useState("");

  async function add(files: Iterable<Blob>) {
    setError("");
    try {
      const room = MAX_MOOD_REFS - moodRefs.length;
      const picked = [...files].filter((file) => file.type.startsWith("image/")).slice(0, Math.max(0, room));
      if (picked.length === 0) {
        setError(room <= 0 ? `분위기 사진은 최대 ${MAX_MOOD_REFS}장이에요. 하나를 지우고 올려 주세요.` : "이미지 파일만 올릴 수 있어요.");
        return;
      }
      const refs = await Promise.all(picked.map(fileToMoodRef));
      onMoodRefs([...moodRefs, ...refs].slice(0, MAX_MOOD_REFS));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "이미지를 읽지 못했어요.");
    }
  }

  return (
    <div
      className={styles.root}
      tabIndex={-1}
      onPaste={(event) => {
        const files = [...event.clipboardData.files];
        if (files.length > 0) {
          event.preventDefault();
          void add(files);
        }
      }}
    >
      <p className={styles.lead}>마음에 드는 가게 사진을 올리면 사진 다시 만들기가 그 분위기(색, 재질, 조명)를 따라요. 방 구조와 가구 위치는 그대로예요.</p>

      <div className={styles.row}>
        {moodRefs.map((ref, index) => (
          <figure key={ref.slice(-24) + index} className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ref} alt="분위기 참고 사진" />
            <button type="button" aria-label="지우기" onClick={() => onMoodRefs(moodRefs.filter((_, i) => i !== index))}>
              ×
            </button>
          </figure>
        ))}
        {moodRefs.length < MAX_MOOD_REFS && (
          <label className={styles.add}>
            <input
              type="file"
              accept="image/*"
              multiple
              className={styles.file}
              onChange={(event) => {
                void add(event.target.files ? [...event.target.files] : []);
                event.target.value = "";
              }}
            />
            + 사진 올리기
          </label>
        )}
      </div>
      <p className={styles.note}>핀터레스트에서 저장한 사진을 올리거나, 이 화면을 누른 상태에서 Ctrl+V로 붙여넣으세요. 사진은 이 브라우저에만 저장되고, 사진 다시 만들기를 누를 때만 서버로 가요.</p>
      {error && <p className={styles.error}>{error}</p>}

      <label className={styles.noteLabel}>
        덧붙일 요청 (선택)
        <input value={note} maxLength={200} onChange={(event) => onNote(event.target.value)} placeholder="예: 조명을 더 따뜻하게, 벽은 흰색으로" />
      </label>

      <a className={styles.link} href={moodHref}>
        사진 없이 색으로 스타일만 고르기
      </a>
    </div>
  );
}

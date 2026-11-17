"use client";

// 렌더링 아래쪽 스타일 바. 빈 공간, 스타일 세 가지, 텍스트 요청 버튼. Figma 24:315.
// textHref가 있으면 "텍스트 요청"이 채팅 화면으로 가는 링크가 되고, 없으면 지금 그 화면이라는 표시만 한다.
import Link from "next/link";
import type { RenderStyleKey } from "@/types/studio";
import { RENDER_STYLES } from "@/mocks/studio";
import styles from "./StyleBar.module.css";

type Props = {
  imageUrl: string;
  styleKey: RenderStyleKey;
  emptyActive: boolean;
  onSelectEmpty: () => void;
  onSelectStyle: (key: RenderStyleKey) => void;
  textHref?: string;
};

export default function StyleBar({ imageUrl, styleKey, emptyActive, onSelectEmpty, onSelectStyle, textHref }: Props) {
  const textButton = (
    <>
      <span className={styles.textBox}>
        <img src="/images/studio/icon-chat.svg" alt="" width={20} height={20} />
      </span>
      <span className={styles.textLabel}>텍스트 요청</span>
    </>
  );

  return (
    <div className={styles.bar} onClick={(event) => event.stopPropagation()}>
      <button type="button" className={styles.item} onClick={onSelectEmpty}>
        <span className={emptyActive ? `${styles.thumb} ${styles.thumbActive}` : styles.thumb}>
          <img src="/images/empty-space.jpg" alt="" />
        </span>
        <span className={emptyActive ? styles.labelActive : styles.label}>빈 공간</span>
      </button>

      {RENDER_STYLES.map((style) => {
        const selected = !emptyActive && styleKey === style.key;
        return (
          <button key={style.key} type="button" className={styles.item} onClick={() => onSelectStyle(style.key)}>
            <span className={selected ? `${styles.thumb} ${styles.thumbActive}` : styles.thumb}>
              <img src={imageUrl} alt="" style={{ filter: style.filter }} />
            </span>
            <span className={selected ? styles.labelActive : styles.label}>{style.label}</span>
          </button>
        );
      })}

      {textHref ? (
        <Link href={textHref} className={styles.item}>
          {textButton}
        </Link>
      ) : (
        <div className={styles.item}>{textButton}</div>
      )}
    </div>
  );
}

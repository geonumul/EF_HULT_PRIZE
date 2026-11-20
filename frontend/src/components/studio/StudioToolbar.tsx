"use client";

// 캔버스 위쪽 한 줄. 보기 전환(사진, 3D, 360)과 새로 만들기 버튼만 둔다.
// 편집 도구는 모두 오른쪽 패널의 탭(견적, 배치, 공간, 무드)으로 옮겼다.
import styles from "./StudioToolbar.module.css";

export type StudioView = "photo" | "orbit" | "pano";

type Props = {
  view: StudioView;
  onView: (view: StudioView) => void;
  /** 없으면 사진 다시 만들기 버튼을 숨긴다. */
  onRender?: () => void;
  rendering: boolean;
  /** 3D, 360 보기에서 지금 배치로 사방 이미지를 다시 만든다. 없으면 버튼을 숨긴다. */
  onPanoRender?: () => void;
  /** 사방 이미지를 만드는 중이면 끝낸 방향 수(0~4), 아니면 null */
  panoBusy: number | null;
  /** 분위기 사진이나 요청 문장을 넣었는지. 넣었으면 버튼이 그 사실을 알려 준다. */
  hasMood: boolean;
  /** 3D와 편집을 쓸 수 없는 화면(상품 먼저, 빈 공간 등)이면 false */
  editable: boolean;
};

const VIEWS: { key: StudioView; label: string }[] = [
  { key: "photo", label: "사진" },
  { key: "orbit", label: "3D" },
  { key: "pano", label: "360" },
];

export default function StudioToolbar(props: Props) {
  const { view, editable } = props;
  return (
    <div className={styles.bar} onClick={(event) => event.stopPropagation()}>
      {editable && (
        <div className={styles.segment} role="tablist" aria-label="보기 방식">
          {VIEWS.map((item) => (
            <button key={item.key} type="button" role="tab" aria-selected={view === item.key} className={view === item.key ? `${styles.seg} ${styles.segOn}` : styles.seg} onClick={() => props.onView(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      <span className={styles.spacer} />

      {props.onPanoRender && view !== "photo" && (
        <button type="button" className={styles.secondary} onClick={props.onPanoRender} disabled={props.panoBusy !== null}>
          {props.panoBusy !== null ? `360 만드는 중 ${props.panoBusy}/4` : "360 다시 만들기"}
        </button>
      )}

      {props.onRender && (
        <button type="button" className={styles.primary} onClick={props.onRender} disabled={props.rendering}>
          {props.rendering ? "렌더링 중" : props.hasMood ? "무드 반영해 사진 다시 만들기" : "이 배치로 사진 다시 만들기"}
        </button>
      )}
    </div>
  );
}

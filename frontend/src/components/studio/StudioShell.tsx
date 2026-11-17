// 스튜디오와 채팅 화면이 같이 쓰는 틀. 위는 SubHeader, 아래는 왼쪽 렌더링과 오른쪽 패널이다.
// Figma S03 24:242, S04 25:242.
import type { ReactNode } from "react";
import styles from "./StudioShell.module.css";

type Props = {
  subHeader: ReactNode;
  canvas: ReactNode;
  panel: ReactNode;
};

export default function StudioShell({ subHeader, canvas, panel }: Props) {
  return (
    <div className={styles.page}>
      {subHeader}
      <div className={styles.body}>
        <div className={styles.canvasArea}>{canvas}</div>
        <aside className={styles.panel}>{panel}</aside>
      </div>
    </div>
  );
}

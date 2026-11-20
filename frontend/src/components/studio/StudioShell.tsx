// 스튜디오와 채팅 화면이 같이 쓰는 틀. 위는 SubHeader, 아래는 왼쪽 렌더링과 오른쪽 패널이다.
// Figma S03 24:242, S04 25:242.
import type { ReactNode } from "react";
import styles from "./StudioShell.module.css";

type Props = {
  subHeader: ReactNode;
  canvas: ReactNode;
  /** 캔버스 위에 한 줄로 놓는 도구들 */
  toolbar?: ReactNode;
  panel: ReactNode;
};

export default function StudioShell({ subHeader, canvas, toolbar, panel }: Props) {
  return (
    <div className={styles.page}>
      {subHeader}
      <div className={styles.body}>
        <div className={styles.canvasArea}>
          {toolbar}
          <div className={styles.canvasFill}>{canvas}</div>
        </div>
        <aside className={styles.panel}>{panel}</aside>
      </div>
    </div>
  );
}

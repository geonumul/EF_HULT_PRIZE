// 공간을 불러오는 동안, 또는 찾지 못했을 때 보여 주는 안내.
import Link from "next/link";
import type { SpaceStatus } from "@/lib/spaces";
import styles from "./SpaceMessage.module.css";

export default function SpaceMessage({ status }: { status: SpaceStatus }) {
  return (
    <main className={styles.box}>
      <p className={styles.text}>{status === "missing" ? "공간 정보를 찾을 수 없어요." : "공간 정보를 불러오는 중이에요."}</p>
      {status === "missing" && (
        <Link href="/map" className={styles.link}>
          지도로 돌아가기
        </Link>
      )}
    </main>
  );
}

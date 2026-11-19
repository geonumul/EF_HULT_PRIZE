// 사진 출처. 공실 후보 공간의 예시 사진은 무료 라이선스 사진이고, 라이선스에 따라 작성자를 밝힌다.
import Footer from "@/components/layout/Footer";
import { SPACE_IMAGE_CREDITS } from "@/lib/spaceImages";
import styles from "./page.module.css";

export const metadata = { title: "사진 출처 | Shopportunity" };

export default function CreditsPage() {
  return (
    <>
      <main className={styles.main}>
        <h1 className={styles.title}>사진 출처</h1>
        <p className={styles.lead}>
          공실 후보 공간에 보여 주는 사진은 실제 그 공간의 사진이 아니라 비슷한 분위기의 예시 사진입니다. 아래 사진은 Wikimedia Commons에서 라이선스에 따라 가져왔습니다.
        </p>
        <ul className={styles.list}>
          {SPACE_IMAGE_CREDITS.map((credit) => (
            <li key={credit.file} className={styles.item}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.thumb} src={`/images/spaces/${credit.file}`} alt="" />
              <div>
                <a className={styles.name} href={credit.source} target="_blank" rel="noopener noreferrer">
                  {credit.title}
                </a>
                <p className={styles.meta}>
                  {credit.artist} · {credit.license}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}

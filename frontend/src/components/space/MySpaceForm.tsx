"use client";

// 내 공간 입력. 이름과 층, 가로, 깊이, 천장 높이를 받아 스튜디오로 보낸다.
// 사진이 없으므로 이미지 대신 평면도 편집과 견적을 쓴다. 이전에 입력한 공간은 아래 목록에서 다시 연다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { USE_LABELS } from "@/lib/format";
import { createMySpace, listMySpaces, validateMySpace } from "@/lib/mySpaces";
import type { Listing, UseType } from "@/types";
import styles from "./MySpaceForm.module.css";

const USES: UseType[] = ["cafe", "popup", "pilates"];

export default function MySpaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [floor, setFloor] = useState("1");
  const [width, setWidth] = useState("8");
  const [depth, setDepth] = useState("11");
  const [ceiling, setCeiling] = useState("3");
  const [use, setUse] = useState<UseType>("cafe");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Listing[]>([]);

  useEffect(() => setSaved(listMySpaces()), []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const input = { name, floor: Number(floor), widthM: Number(width), depthM: Number(depth), ceilingM: Number(ceiling) };
    const problem = validateMySpace(input);
    if (problem) {
      setError(problem);
      return;
    }
    const listing = createMySpace(input);
    router.push(`/space/${listing.id}/studio?use=${use}`);
  }

  const area = Math.round(Number(width) * Number(depth) * 10) / 10;

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>내 공간 입력</h1>
      <p className={styles.lead}>
        공실이 아니어도 괜찮아요. 공간의 크기를 입력하면 업종별 배치와 견적을 볼 수 있어요. 사진은 아직 받지 않아서 렌더링 이미지는 나오지 않고, 평면도에서 가구를 옮겨 보는 것까지 돼요.
      </p>

      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          <span>공간 이름 또는 주소</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 성수동2가 315-30 2호" required />
        </label>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>층</span>
            <input type="number" inputMode="numeric" value={floor} onChange={(e) => setFloor(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>가로(m)</span>
            <input type="number" inputMode="decimal" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>깊이(m)</span>
            <input type="number" inputMode="decimal" step="0.1" value={depth} onChange={(e) => setDepth(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>천장 높이(m)</span>
            <input type="number" inputMode="decimal" step="0.1" value={ceiling} onChange={(e) => setCeiling(e.target.value)} />
          </label>
        </div>
        <p className={styles.area}>면적 약 {Number.isFinite(area) ? area : 0}㎡. 입구는 아래쪽 벽 가운데로 가정해요.</p>

        <fieldset className={styles.uses}>
          <legend>먼저 볼 업종</legend>
          {USES.map((item) => (
            <label key={item} className={use === item ? `${styles.use} ${styles.useActive}` : styles.use}>
              <input type="radio" name="use" checked={use === item} onChange={() => setUse(item)} />
              {USE_LABELS[item]}
            </label>
          ))}
        </fieldset>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={styles.submit}>
          이 공간으로 시작하기
        </button>
      </form>

      {saved.length > 0 && (
        <section className={styles.saved}>
          <h2>이전에 입력한 공간</h2>
          <ul>
            {saved.map((listing) => (
              <li key={listing.id}>
                <Link href={`/space/${listing.id}/studio?use=cafe`}>
                  {listing.address} · {listing.areaM2}㎡
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

"use client";

// 상품 CSV 업로드. 파일을 브라우저에서 읽어 열 검사 결과와 미리보기 표를 보여 주고, 정상인 줄만 등록한다.
import { useRef, useState } from "react";
import { PRODUCT_CATEGORIES } from "@/mocks/partner";
import type { PartnerProduct, ProductCondition } from "@/types/partner";
import { CSV_COLUMNS, CSV_TEMPLATE, parseProductCsv, readCsvFile, type CsvResult } from "./csv";
import { newId } from "./partnerStorage";
import styles from "./CsvUpload.module.css";
import panel from "./Panel.module.css";

type Props = { onRegister: (products: PartnerProduct[]) => void };

const PREVIEW_LIMIT = 10;

export default function CsvUpload({ onRegister }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<CsvResult | null>(null);
  const [message, setMessage] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setMessage("");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileName("");
      setResult(null);
      setMessage("CSV 파일(.csv)만 올릴 수 있습니다.");
      return;
    }
    setFileName(file.name);
    setResult(parseProductCsv(await readCsvFile(file)));
  }

  function downloadTemplate() {
    // 엑셀에서 한글이 깨지지 않도록 맨 앞에 BOM을 붙인다.
    const blob = new Blob(["﻿" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "상품등록_양식.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function register() {
    if (!result) return;
    const products: PartnerProduct[] = result.rows
      .filter((row) => row.errors.length === 0)
      .map((row) => ({
        id: newId("pp"),
        name: row.values.name,
        category: row.values.category || PRODUCT_CATEGORIES[0],
        widthMm: Number(row.values.widthMm),
        depthMm: Number(row.values.depthMm),
        heightMm: Number(row.values.heightMm),
        price: Number(row.values.price),
        condition: row.values.condition as ProductCondition,
        stock: Number(row.values.stock),
        imageUrl: row.values.imageUrl,
        sellerUrl: row.values.sellerUrl,
        regions: row.values.regions,
        review: "검수 중",
      }));
    onRegister(products);
    setMessage(`${products.length}개 상품을 등록했습니다. 검수 후 판매 중으로 바뀝니다.`);
    setResult(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const okCount = result ? result.rows.filter((row) => row.errors.length === 0).length : 0;
  const errorCount = result ? result.rows.length - okCount : 0;

  return (
    <div className={panel.formCard}>
      <div className={styles.top}>
        <div>
          <h2 className={panel.formTitle}>CSV 일괄 등록</h2>
          <p className={panel.hint}>열 순서: {CSV_COLUMNS.map((c) => c.names[0]).join(", ")}</p>
        </div>
        <button type="button" className={panel.secondaryButton} onClick={downloadTemplate}>양식 받기</button>
      </div>

      <label
        className={styles.drop}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <input ref={inputRef} type="file" accept=".csv,text/csv" className={styles.fileInput} onChange={(e) => handleFile(e.target.files?.[0])} />
        <strong>{fileName || "CSV 파일을 끌어다 놓거나 눌러서 고르세요"}</strong>
        <span>파일은 이 브라우저에서만 읽고 서버로 보내지 않습니다.</span>
      </label>

      {message && <p className={panel.notice} role="status">{message}</p>}

      {result && result.missingColumns.length > 0 && (
        <p className={panel.error}>빠진 열이 있습니다: {result.missingColumns.join(", ")}. 양식을 받아 열 이름을 맞춰 주세요.</p>
      )}

      {result && result.missingColumns.length === 0 && (
        <>
          <p className={styles.summary}>
            총 {result.rows.length}줄 중 정상 {okCount}줄, 오류 {errorCount}줄
          </p>

          <div className={styles.previewWrap}>
            <table className={styles.preview}>
              <thead>
                <tr>
                  <th>줄</th>
                  <th>검사</th>
                  {CSV_COLUMNS.map((column) => (
                    <th key={column.key}>{column.names[0].replace(/\(.*\)/, "")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, PREVIEW_LIMIT).map((row) => (
                  <tr key={row.line} className={row.errors.length > 0 ? styles.badRow : undefined}>
                    <td>{row.line}</td>
                    <td className={row.errors.length > 0 ? styles.bad : styles.good}>
                      {row.errors.length > 0 ? row.errors.join(" / ") : "정상"}
                    </td>
                    {CSV_COLUMNS.map((column) => (
                      <td key={column.key}>{row.values[column.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.rows.length > PREVIEW_LIMIT && <p className={panel.hint}>미리보기는 앞의 {PREVIEW_LIMIT}줄까지 보여 줍니다.</p>}

          <div className={panel.actions}>
            <button type="button" className={panel.newButton} disabled={okCount === 0} onClick={register}>
              정상 {okCount}개 등록
            </button>
          </div>
        </>
      )}
    </div>
  );
}

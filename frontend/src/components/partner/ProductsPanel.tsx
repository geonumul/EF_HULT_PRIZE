"use client";

// 파트너 콘솔의 "상품 관리". 상품 등록 폼, CSV 일괄 등록, 등록 상품 표.
import { useState } from "react";
import { INITIAL_PRODUCTS } from "@/mocks/partner";
import type { PartnerProduct } from "@/types/partner";
import CsvUpload from "./CsvUpload";
import ProductForm from "./ProductForm";
import { useStoredList } from "./partnerStorage";
import styles from "./Panel.module.css";

const COLUMNS = "2fr 1.1fr 1.5fr 1fr 0.8fr 0.7fr 0.9fr 60px";

export default function ProductsPanel() {
  const [products, saveProducts] = useStoredList<PartnerProduct>("partner-products", INITIAL_PRODUCTS);
  const [openForm, setOpenForm] = useState<"none" | "single" | "csv">("none");
  const [notice, setNotice] = useState("");

  function addProduct(product: PartnerProduct) {
    saveProducts([product, ...products]);
    setOpenForm("none");
    setNotice(`"${product.name}"을 등록했습니다. 사업자·상품 확인 후 판매 중으로 바뀝니다.`);
  }

  function addProducts(added: PartnerProduct[]) {
    saveProducts([...added, ...products]);
    setOpenForm("none");
    setNotice(`${added.length}개 상품을 등록했습니다.`);
  }

  function removeProduct(id: string) {
    saveProducts(products.filter((p) => p.id !== id));
  }

  function toggleForm(target: "single" | "csv") {
    setOpenForm(openForm === target ? "none" : target);
    setNotice("");
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>상품 관리</h1>
          <p className={styles.desc}>판매처 링크가 있는 상품이 렌더링 태그와 견적서에 연결됩니다</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={() => toggleForm("csv")}>
            {openForm === "csv" ? "닫기" : "CSV 일괄 등록"}
          </button>
          <button type="button" className={styles.newButton} onClick={() => toggleForm("single")}>
            {openForm === "single" ? "닫기" : "상품 등록"}
          </button>
        </div>
      </div>

      {openForm === "single" && <ProductForm onSubmit={addProduct} onCancel={() => setOpenForm("none")} />}
      {openForm === "csv" && <CsvUpload onRegister={addProducts} />}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <div className={styles.table}>
        <div className={styles.tableHead} style={{ gridTemplateColumns: COLUMNS }}>
          <span>상품</span>
          <span>카테고리</span>
          <span>치수 W·D·H (mm)</span>
          <span>가격</span>
          <span>상태</span>
          <span>재고</span>
          <span>검수</span>
          <span />
        </div>

        {products.length === 0 && <p className={styles.empty}>등록한 상품이 없습니다.</p>}

        {products.map((product) => (
          <div key={product.id} className={styles.row} style={{ gridTemplateColumns: COLUMNS }}>
            <div>
              <div className={styles.rowTitle}>{product.name}</div>
              <div className={styles.rowSub}>{product.regions}</div>
            </div>
            <span>{product.category}</span>
            <span>{product.widthMm} · {product.depthMm} · {product.heightMm}</span>
            <span>{product.price.toLocaleString("ko-KR")}원</span>
            <span>
              <span className={`${styles.tag} ${product.condition === "신품" ? styles.tagGreen : styles.tagGray}`}>{product.condition}</span>
            </span>
            <span>{product.stock.toLocaleString("ko-KR")}</span>
            <span className={product.review === "판매 중" ? styles.statusPlain : styles.statusOrange}>{product.review}</span>
            <button type="button" className={styles.deleteButton} onClick={() => removeProduct(product.id)}>
              삭제
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

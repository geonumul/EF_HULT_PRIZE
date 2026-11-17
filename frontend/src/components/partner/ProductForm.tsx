"use client";

// 상품 등록 폼(공급사). 열은 Figma의 "상품 등록 CSV 열"과 같다.
import { useState, type FormEvent } from "react";
import { PRODUCT_CATEGORIES } from "@/mocks/partner";
import { PRODUCT_CONDITIONS, type PartnerProduct, type ProductCondition } from "@/types/partner";
import { checkValues } from "./csv";
import { newId } from "./partnerStorage";
import styles from "./Panel.module.css";

type Props = {
  onSubmit: (product: PartnerProduct) => void;
  onCancel: () => void;
};

const EMPTY = {
  name: "",
  category: PRODUCT_CATEGORIES[0],
  widthMm: "",
  depthMm: "",
  heightMm: "",
  price: "",
  condition: "신품",
  stock: "",
  imageUrl: "",
  sellerUrl: "",
  regions: "",
};
type Values = typeof EMPTY;
type Errors = Partial<Record<keyof Values, string>>;

/** CSV와 같은 검사 함수를 쓰고, 오류 문구를 입력칸별로 나눈다. */
function validate(values: Values): Errors {
  const errors: Errors = {};
  for (const message of checkValues(values)) {
    if (message.startsWith("상품명")) errors.name = "상품명을 입력해 주세요.";
    else if (message.startsWith("카테고리")) errors.category = "카테고리를 골라 주세요.";
    else if (message.startsWith("W")) errors.widthMm = "0보다 큰 숫자를 입력해 주세요.";
    else if (message.startsWith("D")) errors.depthMm = "0보다 큰 숫자를 입력해 주세요.";
    else if (message.startsWith("H")) errors.heightMm = "0보다 큰 숫자를 입력해 주세요.";
    else if (message.startsWith("가격")) errors.price = "0보다 큰 숫자를 입력해 주세요.";
    else if (message.startsWith("상태")) errors.condition = "상태를 골라 주세요.";
    else if (message.startsWith("재고")) errors.stock = "0 이상의 정수를 입력해 주세요.";
    else if (message.startsWith("대표")) errors.imageUrl = "http로 시작하는 주소를 입력해 주세요.";
    else if (message.startsWith("판매처")) errors.sellerUrl = "http로 시작하는 주소를 입력해 주세요.";
    else if (message.startsWith("배송")) errors.regions = "배송 가능 지역을 입력해 주세요.";
  }
  return errors;
}

export default function ProductForm({ onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  function change(name: keyof Values, value: string) {
    setValues({ ...values, [name]: value });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onSubmit({
      id: newId("pp"),
      name: values.name.trim(),
      category: values.category,
      widthMm: Number(values.widthMm),
      depthMm: Number(values.depthMm),
      heightMm: Number(values.heightMm),
      price: Number(values.price),
      condition: values.condition as ProductCondition,
      stock: Number(values.stock),
      imageUrl: values.imageUrl.trim(),
      sellerUrl: values.sellerUrl.trim(),
      regions: values.regions.trim(),
      review: "검수 중",
    });
  }

  function inputClass(name: keyof Values): string {
    return errors[name] ? `${styles.input} ${styles.inputError}` : styles.input;
  }

  function renderField(name: keyof Values, label: string, placeholder: string, wide = false) {
    return (
      <div className={wide ? `${styles.field} ${styles.wide}` : styles.field}>
        <label className={styles.label} htmlFor={`product-${name}`}>{label}</label>
        <input
          id={`product-${name}`}
          className={inputClass(name)}
          placeholder={placeholder}
          value={values[name]}
          onChange={(e) => change(name, e.target.value)}
        />
        {errors[name] && <p className={styles.error}>{errors[name]}</p>}
      </div>
    );
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.formTitle}>상품 등록</h2>
      <div className={styles.formGrid}>
        {renderField("name", "상품명", "예: 오크 원목 체어", true)}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-category">카테고리</label>
          <select id="product-category" className={inputClass("category")} value={values.category} onChange={(e) => change("category", e.target.value)}>
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-condition">상태</label>
          <select id="product-condition" className={inputClass("condition")} value={values.condition} onChange={(e) => change("condition", e.target.value)}>
            {PRODUCT_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>{condition}</option>
            ))}
          </select>
        </div>
        {renderField("stock", "재고", "120")}

        {renderField("widthMm", "W (mm)", "450")}
        {renderField("depthMm", "D (mm)", "520")}
        {renderField("heightMm", "H (mm)", "780")}

        {renderField("price", "가격 (원)", "89000")}
        {renderField("regions", "배송 가능 지역", "예: 전국, 서울·경기")}
        <div />

        {renderField("imageUrl", "대표 이미지 URL", "https://", true)}
        {renderField("sellerUrl", "판매처 URL", "자사몰, 스마트스토어 주소", true)}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>취소</button>
        <button type="submit" className={styles.newButton}>등록하기</button>
      </div>
    </form>
  );
}

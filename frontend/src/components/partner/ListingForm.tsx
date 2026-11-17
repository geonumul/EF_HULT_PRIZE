"use client";

// 공실 등록 폼(중개사). 입력을 검사한 뒤 부모가 목록에 넣는다.
// 시안에 폼이 없어서 S10의 표 필드(위치, 보증금, 월세)와 문구("사진 5장과 치수")를 따라 구성했다.
import { useState, type FormEvent } from "react";
import type { PartnerListing } from "@/types/partner";
import { newId } from "./partnerStorage";
import styles from "./Panel.module.css";

type Props = {
  onSubmit: (listing: PartnerListing) => void;
  onCancel: () => void;
};

const EMPTY = { address: "", floor: "1", area: "", deposit: "", rent: "", width: "", depth: "", ceiling: "" };
type Values = typeof EMPTY;
type Errors = Partial<Record<keyof Values | "photos", string>>;

function isPositive(text: string): boolean {
  const value = Number(text);
  return text.trim() !== "" && Number.isFinite(value) && value > 0;
}

function validate(values: Values, photoCount: number): Errors {
  const errors: Errors = {};
  if (!values.address.trim()) errors.address = "공실 위치를 입력해 주세요.";
  if (values.floor.trim() === "" || !Number.isInteger(Number(values.floor))) errors.floor = "층을 정수로 입력해 주세요. 지하는 -1";
  if (!isPositive(values.area)) errors.area = "면적을 입력해 주세요.";
  if (!isPositive(values.deposit)) errors.deposit = "보증금을 입력해 주세요.";
  if (!isPositive(values.rent)) errors.rent = "월세를 입력해 주세요.";
  if (!isPositive(values.width)) errors.width = "가로를 입력해 주세요.";
  if (!isPositive(values.depth)) errors.depth = "세로를 입력해 주세요.";
  if (!isPositive(values.ceiling)) errors.ceiling = "층고를 입력해 주세요.";
  if (photoCount === 0) errors.photos = "사진을 1장 이상 올려 주세요.";
  return errors;
}

function floorLabel(floor: number): string {
  return floor < 0 ? `지하${Math.abs(floor)}층` : `${floor}층`;
}

export default function ListingForm({ onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [photoCount, setPhotoCount] = useState(0);
  const [errors, setErrors] = useState<Errors>({});

  function change(name: keyof Values, value: string) {
    setValues({ ...values, [name]: value });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(values, photoCount);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onSubmit({
      id: newId("pl"),
      title: `${values.address.trim()} ${floorLabel(Number(values.floor))} ${Number(values.area)}m²`,
      deposit: Number(values.deposit),
      rent: Number(values.rent),
      diagnoses: [],
      views: 0,
      quotes: 0,
      status: "렌더링 생성 중",
      featured: false,
    });
  }

  // 입력칸 하나를 그린다. 오류가 있으면 빨간 테두리와 문구를 붙인다.
  function renderField(name: keyof Values, label: string, placeholder: string, type = "text", wide = false) {
    const error = errors[name];
    return (
      <div className={wide ? `${styles.field} ${styles.wide}` : styles.field}>
        <label className={styles.label} htmlFor={`listing-${name}`}>{label}</label>
        <input
          id={`listing-${name}`}
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          className={error ? `${styles.input} ${styles.inputError}` : styles.input}
          placeholder={placeholder}
          value={values[name]}
          onChange={(e) => change(name, e.target.value)}
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>
    );
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.formTitle}>공실 등록</h2>
      <div className={styles.formGrid}>
        {renderField("address", "공실 위치", "예: 성수동2가", "text", true)}
        {renderField("floor", "층", "1", "number")}
        {renderField("area", "면적 (m²)", "39.6", "number")}
        <div />
        {renderField("deposit", "보증금 (만원)", "3000", "number")}
        {renderField("rent", "월세 (만원)", "180", "number")}
        <div />
        {renderField("width", "가로 (m)", "6.0", "number")}
        {renderField("depth", "세로 (m)", "6.6", "number")}
        {renderField("ceiling", "층고 (m)", "2.7", "number")}

        <div className={`${styles.field} ${styles.wide}`}>
          <label className={styles.label} htmlFor="listing-photos">사진 (최대 5장)</label>
          <input
            id="listing-photos"
            type="file"
            accept="image/*"
            multiple
            className={errors.photos ? `${styles.input} ${styles.inputError}` : styles.input}
            onChange={(e) => setPhotoCount(Math.min(e.target.files?.length ?? 0, 5))}
          />
          <p className={styles.hint}>{photoCount > 0 ? `${photoCount}장 선택했습니다.` : "공간 전체가 보이는 사진을 올려 주세요."}</p>
          {errors.photos && <p className={styles.error}>{errors.photos}</p>}
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>취소</button>
        <button type="submit" className={styles.newButton}>등록하기</button>
      </div>
    </form>
  );
}

// 상품 CSV 읽기. 파일 글자를 칸으로 나누고, 열 이름과 값을 검사한다. (Figma "상품 등록 CSV 열")
import { PRODUCT_CONDITIONS, type ProductCondition } from "@/types/partner";

/** 양식의 열 순서. 앞의 이름이 기준이고, 뒤의 이름도 같은 열로 받는다. */
export const CSV_COLUMNS = [
  { key: "name", names: ["상품명"] },
  { key: "category", names: ["카테고리"] },
  { key: "widthMm", names: ["W(mm)", "W"] },
  { key: "depthMm", names: ["D(mm)", "D"] },
  { key: "heightMm", names: ["H(mm)", "H"] },
  { key: "price", names: ["가격"] },
  { key: "condition", names: ["상태(신품/중고A/중고B/대여)", "상태"] },
  { key: "stock", names: ["재고"] },
  { key: "imageUrl", names: ["대표 이미지 URL", "대표이미지URL"] },
  { key: "sellerUrl", names: ["판매처 URL", "판매처URL"] },
  { key: "regions", names: ["배송 가능 지역"] },
] as const;

type ColumnKey = (typeof CSV_COLUMNS)[number]["key"];

export type CsvRow = {
  line: number; // 파일 안의 줄 번호 (머리글이 1)
  values: Record<ColumnKey, string>;
  errors: string[]; // 비어 있으면 정상
};

export type CsvResult = {
  missingColumns: string[]; // 파일에 없는 열 이름
  rows: CsvRow[];
};

export const CSV_TEMPLATE =
  "상품명,카테고리,W(mm),D(mm),H(mm),가격,상태(신품/중고A/중고B/대여),재고,대표 이미지 URL,판매처 URL,배송 가능 지역\n" +
  "오크 원목 체어,의자·테이블,450,520,780,89000,신품,120,https://example.com/chair.jpg,https://example.com/shop/chair,전국\n";

/** 따옴표 안의 쉼표와 줄바꿈을 지키며 CSV 글자를 2차원 배열로 나눈다. */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuote) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuote = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuote = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function normalize(name: string): string {
  return name.replace(/^﻿/, "").replace(/\s/g, "").toLowerCase();
}

function isPositiveNumber(text: string): boolean {
  const value = Number(text);
  return text.trim() !== "" && Number.isFinite(value) && value > 0;
}

function isUrl(text: string): boolean {
  return /^https?:\/\/\S+$/.test(text.trim());
}

/** 한 줄의 값을 검사해서 오류 문구 목록을 돌려준다. */
export function checkValues(values: Record<ColumnKey, string>): string[] {
  const errors: string[] = [];
  if (!values.name.trim()) errors.push("상품명이 비어 있습니다");
  if (!values.category.trim()) errors.push("카테고리가 비어 있습니다");
  if (!isPositiveNumber(values.widthMm)) errors.push("W(mm)는 0보다 큰 숫자여야 합니다");
  if (!isPositiveNumber(values.depthMm)) errors.push("D(mm)는 0보다 큰 숫자여야 합니다");
  if (!isPositiveNumber(values.heightMm)) errors.push("H(mm)는 0보다 큰 숫자여야 합니다");
  if (!isPositiveNumber(values.price)) errors.push("가격은 0보다 큰 숫자여야 합니다");
  if (!PRODUCT_CONDITIONS.includes(values.condition.trim() as ProductCondition)) {
    errors.push("상태는 신품, 중고A, 중고B, 대여 중 하나여야 합니다");
  }
  const stock = Number(values.stock);
  if (values.stock.trim() === "" || !Number.isInteger(stock) || stock < 0) errors.push("재고는 0 이상의 정수여야 합니다");
  if (!isUrl(values.imageUrl)) errors.push("대표 이미지 URL이 http로 시작하지 않습니다");
  if (!isUrl(values.sellerUrl)) errors.push("판매처 URL이 http로 시작하지 않습니다");
  if (!values.regions.trim()) errors.push("배송 가능 지역이 비어 있습니다");
  return errors;
}

export function parseProductCsv(text: string): CsvResult {
  const table = splitCsv(text);
  if (table.length === 0) return { missingColumns: CSV_COLUMNS.map((c) => c.names[0]), rows: [] };

  // 머리글에서 열마다 몇 번째 칸인지 찾는다.
  const headers = table[0].map(normalize);
  const indexOf: Partial<Record<ColumnKey, number>> = {};
  const missingColumns: string[] = [];
  for (const column of CSV_COLUMNS) {
    const index = headers.findIndex((h) => column.names.some((n) => normalize(n) === h));
    if (index === -1) missingColumns.push(column.names[0]);
    else indexOf[column.key] = index;
  }
  if (missingColumns.length > 0) return { missingColumns, rows: [] };

  const rows: CsvRow[] = table.slice(1).map((cells, i) => {
    const values = {} as Record<ColumnKey, string>;
    for (const column of CSV_COLUMNS) {
      values[column.key] = (cells[indexOf[column.key] as number] ?? "").trim();
    }
    return { line: i + 2, values, errors: checkValues(values) };
  });
  return { missingColumns: [], rows };
}

/** 파일을 글자로 읽는다. UTF-8이 깨지면 엑셀 한국어 CSV(EUC-KR)로 다시 읽는다. */
export async function readCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("euc-kr").decode(buffer);
}

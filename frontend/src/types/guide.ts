// 창업 가이드 화면이 쓰는 데이터 모양.
import type { UseType } from "./index";

export type GuideCost = {
  useType: UseType;
  name: string; // "카페"
  period: string; // "준비 5~6주"
  total: string; // "4,200만 원"
  image: string;
  rows: { label: string; value: string }[];
  button: string;
};

export type GuideStep = { title: string; text: string };

export type GuidePermit = {
  useType: UseType;
  name: string;
  building: string;
  report: string;
  documents: string;
};

// 가짜 창업 가이드 데이터. 금액과 절차 문구는 시안(S08)을 그대로 옮겼다. 실제 견적 기준이 아니다.
import type { GuideCost, GuidePermit, GuideStep } from "@/types/guide";

export const GUIDE_COSTS: GuideCost[] = [
  {
    useType: "cafe",
    name: "카페",
    period: "준비 5~6주",
    total: "4,200만 원",
    image: "/images/guide-cafe.jpg",
    rows: [
      { label: "집기", value: "2,140만" },
      { label: "주방·설비", value: "880만" },
      { label: "인테리어 시공", value: "1,180만" },
    ],
    button: "카페 가능 공실 보기",
  },
  {
    useType: "popup",
    name: "팝업 스토어",
    period: "준비 2~3주",
    total: "1,900만 원",
    image: "/images/guide-popup.jpg",
    rows: [
      { label: "진열·집기", value: "720만" },
      { label: "조명·전기", value: "310만" },
      { label: "인테리어 시공", value: "870만" },
    ],
    button: "팝업 스토어 가능 공실 보기",
  },
  {
    useType: "pilates",
    name: "필라테스",
    period: "준비 6~8주",
    total: "5,600만 원",
    image: "/images/guide-pilates.jpg",
    rows: [
      { label: "운동 기구", value: "3,050만" },
      { label: "거울·바닥재", value: "940만" },
      { label: "인테리어 시공", value: "1,610만" },
    ],
    button: "필라테스 가능 공실 보기",
  },
];

export const GUIDE_STEPS: GuideStep[] = [
  { title: "공실 탐색", text: "지도에서 면적·임대료로 거르기" },
  { title: "업종 진단", text: "용도·설비·소방 기준 확인" },
  { title: "렌더링·견적", text: "상품 기반 견적 확정" },
  { title: "계약", text: "임대차계약, 사업자등록" },
  { title: "발주·시공", text: "집기 발주, 공사 21일 내외" },
  { title: "영업 신고", text: "업종별 신고 후 오픈" },
];

export const GUIDE_PERMITS: GuidePermit[] = [
  {
    useType: "cafe",
    name: "카페",
    building: "제1종 근린생활시설 (휴게음식점)",
    report: "휴게음식점 영업신고 (구청 위생과)",
    documents: "위생교육 수료증, 건강진단결과서, 임대차계약서",
  },
  {
    useType: "popup",
    name: "팝업 스토어",
    building: "기존 용도 유지 (판매·근린생활시설)",
    report: "사업자등록, 간판 설치 시 옥외광고물 신고",
    documents: "임대차계약서, 사업자등록증",
  },
  {
    useType: "pilates",
    name: "필라테스",
    building: "제2종 근린생활시설 (운동시설)",
    report: "사업자등록, 면적에 따라 체육시설업 신고 확인",
    documents: "임대차계약서, 소방시설 확인 서류",
  },
];

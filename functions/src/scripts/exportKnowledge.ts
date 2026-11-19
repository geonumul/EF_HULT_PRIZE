// 기준표(knowledge.ts)로 검수용 문서 docs/DESIGN_KNOWLEDGE.md를 만든다. 값을 바꾼 뒤에는 이 스크립트를 다시 돌린다.
//   npm run build && node lib/scripts/exportKnowledge.js
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DESIGN_RULES, type DesignRule, type RuleStatus } from "../pipeline/knowledge";

const STATUS_LABELS: Record<RuleStatus, string> = {
  original: "법령 원문 확인",
  secondary: "해설 자료 확인",
  survey: "자료 종합",
  proposal: "제안값",
  reviewed: "검수됨",
};

function valueText(rule: DesignRule): string {
  const unit = rule.unit;
  if (rule.min !== undefined && rule.max !== undefined) return `${rule.min}~${rule.max}${unit}${rule.value !== undefined ? ` (사용 ${rule.value})` : ""}`;
  if (rule.min !== undefined) return `${rule.min}${unit} 이상`;
  if (rule.max !== undefined) return `${rule.max}${unit} 이하`;
  return `${rule.value}${unit}`;
}

function cell(text: string): string {
  return text.replace(/\|/g, "/");
}

const groups = [...new Set(DESIGN_RULES.map((rule) => rule.group))];
const lines: string[] = [
  "# 건축, 인테리어 설계 기준",
  "",
  "배치와 이미지 요청에 쓰는 기준을 웹 조사로 모은 표다. 이 문서는 `functions/src/pipeline/knowledge.ts`에서 자동으로 만든다. 값을 바꿀 때는 그 파일을 고치고 `node lib/scripts/exportKnowledge.js`를 다시 실행한다.",
  "",
  "## 값의 확인 정도",
  "",
  "| 표시 | 뜻 |",
  "|---|---|",
  "| 법령 원문 확인 | 법령 별표 PDF를 직접 읽었다. 개정 여부는 시행일 기준으로만 안다. |",
  "| 해설 자료 확인 | 법령 해설이나 법령 미러 자료로 확인했다. 최신 개정 확인 전이다. |",
  "| 자료 종합 | 여러 업체와 가이드를 종합했다. 대부분 미국 자료이고 출처마다 값이 다르다. 한국 기준이 아닐 수 있다. |",
  "| 제안값 | 근거가 약하다. 공간디자인 전공 팀원의 검수가 필요하다. |",
  "| 검수됨 | 전문가가 확인했다. |",
  "",
  "법률 자문이 아니다. 실제 인허가와 시공에서는 관할 기관과 전문가의 확인이 필요하다.",
  "",
];

for (const group of groups) {
  lines.push(`## ${group}`, "", "| 기준 | 값 | 확인 정도 | 출처 | 적용 | 비고 |", "|---|---|---|---|---|---|");
  for (const rule of DESIGN_RULES.filter((candidate) => candidate.group === group)) {
    lines.push(`| ${cell(rule.label)} | ${valueText(rule)} | ${STATUS_LABELS[rule.status]} | ${cell(rule.source)} | ${rule.enforced ? "코드에 사용" : "참고"} | ${cell(rule.note)} |`);
  }
  lines.push("");
}

lines.push(
  "## 코드가 이 기준을 쓰는 곳",
  "",
  "- 배치: 줄 사이 통로 900, 벽 여유 300, 입구 앞 1200 비움, 필라테스 기구 사이 900(기구마다 양쪽 450).",
  "- 검증: 통로 850 이상, 테이블 간격 600 이상, 기구 간격, 겹침, 공간 밖, 입구 앞 비움.",
  "- 점검 항목: 천장 높이, 장애인 편의시설 대상 면적, 음식점 소방시설 면적, 조리장 시설, 필라테스 분류와 천장 권장 높이를 공간과 업종에 따라 알려 준다.",
  "- 구조 그림: 상품의 실제 높이, 의자 좌면 450, 눈높이 1500, 크기 기준 문(900×2100).",
  "- 이미지 요청: 카메라 눈높이 1.5m, 24mm 환산, 수직선 보정, 색온도 2700K, 입구 비움, 통로 0.9m 이상, 업종별 특징.",
  "",
  "## 설계 순서(제안)",
  "",
  "전문가가 소규모 상가를 계획하는 순서를 조사해 정리한 제안안이다. 한국 실무 자료로 확인한 부분은 계획설계, 기본설계, 실시설계 구분과 평면도, 입면도, 천장도, 상세도 산출물뿐이다. 나머지는 근거가 약해 서영아 님 같은 공간디자인 전공 팀원의 검토가 필요하다.",
  "",
  "| 단계 | 확인할 것 | 서비스에서 맡는 부분 |",
  "|---|---|---|",
  "| 요구 분석 | 업종, 좌석과 인원, 예산, 브랜드 톤, 영업 방식 | 업종 선택. 좌석 수, 예산 입력은 아직 없음 |",
  "| 사이트 분석 | 전면 폭, 출입구 위치, 보행 방향, 채광 방향, 간판 가능 면, 설비 위치 | 건축물대장, 용도지역, 주변 점포. 방위, 채광, 설비 위치는 입력 항목이 아직 없음 |",
  "| 조닝 | 입구 쪽 공적 구역, 안쪽 서비스 구역, 주방과 설비 위치 | 입구 앞 비움만 적용. 구역 나누기는 아직 없음 |",
  "| 동선 | 고객과 직원 동선 분리, 주 통로 폭, 대기 공간 | 통로 폭 검증. 동선 분리는 아직 없음 |",
  "| 평면 | 기둥 회피, 문 열림 방향, 가구 간격, 설비 구역 | 줄 단위 배치와 검증 |",
  "| 입면 | 창, 문, 진열, 간판 높이, 벽면 전개 | 아직 없음 |",
  "| 천장 | 층고, 덕트와 배관, 조명 위치 | 천장 높이 점검만 |",
  "| 렌더링 | 눈높이 카메라, 수직선 보정, 조명 | 구조 그림과 이미지 요청에 적용 |",
  "",
  "## 확인하지 못한 항목",
  "",
  "- 건축물의 피난·방화구조 등의 기준에 관한 규칙 제15조의2 일반 복도 유효너비 표(이미지라 읽지 못함), 소규모 상가의 출구 폭, 직통계단 설치 대상.",
  "- 장애인 화장실 설치 면적 기준(대상시설별), 학원과 체력단련장의 편의시설 면적 기준, 음식점 카운터 높이 적용 여부, 2022년 개정 후 현행 별표 원문.",
  "- 소방: 소화기 보행거리와 설치 높이, 유도등 위치와 높이, 비상구 규격, 영업장 내부 피난통로 폭, 비상구 앞 물건 적치 금지(소방시설법 시행령 별표4, NFTC 101, NFTC 303 확인 필요).",
  "- 필라테스와 요가 학원이 학원법인지 체육시설법(체력단련장업)인지, 서울특별시교육청 조례의 면적, 화장실, 환기 수치.",
  "- 식음 공간: 2인, 4인 테이블 규격, 벽 쪽 벤치석 규격, 입구 대기 공간, 주문 줄 폭, 카운터 길이와 깊이, 장비 주변 작업 공간, 홀과 바와 저장 3분할 비율, 전면 창과 간판 계획.",
  "- 한국 조도 기준 KS A 3011 식당, 카페 항목.",
  "- 필라테스: 제조사 공식 사양서(Balanced Body, Merrithew), 바닥 방진, 환기, 샤워, 사물함, 접수 데스크 크기. 소매: 벽면 진열 높이, 쇼윈도, 입구 조도.",
  "- 도면 표기: 치수선, 문 열림 표기, 가구 기호(KS F 1501 원문 확인 필요).",
  "",
  "## 검수 방법",
  "",
  "1. 공간디자인 전공 팀원이 값마다 출처와 한국 기준에 맞는지 확인한다.",
  "2. 맞으면 `knowledge.ts`에서 status를 reviewed로 바꾸고, 틀렸으면 값을 고친다.",
  "3. `node lib/scripts/exportKnowledge.js`로 이 문서를 다시 만든다.",
  "",
);

const out = resolve(__dirname, "../../../docs/DESIGN_KNOWLEDGE.md");
writeFileSync(out, lines.join("\n"), "utf-8");
console.log(`저장: ${out} (기준 ${DESIGN_RULES.length}개)`);

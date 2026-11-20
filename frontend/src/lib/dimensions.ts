// 가구와 사람 치수. "건축 치수 사전"(건축치수사전_전체목록.pdf)의 값 중 카페, 팝업, 필라테스 가구에 쓰는 것만 옮겼다.
// 3D 가구 모양이 이 값을 읽는다. 값을 바꿀 때는 PDF의 쪽 번호와 함께 고친다. 단위는 mm.
// 사전에는 인체치수, 계단, 복도, 주방 등 약 400개 항목이 있고, 아래는 그중 이 서비스의 가구와 통로에 해당하는 것이다.

export const DIM = {
  table: {
    /** 책상, 식탁 높이 700~750 (p.18, p.19) */
    heightMm: 720,
    /** 진열 테이블 높이 700~900 (p.20) */
    displayHeightMm: 750,
    /** 카페 2인 테이블 700 x 700, 600 x 600 이상 (p.19) */
    cafe2Mm: 700,
    /** 카페 4인 테이블 1200 x 800 (p.19) */
    cafe4: { widthMm: 1200, depthMm: 800 },
    /** 원형 식탁 지름 4인 1000, 6인 1350 (p.18) */
    round4Mm: 1000,
    topThicknessMm: 40,
  },
  chair: {
    /** 식탁 의자 좌면 높이 420~450. 오금높이(작은 사람 385~420) 기준 (p.18, p.2) */
    seatHeightMm: 430,
    /** 좌면 깊이: 엉덩이-오금 길이 465~480 (p.2). 좌면 폭: 앉은 엉덩이너비 360~370, 큰 사람 기준 (p.3) */
    seatDepthMm: 440,
    seatWidthMm: 420,
    seatThicknessMm: 40,
    /** 등받이 끝 높이. 좌면에서 약 450 위 */
    backHeightMm: 880,
  },
  counter: {
    /** 계산대 높이 900~1000 (p.19) */
    cashierHeightMm: 950,
    /** 바 카운터 높이 1050~1150 (p.19) */
    barHeightMm: 1100,
    topOverhangMm: 30,
    topThicknessMm: 40,
  },
  showcase: { heightMm: 1100 },
  shelf: {
    /** 벽면 진열 최상단 1800 이하, 손 닿는 범위는 1600 (p.20). 위로 뻗은 손끝높이는 여성 1960, 남성 2130 (p.2) */
    heightMm: 1800,
    levelGapMm: 340,
  },
  lamp: {
    /** 식탁 위 펜던트 하단은 상판에서 650~850 위 (p.18) */
    aboveTableMm: 750,
  },
  /** 사람이 지나가는 폭 (p.6, p.7). 평면도 점검에 쓰는 통로 기준은 functions의 기준표와 같은 값이다. */
  walk: {
    onePersonMm: 750,
    twoPeopleMm: 1350,
    wheelchairMm: 1200,
    cafeTableGapMm: 600,
  },
} as const;

/** 바닥에서 펜던트 조명 갓 아래까지의 높이 */
export function pendantBottomMm(): number {
  return DIM.table.heightMm + DIM.lamp.aboveTableMm;
}

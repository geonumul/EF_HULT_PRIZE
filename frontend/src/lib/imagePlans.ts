// 미리 만든 렌더링 이미지에서 가구와 구조물 위치를 읽어 도면으로 옮긴 값이다.
// functions/src/scripts/imagePlans.ts가 만든다. 직접 고치지 않는다.
// 키는 "<사진 번호>-<업종>"이고 스타일 3종은 같은 구도라서 도면을 함께 쓴다.
import type { PlanResult } from "@/lib/api/functions";

export const IMAGE_PLANS: Record<string, PlanResult> = {
  "08-cafe": {
    "room": {
      "widthMm": 8970,
      "depthMm": 9945,
      "ceilingMm": 3000
    },
    "useType": "cafe",
    "placed": [
      {
        "productId": "counter",
        "name": "바 카운터",
        "category": "counter",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 600,
        "chairs": 0,
        "x": 1700,
        "y": 1300
      },
      {
        "productId": "fixture",
        "name": "디저트 쇼케이스",
        "category": "fixture",
        "kind": "fixture",
        "widthMm": 900,
        "depthMm": 600,
        "chairs": 0,
        "x": 4200,
        "y": 1300
      },
      {
        "productId": "table",
        "name": "원형 테이블",
        "category": "table",
        "kind": "table",
        "widthMm": 1600,
        "depthMm": 1600,
        "chairs": 3,
        "x": 1700,
        "y": 3100,
        "round": true,
        "tableDiaMm": 700,
        "chairAngles": [
          180,
          0,
          270
        ]
      },
      {
        "productId": "table",
        "name": "원형 테이블",
        "category": "table",
        "kind": "table",
        "widthMm": 1600,
        "depthMm": 1600,
        "chairs": 2,
        "x": 1700,
        "y": 5550,
        "round": true,
        "tableDiaMm": 700,
        "chairAngles": [
          180,
          0
        ]
      },
      {
        "productId": "table",
        "name": "원형 테이블",
        "category": "table",
        "kind": "table",
        "widthMm": 1600,
        "depthMm": 1600,
        "chairs": 3,
        "x": 3600,
        "y": 5550,
        "round": true,
        "tableDiaMm": 700,
        "chairAngles": [
          180,
          0,
          270
        ]
      },
      {
        "productId": "table",
        "name": "원형 테이블",
        "category": "table",
        "kind": "table",
        "widthMm": 1600,
        "depthMm": 1600,
        "chairs": 2,
        "x": 5500,
        "y": 1300,
        "round": true,
        "tableDiaMm": 700,
        "chairAngles": [
          180,
          0
        ]
      },
      {
        "productId": "table",
        "name": "원형 테이블",
        "category": "table",
        "kind": "table",
        "widthMm": 1600,
        "depthMm": 1600,
        "chairs": 3,
        "x": 5500,
        "y": 3750,
        "round": true,
        "tableDiaMm": 700,
        "chairAngles": [
          180,
          0,
          270
        ]
      },
      {
        "productId": "table",
        "name": "원형 테이블",
        "category": "table",
        "kind": "table",
        "widthMm": 1600,
        "depthMm": 1600,
        "chairs": 2,
        "x": 5500,
        "y": 6200,
        "round": true,
        "tableDiaMm": 700,
        "chairAngles": [
          180,
          0
        ]
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 2000,
        "y": 1450,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 2900,
        "y": 1450,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 3800,
        "y": 1450,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 4700,
        "y": 1450,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 2350,
        "y": 3750,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 6050,
        "y": 4300,
        "hanging": true
      }
    ],
    "unplaced": [],
    "violations": [],
    "notes": [
      {
        "level": "check",
        "text": "89㎡로 장애인 편의시설 설치 대상일 수 있습니다(2022.5.1 이후 신축, 증축 건물). 출입구 통과 폭 900mm, 문 앞 1200mm, 복도 1200mm, 문턱 20mm 이하를 확인하세요.",
        "source": "장애인등편의법 시행령 별표1(해설, 신문 기사)"
      },
      {
        "level": "check",
        "text": "조리장에는 환기시설, 손 씻는 시설, 바닥 배수구 덮개, 폐기물 용기가 필요합니다. 객석 칸막이는 높이 1.5m 미만이어야 합니다.",
        "source": "식품위생법 시행규칙 별표14 제8호"
      }
    ],
    "entryZone": {
      "left": 3885,
      "right": 5085,
      "top": 8745
    },
    "clearances": [
      {
        "id": "counter_front",
        "label": "카운터 앞 손님 공간",
        "valueMm": 1200,
        "requiredMm": 1200,
        "ok": true
      },
      {
        "id": "counter_back",
        "label": "카운터 뒤 직원 통로",
        "valueMm": 1300,
        "requiredMm": 900,
        "ok": true
      },
      {
        "id": "wall_seat",
        "label": "벽과 의자 뒤 간격",
        "valueMm": 1700,
        "requiredMm": 600,
        "ok": true
      },
      {
        "id": "aisle",
        "label": "줄 사이 통로",
        "valueMm": 850,
        "requiredMm": 850,
        "ok": true
      },
      {
        "id": "entry",
        "label": "입구 앞 비움",
        "valueMm": 1200,
        "requiredMm": 1200,
        "ok": true
      }
    ],
    "structures": [
      {
        "kind": "column",
        "label": "기둥",
        "x": 1018,
        "y": 3227,
        "widthMm": 500,
        "depthMm": 500
      },
      {
        "kind": "column",
        "label": "기둥",
        "x": 3087,
        "y": 8455,
        "widthMm": 500,
        "depthMm": 500
      },
      {
        "kind": "column",
        "label": "기둥",
        "x": 8070,
        "y": 2442,
        "widthMm": 500,
        "depthMm": 500
      }
    ],
    "camera": {
      "x": 1729,
      "y": 13894,
      "left": [
        -0.3305,
        -0.9438
      ],
      "right": [
        0.6028,
        -0.7979
      ]
    },
    "pins": [
      {
        "x": 44.4,
        "y": 58.5
      },
      {
        "x": 57.3,
        "y": 60.6
      },
      {
        "x": 42.7,
        "y": 62.3
      },
      {
        "x": 45,
        "y": 65
      },
      {
        "x": 67.5,
        "y": 64.5
      },
      {
        "x": 70.3,
        "y": 60.7
      },
      {
        "x": 78.8,
        "y": 62.3
      },
      {
        "x": 92.8,
        "y": 65
      }
    ]
  },
  "08-popup": {
    "room": {
      "widthMm": 8970,
      "depthMm": 9945,
      "ceilingMm": 3000
    },
    "useType": "popup",
    "placed": [
      {
        "productId": "counter",
        "name": "계산대",
        "category": "counter",
        "kind": "fixture",
        "widthMm": 800,
        "depthMm": 2200,
        "chairs": 0,
        "x": 600,
        "y": 6800
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 1500,
        "depthMm": 400,
        "chairs": 0,
        "x": 1700,
        "y": 500
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 1500,
        "depthMm": 400,
        "chairs": 0,
        "x": 3300,
        "y": 500
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 1500,
        "depthMm": 400,
        "chairs": 0,
        "x": 4900,
        "y": 500
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 1200,
        "depthMm": 400,
        "chairs": 0,
        "x": 6500,
        "y": 500
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 400,
        "depthMm": 1300,
        "chairs": 0,
        "x": 150,
        "y": 4400
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 400,
        "depthMm": 1200,
        "chairs": 0,
        "x": 8300,
        "y": 3600
      },
      {
        "productId": "table",
        "name": "전시 테이블",
        "category": "table",
        "kind": "fixture",
        "widthMm": 1200,
        "depthMm": 700,
        "chairs": 0,
        "x": 1900,
        "y": 2300
      },
      {
        "productId": "table",
        "name": "전시 테이블",
        "category": "table",
        "kind": "fixture",
        "widthMm": 1200,
        "depthMm": 700,
        "chairs": 0,
        "x": 3800,
        "y": 2800
      },
      {
        "productId": "table",
        "name": "큰 전시 테이블",
        "category": "table",
        "kind": "fixture",
        "widthMm": 2000,
        "depthMm": 900,
        "chairs": 0,
        "x": 5800,
        "y": 2200
      },
      {
        "productId": "table",
        "name": "전시 테이블",
        "category": "table",
        "kind": "fixture",
        "widthMm": 1200,
        "depthMm": 700,
        "chairs": 0,
        "x": 2400,
        "y": 4600
      },
      {
        "productId": "table",
        "name": "전시 테이블",
        "category": "table",
        "kind": "fixture",
        "widthMm": 1200,
        "depthMm": 700,
        "chairs": 0,
        "x": 4600,
        "y": 4400
      },
      {
        "productId": "table",
        "name": "큰 전시 테이블",
        "category": "table",
        "kind": "fixture",
        "widthMm": 2000,
        "depthMm": 900,
        "chairs": 0,
        "x": 5800,
        "y": 5800
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 2400,
        "y": 1700,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 4300,
        "y": 1700,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 6300,
        "y": 1700,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 3000,
        "y": 3900,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 5200,
        "y": 3800,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 6800,
        "y": 5000,
        "hanging": true
      }
    ],
    "unplaced": [],
    "violations": [],
    "notes": [
      {
        "level": "check",
        "text": "89㎡로 장애인 편의시설 설치 대상일 수 있습니다(2022.5.1 이후 신축, 증축 건물). 출입구 통과 폭 900mm, 문 앞 1200mm, 복도 1200mm, 문턱 20mm 이하를 확인하세요.",
        "source": "장애인등편의법 시행령 별표1(해설, 신문 기사)"
      }
    ],
    "entryZone": {
      "left": 3885,
      "right": 5085,
      "top": 8745
    },
    "clearances": [
      {
        "id": "aisle",
        "label": "줄 사이 통로",
        "valueMm": 900,
        "requiredMm": 850,
        "ok": true
      },
      {
        "id": "entry",
        "label": "입구 앞 비움",
        "valueMm": 1200,
        "requiredMm": 1200,
        "ok": true
      }
    ],
    "structures": [
      {
        "kind": "column",
        "label": "기둥",
        "x": 1018,
        "y": 3227,
        "widthMm": 500,
        "depthMm": 500
      },
      {
        "kind": "column",
        "label": "기둥",
        "x": 3087,
        "y": 8455,
        "widthMm": 500,
        "depthMm": 500
      },
      {
        "kind": "column",
        "label": "기둥",
        "x": 8070,
        "y": 2442,
        "widthMm": 500,
        "depthMm": 500
      }
    ],
    "camera": {
      "x": 1729,
      "y": 13894,
      "left": [
        -0.3305,
        -0.9438
      ],
      "right": [
        0.6028,
        -0.7979
      ]
    },
    "pins": [
      {
        "x": 23.6,
        "y": 63.6
      },
      {
        "x": 40.6,
        "y": 60.3
      },
      {
        "x": 51.8,
        "y": 60.2
      },
      {
        "x": 62.5,
        "y": 60
      },
      {
        "x": 72,
        "y": 59.9
      },
      {
        "x": 20.2,
        "y": 63.8
      },
      {
        "x": 95.6,
        "y": 61.7
      },
      {
        "x": 41.9,
        "y": 61.4
      },
      {
        "x": 58.3,
        "y": 61.5
      },
      {
        "x": 75.6,
        "y": 60.9
      },
      {
        "x": 48.7,
        "y": 63.2
      },
      {
        "x": 69.6,
        "y": 62.6
      },
      {
        "x": 92.8,
        "y": 63.9
      }
    ]
  },
  "08-pilates": {
    "room": {
      "widthMm": 8970,
      "depthMm": 9945,
      "ceilingMm": 3000
    },
    "useType": "pilates",
    "placed": [
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 1800,
        "y": 1800
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 4900,
        "y": 1800
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 1800,
        "y": 3400
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 4900,
        "y": 3400
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 1800,
        "y": 5000
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 4900,
        "y": 5000
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 1800,
        "y": 6600
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 4900,
        "y": 6600
      },
      {
        "productId": "fixture",
        "name": "요가 매트 거치대",
        "category": "fixture",
        "kind": "fixture",
        "widthMm": 1500,
        "depthMm": 400,
        "chairs": 0,
        "x": 600,
        "y": 8400
      }
    ],
    "unplaced": [],
    "violations": [],
    "notes": [
      {
        "level": "check",
        "text": "필라테스가 학원인지 체력단련장업인지에 따라 시설 기준이 다릅니다. 관할 교육청이나 구청에 확인하세요.",
        "source": "건축법 시행령 별표1 제4호"
      }
    ],
    "entryZone": {
      "left": 3885,
      "right": 5085,
      "top": 8745
    },
    "clearances": [
      {
        "id": "aisle",
        "label": "줄 사이 통로",
        "valueMm": 900,
        "requiredMm": 850,
        "ok": true
      },
      {
        "id": "entry",
        "label": "입구 앞 비움",
        "valueMm": 1200,
        "requiredMm": 1200,
        "ok": true
      }
    ],
    "structures": [
      {
        "kind": "column",
        "label": "기둥",
        "x": 1018,
        "y": 3227,
        "widthMm": 500,
        "depthMm": 500
      },
      {
        "kind": "column",
        "label": "기둥",
        "x": 3087,
        "y": 8455,
        "widthMm": 500,
        "depthMm": 500
      },
      {
        "kind": "column",
        "label": "기둥",
        "x": 8070,
        "y": 2442,
        "widthMm": 500,
        "depthMm": 500
      }
    ],
    "camera": {
      "x": 1729,
      "y": 13894,
      "left": [
        -0.3305,
        -0.9438
      ],
      "right": [
        0.6028,
        -0.7979
      ]
    },
    "pins": [
      {
        "x": 45.6,
        "y": 61
      },
      {
        "x": 69,
        "y": 60.7
      },
      {
        "x": 47.2,
        "y": 62.1
      },
      {
        "x": 74,
        "y": 61.7
      },
      {
        "x": 49.3,
        "y": 63.6
      },
      {
        "x": 80.7,
        "y": 63.1
      },
      {
        "x": 52.4,
        "y": 65.8
      },
      {
        "x": 90.2,
        "y": 65
      },
      {
        "x": 28.5,
        "y": 70.2
      }
    ]
  },
  "02-popup": {
    "room": {
      "widthMm": 8000,
      "depthMm": 11200,
      "ceilingMm": 3000
    },
    "useType": "popup",
    "placed": [
      {
        "productId": "counter",
        "name": "계산대",
        "category": "counter",
        "kind": "fixture",
        "widthMm": 1300,
        "depthMm": 1900,
        "chairs": 0,
        "x": 500,
        "y": 3700
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 1300,
        "depthMm": 400,
        "chairs": 0,
        "x": 300,
        "y": 100
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 1300,
        "depthMm": 400,
        "chairs": 0,
        "x": 1700,
        "y": 100
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 1300,
        "depthMm": 400,
        "chairs": 0,
        "x": 4800,
        "y": 100
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 1300,
        "depthMm": 400,
        "chairs": 0,
        "x": 6200,
        "y": 100
      },
      {
        "productId": "shelf",
        "name": "벽 선반",
        "category": "shelf",
        "kind": "fixture",
        "widthMm": 400,
        "depthMm": 1800,
        "chairs": 0,
        "x": 7500,
        "y": 2400
      },
      {
        "productId": "table",
        "name": "전시 테이블",
        "category": "table",
        "kind": "fixture",
        "widthMm": 1500,
        "depthMm": 800,
        "chairs": 0,
        "x": 2800,
        "y": 1700
      },
      {
        "productId": "table",
        "name": "전시 테이블",
        "category": "table",
        "kind": "fixture",
        "widthMm": 1500,
        "depthMm": 800,
        "chairs": 0,
        "x": 4700,
        "y": 2400
      },
      {
        "productId": "table",
        "name": "전시 테이블",
        "category": "table",
        "kind": "fixture",
        "widthMm": 1500,
        "depthMm": 800,
        "chairs": 0,
        "x": 3100,
        "y": 3800
      },
      {
        "productId": "table",
        "name": "큰 전시 테이블",
        "category": "table",
        "kind": "fixture",
        "widthMm": 1600,
        "depthMm": 800,
        "chairs": 0,
        "x": 5200,
        "y": 4400
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 1800,
        "y": 1800,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 3600,
        "y": 1500,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 5400,
        "y": 1500,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 6300,
        "y": 3500,
        "hanging": true
      },
      {
        "productId": "lamp",
        "name": "조명",
        "category": "lamp",
        "kind": "fixture",
        "widthMm": 300,
        "depthMm": 300,
        "chairs": 0,
        "x": 2600,
        "y": 3300,
        "hanging": true
      }
    ],
    "unplaced": [],
    "violations": [],
    "notes": [
      {
        "level": "check",
        "text": "90㎡로 장애인 편의시설 설치 대상일 수 있습니다(2022.5.1 이후 신축, 증축 건물). 출입구 통과 폭 900mm, 문 앞 1200mm, 복도 1200mm, 문턱 20mm 이하를 확인하세요.",
        "source": "장애인등편의법 시행령 별표1(해설, 신문 기사)"
      }
    ],
    "entryZone": {
      "left": 3400,
      "right": 4600,
      "top": 10000
    },
    "clearances": [
      {
        "id": "counter_back",
        "label": "카운터 뒤 직원 통로",
        "valueMm": 3700,
        "requiredMm": 900,
        "ok": true
      },
      {
        "id": "aisle",
        "label": "줄 사이 통로",
        "valueMm": 1200,
        "requiredMm": 850,
        "ok": true
      },
      {
        "id": "entry",
        "label": "입구 앞 비움",
        "valueMm": 1200,
        "requiredMm": 1200,
        "ok": true
      }
    ],
    "structures": [
      {
        "kind": "window",
        "label": "창",
        "x": 0,
        "y": 0,
        "widthMm": 200,
        "depthMm": 6600
      },
      {
        "kind": "door",
        "label": "문",
        "x": 3614,
        "y": 0,
        "widthMm": 900,
        "depthMm": 200
      },
      {
        "kind": "ring",
        "label": "천장 구조물",
        "x": 721,
        "y": 1186,
        "widthMm": 2800,
        "depthMm": 2800
      }
    ],
    "camera": {
      "x": 2170,
      "y": 9013,
      "left": [
        -0.6853,
        -0.7282
      ],
      "right": [
        0.471,
        -0.8821
      ]
    },
    "pins": [
      {
        "x": 43.2,
        "y": 55
      },
      {
        "x": 49.5,
        "y": 53.1
      },
      {
        "x": 60.8,
        "y": 53.2
      },
      {
        "x": 87.5,
        "y": 53.6
      },
      null,
      null,
      {
        "x": 73.9,
        "y": 55.2
      },
      {
        "x": 99.7,
        "y": 56.6
      },
      {
        "x": 85.3,
        "y": 59.1
      },
      null
    ]
  },
  "02-pilates": {
    "room": {
      "widthMm": 8000,
      "depthMm": 11200,
      "ceilingMm": 3000
    },
    "useType": "pilates",
    "placed": [
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 600,
        "y": 900
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 4600,
        "y": 900
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 600,
        "y": 2500
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 4600,
        "y": 2500
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 600,
        "y": 4100
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 4600,
        "y": 4100
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 600,
        "y": 5700
      },
      {
        "productId": "reformer",
        "name": "필라테스 리포머",
        "category": "reformer",
        "kind": "fixture",
        "widthMm": 2400,
        "depthMm": 700,
        "chairs": 0,
        "x": 4600,
        "y": 5700
      }
    ],
    "unplaced": [],
    "violations": [],
    "notes": [
      {
        "level": "check",
        "text": "필라테스가 학원인지 체력단련장업인지에 따라 시설 기준이 다릅니다. 관할 교육청이나 구청에 확인하세요.",
        "source": "건축법 시행령 별표1 제4호"
      }
    ],
    "entryZone": {
      "left": 3400,
      "right": 4600,
      "top": 10000
    },
    "clearances": [
      {
        "id": "aisle",
        "label": "줄 사이 통로",
        "valueMm": 900,
        "requiredMm": 850,
        "ok": true
      },
      {
        "id": "entry",
        "label": "입구 앞 비움",
        "valueMm": 1200,
        "requiredMm": 1200,
        "ok": true
      }
    ],
    "structures": [
      {
        "kind": "window",
        "label": "창",
        "x": 0,
        "y": 0,
        "widthMm": 200,
        "depthMm": 6600
      },
      {
        "kind": "door",
        "label": "문",
        "x": 3614,
        "y": 0,
        "widthMm": 900,
        "depthMm": 200
      },
      {
        "kind": "ring",
        "label": "천장 구조물",
        "x": 721,
        "y": 1186,
        "widthMm": 2800,
        "depthMm": 2800
      }
    ],
    "camera": {
      "x": 2170,
      "y": 9013,
      "left": [
        -0.6853,
        -0.7282
      ],
      "right": [
        0.471,
        -0.8821
      ]
    },
    "pins": [
      {
        "x": 55.9,
        "y": 53.9
      },
      {
        "x": 94.8,
        "y": 54.6
      },
      {
        "x": 55.1,
        "y": 55.8
      },
      null,
      {
        "x": 53.6,
        "y": 58.9
      },
      null,
      {
        "x": 50.5,
        "y": 65.4
      },
      null
    ]
  }
};

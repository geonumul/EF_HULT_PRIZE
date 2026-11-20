// 도면으로 가이드 이미지를 다시 그릴 때 쓰는 카메라 보정값. functions/tools/export_guide_assets.py가 만든다. 직접 고치지 않는다.
// 좌표는 사진을 가이드 비율로 자른 뒤의 픽셀이다.
export type GuideCalib = {
  width: number;
  height: number;
  aspectRatio: string;
  f: number;
  h: number;
  vp1: [number, number];
  vp2: [number, number];
  anchor: { u: number; v: number; x: number; y: number };
};

export const GUIDE_CALIB: Record<string, GuideCalib> = {
  "08": {
    "width": 1272,
    "height": 848,
    "aspectRatio": "3:2",
    "f": 1183.3,
    "h": 1500,
    "vp1": [
      450.8,
      457.4
    ],
    "vp2": [
      8201.4,
      446.9
    ],
    "anchor": {
      "u": 296,
      "v": 590,
      "x": 0,
      "y": 0
    }
  },
  "02": {
    "width": 1236,
    "height": 927,
    "aspectRatio": "4:3",
    "f": 866.1,
    "h": 1500,
    "vp1": [
      733.6,
      433.2
    ],
    "vp2": [
      -5882.5,
      418.0
    ],
    "anchor": {
      "u": 528,
      "v": 573,
      "x": 0,
      "y": 0
    }
  }
};

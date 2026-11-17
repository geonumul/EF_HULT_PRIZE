// 카카오맵 JS SDK v3를 불러오고 지도를 만든다. 키가 없거나 불러오지 못하면 호출한 쪽이 정적 지도로 대체한다.

type KakaoLatLng = object;

type KakaoBounds = {
  extend: (point: KakaoLatLng) => void;
};

type KakaoMap = {
  setLevel: (level: number) => void;
  getLevel: () => number;
  setCenter: (center: KakaoLatLng) => void;
  relayout: () => void; // 지도 영역 크기가 바뀐 뒤 다시 계산한다.
  setBounds: (bounds: KakaoBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number) => void;
  getProjection: () => { containerPointFromCoords: (coords: KakaoLatLng) => { x: number; y: number } };
};

export type KakaoMaps = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  event: { addListener: (target: object, type: string, handler: () => void) => void };
};

export type { KakaoMap };

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

let loadingPromise: Promise<KakaoMaps> | null = null;

/** SDK 스크립트를 한 번만 붙이고, 지도를 쓸 수 있을 때 kakao.maps를 돌려준다. */
export function loadKakaoMaps(appKey: string): Promise<KakaoMaps> {
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement("script");
    // autoload=false: 스크립트가 도착한 뒤 kakao.maps.load로 직접 시작한다.
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        reject(new Error("카카오맵 SDK를 찾지 못했다."));
        return;
      }
      maps.load(() => resolve(maps));
    };
    script.onerror = () => reject(new Error("카카오맵 SDK를 불러오지 못했다."));
    document.head.appendChild(script);
  }).catch((error) => {
    loadingPromise = null; // 다음에 다시 시도할 수 있게 비운다.
    throw error;
  });

  return loadingPromise;
}

/** 화면의 줌 단계(0~3, 클수록 가까움)를 카카오 레벨(작을수록 가까움)로 바꾼다. */
export function kakaoLevelFromZoom(zoom: number): number {
  return 4 - zoom;
}

export function zoomFromKakaoLevel(level: number): number {
  return Math.min(3, Math.max(0, 4 - level));
}

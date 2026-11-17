"use client";
// 지도 바탕과 핀. 카카오 지도를 쓸 수 있으면 카카오 지도 위에, 없으면 시안의 지도 이미지 위에 같은 핀을 올린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { formatArea, formatMan, USE_LABELS } from "@/lib/format";
import {
  kakaoLevelFromZoom,
  loadKakaoMaps,
  zoomFromKakaoLevel,
  type KakaoCustomOverlay,
  type KakaoMap,
  type KakaoMaps,
} from "@/lib/kakao";
import { FALLBACK_POINTS } from "@/mocks/map";
import type { Listing, UseType } from "@/types";
import type { ClusterPin } from "@/types/map";
import { costOf } from "./listingHelpers";
import MapPin from "./MapPin";
import styles from "./MapCanvas.module.css";

type Props = {
  listings: Listing[];
  clusters: ClusterPin[];
  selectedId: string | null;
  use: UseType | null;
  zoom: number; // 0~3
  locateTick: number; // 현위치 버튼을 누를 때마다 1 늘어난다
  onZoomChange: (zoom: number) => void;
  onSelect: (id: string | null) => void;
};

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const DEFAULT_CENTER = { lat: 37.5446, lng: 127.0557 }; // 성수동
const STATIC_ZOOM_STEP = 0.25; // 정적 지도는 줌 한 단계마다 25%씩 확대한다
const MAX_ZOOM = 3;

export default function MapCanvas({
  listings,
  clusters,
  selectedId,
  use,
  zoom,
  locateTick,
  onZoomChange,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const mapsRef = useRef<KakaoMaps | null>(null);
  const [kakaoReady, setKakaoReady] = useState(false);
  // 공실 핀마다 카카오 오버레이와 그 안에 핀을 그릴 HTML 요소를 하나씩 둔다.
  const overlaysRef = useRef<Record<string, KakaoCustomOverlay>>({});
  const pinHostsRef = useRef<Record<string, HTMLElement>>({});
  const [pinHosts, setPinHosts] = useState<Record<string, HTMLElement>>({});
  const [showMe, setShowMe] = useState(false);

  // 카카오 이벤트는 처음 한 번만 등록하므로, 최신 값은 여기에 담아 읽는다.
  const latest = useRef({ listings, zoom, onZoomChange });
  latest.current = { listings, zoom, onZoomChange };

  // 카카오 SDK를 불러온다. 키가 없거나 실패하면 kakaoReady가 false로 남아 정적 지도를 쓴다.
  useEffect(() => {
    if (!KAKAO_KEY || !containerRef.current) return;
    let cancelled = false;

    loadKakaoMaps(KAKAO_KEY)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: kakaoLevelFromZoom(latest.current.zoom),
        });
        maps.event.addListener(map, "zoom_changed", () => {
          latest.current.onZoomChange(zoomFromKakaoLevel(map.getLevel()));
        });
        mapRef.current = map;
        mapsRef.current = maps;

        // 영역이 화면에 자리 잡은 뒤 크기를 다시 계산하고, 공실이 모두 보이게 맞춘다.
        // 이 단계를 빼면 지도 중심과 핀 위치가 어긋난다.
        map.relayout();
        const bounds = new maps.LatLngBounds();
        for (const listing of latest.current.listings) {
          bounds.extend(new maps.LatLng(listing.position.lat, listing.position.lng));
        }
        map.setBounds(bounds, 160, 80, 120, 80);

        setKakaoReady(true);
      })
      .catch(() => {
        // 불러오기에 실패하면 정적 지도가 그대로 보인다.
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 창 크기가 바뀌면 카카오 지도가 영역 크기를 다시 계산해야 한다. 그렇지 않으면 빈 띠가 생기고 핀이 어긋난다.
  useEffect(() => {
    const container = containerRef.current;
    if (!kakaoReady || !container) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.relayout();
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kakaoReady]);

  // 줌 버튼을 누르면 카카오 지도 레벨을 바꾼다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const level = kakaoLevelFromZoom(zoom);
    if (map.getLevel() !== level) map.setLevel(level);
  }, [zoom, kakaoReady]);

  // 공실 목록이 바뀌거나 지도가 준비되면 카카오 오버레이를 맞춘다.
  // 핀을 React가 직접 움직이면 지도보다 한 박자 늦는다. 오버레이는 카카오가 지도와 함께 움직인다.
  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!kakaoReady || !map || !maps) return;

    const nextHosts: Record<string, HTMLElement> = {};
    const nextOverlays: Record<string, KakaoCustomOverlay> = {};
    for (const listing of listings) {
      const existing = overlaysRef.current[listing.id];
      if (existing && pinHostsRef.current[listing.id]) {
        nextOverlays[listing.id] = existing;
        nextHosts[listing.id] = pinHostsRef.current[listing.id];
        continue;
      }
      // 크기가 0인 상자를 좌표에 놓고, 핀은 그 안에서 위치 0,0에 둔다. 핀 끝 맞춤은 MapPin의 CSS가 한다.
      const host = document.createElement("div");
      host.style.width = "0";
      host.style.height = "0";
      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(listing.position.lat, listing.position.lng),
        content: host,
        xAnchor: 0,
        yAnchor: 0,
        clickable: true,
      });
      overlay.setMap(map);
      nextOverlays[listing.id] = overlay;
      nextHosts[listing.id] = host;
    }

    // 더 이상 목록에 없는 공실의 오버레이는 지도에서 뗀다.
    for (const id of Object.keys(overlaysRef.current)) {
      if (!nextOverlays[id]) overlaysRef.current[id].setMap(null);
    }
    overlaysRef.current = nextOverlays;
    pinHostsRef.current = nextHosts;
    setPinHosts(nextHosts);
  }, [listings, kakaoReady]);

  // 선택한 공실의 핀이 다른 핀 위에 보이게 한다.
  useEffect(() => {
    for (const [id, overlay] of Object.entries(overlaysRef.current)) {
      overlay.setZIndex(id === selectedId ? 10 : 1);
    }
  }, [selectedId, pinHosts]);

  // 현위치 버튼. 카카오 지도는 브라우저 위치로 이동하고, 정적 지도는 내 위치 점을 보여 준다.
  useEffect(() => {
    if (locateTick === 0) return;
    setShowMe(true);
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      map.setCenter(new maps.LatLng(position.coords.latitude, position.coords.longitude));
    });
  }, [locateTick]);

  const scale = 1 + zoom * STATIC_ZOOM_STEP;
  const stageStyle = { transform: `scale(${scale})`, "--zoom": scale } as CSSProperties;

  /** 선택된 공실 핀 위의 말풍선. 업종을 골랐으면 창업비, 아니면 면적을 보여 준다. */
  function renderTooltip(listing: Listing) {
    const cost = costOf(listing, use);
    if (use !== null && cost !== undefined) {
      return (
        <span className={styles.tooltip}>
          <span className={styles.tooltipSub}>{USE_LABELS[use]} 창업</span>
          <span className={styles.tooltipMain}>{formatMan(cost)}</span>
        </span>
      );
    }
    return (
      <span className={styles.tooltip}>
        <span className={styles.tooltipSub}>{listing.address}</span>
        <span className={styles.tooltipMain}>공실 {formatArea(listing.areaM2)}</span>
      </span>
    );
  }

  function renderListingPin(listing: Listing, style: CSSProperties) {
    const selected = listing.id === selectedId;
    return (
      <MapPin
        key={listing.id}
        kind="listing"
        label="공실"
        selected={selected}
        ariaLabel={`${listing.address} 공실 ${formatArea(listing.areaM2)}`}
        style={style}
        onClick={() => onSelect(listing.id)}
      >
        {selected && renderTooltip(listing)}
      </MapPin>
    );
  }

  return (
    <div className={styles.canvas} onClick={() => onSelect(null)}>
      {/* 정적 지도. 카카오 지도가 준비되면 가려진다. */}
      <div className={styles.stage} style={stageStyle} hidden={kakaoReady}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.background} src="/images/map-bg.png" alt="" />
        {clusters.map((cluster) => (
          <MapPin
            key={cluster.id}
            kind="cluster"
            label={cluster.count}
            ariaLabel={`공실 ${cluster.count}곳 묶음, 눌러서 확대`}
            style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }}
            onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 1))}
          />
        ))}
        {listings.map((listing) => {
          const point = FALLBACK_POINTS[listing.id] ?? { x: 50, y: 50 };
          return renderListingPin(listing, { left: `${point.x}%`, top: `${point.y}%` });
        })}
        {showMe && <span className={styles.me} role="img" aria-label="내 위치" />}
      </div>

      {KAKAO_KEY && (
        <div ref={containerRef} className={styles.kakao} style={{ visibility: kakaoReady ? "visible" : "hidden" }} />
      )}

      {/* 카카오 지도 위 공실 핀. 오버레이 요소 안에 그린다. */}
      {kakaoReady &&
        listings.map((listing) => {
          const host = pinHosts[listing.id];
          if (!host) return null;
          return createPortal(renderListingPin(listing, { left: 0, top: 0 }), host, listing.id);
        })}
    </div>
  );
}

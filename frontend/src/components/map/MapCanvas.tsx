"use client";
// 지도 바탕과 핀. 카카오 지도를 쓸 수 있으면 카카오 지도 위에, 없으면 시안의 지도 이미지 위에 같은 핀을 올린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { formatArea, formatMan, USE_LABELS } from "@/lib/format";
import {
  kakaoLevelFromZoom,
  loadKakaoMaps,
  zoomFromKakaoLevel,
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

type Point = { x: number; y: number };

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
  const [points, setPoints] = useState<Record<string, Point>>({});
  const [showMe, setShowMe] = useState(false);

  // 카카오 이벤트는 처음 한 번만 등록하므로, 최신 값은 여기에 담아 읽는다.
  const latest = useRef({ listings, zoom, onZoomChange });
  latest.current = { listings, zoom, onZoomChange };

  /** 카카오 지도 위 공실 좌표를 화면 픽셀로 바꿔 핀 위치를 갱신한다. */
  function updatePoints() {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps) return;
    const projection = map.getProjection();
    const next: Record<string, Point> = {};
    for (const listing of latest.current.listings) {
      const { lat, lng } = listing.position;
      next[listing.id] = projection.containerPointFromCoords(new maps.LatLng(lat, lng));
    }
    setPoints(next);
  }

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
        maps.event.addListener(map, "center_changed", updatePoints);
        maps.event.addListener(map, "tilesloaded", updatePoints);
        maps.event.addListener(map, "zoom_changed", () => {
          latest.current.onZoomChange(zoomFromKakaoLevel(map.getLevel()));
          updatePoints();
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
        updatePoints();
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
      updatePoints();
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

  // 공실 목록이 바뀌거나 지도가 준비되면 핀 위치를 다시 계산한다.
  useEffect(() => {
    updatePoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, kakaoReady]);

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

      {kakaoReady &&
        listings.map((listing) => {
          const point = points[listing.id];
          if (!point) return null;
          return renderListingPin(listing, { left: point.x, top: point.y });
        })}
    </div>
  );
}

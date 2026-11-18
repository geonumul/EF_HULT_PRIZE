"use client";
// 지도 바탕과 핀. 카카오 지도를 쓸 수 있으면 카카오 지도 위에, 없으면 시안의 지도 이미지 위에 같은 핀을 올린다.
import { useEffect, useMemo, useRef, useState } from "react";
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
import type { VacancyCandidate } from "@/types/vacancy";
import CandidateCluster from "./CandidateCluster";
import CandidateDot from "./CandidateDot";
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
  candidates: VacancyCandidate[]; // 후보 보기를 켰을 때만 값이 있다
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
};

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const DEFAULT_CENTER = { lat: 37.5446, lng: 127.0557 }; // 성수동
const STATIC_ZOOM_STEP = 0.25; // 정적 지도는 줌 한 단계마다 25%씩 확대한다
const MAX_ZOOM = 3;
const CLUSTER_CELL_PX = 40; // 이 크기의 칸 안에 두 곳 이상 있으면 하나로 묶는다.

type Viewport = { south: number; west: number; north: number; east: number };

/** 지도에 올리는 점 하나. 후보 한 곳이거나, 겹친 여러 곳을 묶은 배지다. */
type MapDot = { id: string; lat: number; lng: number; count: number; candidate: VacancyCandidate | null };

/** 카카오 지도에서 지금 화면에 보이는 범위를 읽는다. */
function readViewport(map: KakaoMap): Viewport {
  const bounds = map.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  return { south: southWest.getLat(), west: southWest.getLng(), north: northEast.getLat(), east: northEast.getLng() };
}

export default function MapCanvas({
  listings,
  clusters,
  selectedId,
  use,
  zoom,
  locateTick,
  onZoomChange,
  onSelect,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
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
  const [viewport, setViewport] = useState<Viewport | null>(null);
  // 공실 후보 점도 같은 방식으로 카카오 오버레이에 올린다.
  const candidateOverlaysRef = useRef<Record<string, KakaoCustomOverlay>>({});
  const candidateHostsRef = useRef<Record<string, HTMLElement>>({});
  const [candidateHosts, setCandidateHosts] = useState<Record<string, HTMLElement>>({});

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
        // 지도를 움직이거나 확대한 뒤 멈추면 화면 범위를 다시 읽는다.
        maps.event.addListener(map, "idle", () => setViewport(readViewport(map)));

        // 영역이 화면에 자리 잡은 뒤 크기를 다시 계산하고, 공실이 모두 보이게 맞춘다.
        // 이 단계를 빼면 지도 중심과 핀 위치가 어긋난다.
        map.relayout();
        const bounds = new maps.LatLngBounds();
        for (const listing of latest.current.listings) {
          bounds.extend(new maps.LatLng(listing.position.lat, listing.position.lng));
        }
        map.setBounds(bounds, 160, 80, 120, 80);

        setKakaoReady(true);
        setViewport(readViewport(map));
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

  // 화면 범위 안의 후보를 칸으로 나눠, 한 칸에 둘 이상이면 하나의 묶음으로 만든다.
  const visibleDots = useMemo(() => {
    if (!viewport) return [];
    const marginLat = (viewport.north - viewport.south) * 0.1;
    const marginLng = (viewport.east - viewport.west) * 0.1;
    const container = containerRef.current;
    const columns = Math.max(1, (container?.clientWidth ?? 1000) / CLUSTER_CELL_PX);
    const rows = Math.max(1, (container?.clientHeight ?? 700) / CLUSTER_CELL_PX);
    const cellLng = (viewport.east - viewport.west) / columns;
    const cellLat = (viewport.north - viewport.south) / rows;

    const cells: Record<string, VacancyCandidate[]> = {};
    for (const candidate of candidates) {
      const { lat, lng } = candidate.position;
      if (lat < viewport.south - marginLat || lat > viewport.north + marginLat) continue;
      if (lng < viewport.west - marginLng || lng > viewport.east + marginLng) continue;
      const key = `${Math.floor(lat / cellLat)}:${Math.floor(lng / cellLng)}`;
      (cells[key] ??= []).push(candidate);
    }

    return Object.entries(cells).map(([key, members]): MapDot => {
      if (members.length === 1) {
        const only = members[0];
        return { id: only.id, lat: only.position.lat, lng: only.position.lng, count: 1, candidate: only };
      }
      const lat = members.reduce((sum, member) => sum + member.position.lat, 0) / members.length;
      const lng = members.reduce((sum, member) => sum + member.position.lng, 0) / members.length;
      return { id: `cluster:${key}`, lat, lng, count: members.length, candidate: null };
    });
  }, [candidates, viewport]);

  /** 묶음을 누르면 그 자리를 중심으로 한 단계 확대한다. */
  function zoomIntoCluster(dot: MapDot) {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps) return;
    map.setCenter(new maps.LatLng(dot.lat, dot.lng));
    map.setLevel(Math.max(1, map.getLevel() - 1));
  }

  // 후보 목록이 바뀌면 후보 오버레이를 맞춘다. 후보 보기를 끄면 목록이 비어서 모두 지워진다.
  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!kakaoReady || !map || !maps) return;

    const nextOverlays: Record<string, KakaoCustomOverlay> = {};
    const nextHosts: Record<string, HTMLElement> = {};
    for (const dot of visibleDots) {
      const existing = candidateOverlaysRef.current[dot.id];
      if (existing && candidateHostsRef.current[dot.id]) {
        nextOverlays[dot.id] = existing;
        nextHosts[dot.id] = candidateHostsRef.current[dot.id];
        continue;
      }
      const host = document.createElement("div");
      host.style.width = "0";
      host.style.height = "0";
      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(dot.lat, dot.lng),
        content: host,
        xAnchor: 0,
        yAnchor: 0,
        zIndex: 0,
        clickable: true,
      });
      overlay.setMap(map);
      nextOverlays[dot.id] = overlay;
      nextHosts[dot.id] = host;
    }
    for (const id of Object.keys(candidateOverlaysRef.current)) {
      if (!nextOverlays[id]) candidateOverlaysRef.current[id].setMap(null);
    }
    candidateOverlaysRef.current = nextOverlays;
    candidateHostsRef.current = nextHosts;
    setCandidateHosts(nextHosts);
  }, [visibleDots, kakaoReady]);

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

      {/* 카카오 지도 위 공실 후보 점 */}
      {kakaoReady &&
        visibleDots.map((dot) => {
          const host = candidateHosts[dot.id];
          if (!host) return null;
          const candidate = dot.candidate;
          return createPortal(
            candidate ? (
              <CandidateDot
                confidence={candidate.confidence}
                selected={candidate.id === selectedCandidateId}
                ariaLabel={`공실 후보 ${candidate.address} ${candidate.floor}층`}
                onClick={() => onSelectCandidate(candidate.id)}
              />
            ) : (
              <CandidateCluster count={dot.count} onClick={() => zoomIntoCluster(dot)} />
            ),
            host,
            dot.id,
          );
        })}

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

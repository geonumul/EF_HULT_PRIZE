"use client";
// S01·S02 공실 지도 화면의 상태 관리. 업종은 주소의 ?use=로 오가고, 나머지는 이 컴포넌트가 들고 있다.
// Figma S01 18:44, S02 22:164
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Chip from "@/components/ui/Chip";
import { CLUSTER_PINS } from "@/mocks/map";
import { LISTINGS } from "@/mocks/listings";
import type { UseType } from "@/types";
import type { MapFilters, SortKey } from "@/types/map";
import CategoryTabs from "./CategoryTabs";
import { LocateIcon, MinusIcon, PlusIcon, SearchIcon } from "./icons";
import ListPanel from "./ListPanel";
import { filterListings, sortListings } from "./listingHelpers";
import MapCanvas from "./MapCanvas";
import PreviewCard from "./PreviewCard";
import styles from "./MapScreen.module.css";

const USE_TYPES: UseType[] = ["cafe", "popup", "pilates", "restaurant", "retail", "service", "office"];
const BOOKMARK_KEY = "shopportunity.bookmarks";
const MAX_ZOOM = 3;

/** 주소의 ?use= 값이 업종 id일 때만 돌려준다. */
function parseUse(value: string | null): UseType | null {
  return USE_TYPES.find((use) => use === value) ?? null;
}

export default function MapScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const use = parseUse(searchParams.get("use"));

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MapFilters>({ under5000: false, firstFloorOnly: false, noPremium: false });
  const [costOnly, setCostOnly] = useState(true);
  const [sort, setSort] = useState<SortKey>("latest");
  const [selectedId, setSelectedId] = useState<string | null>(LISTINGS[0].id);
  const [zoom, setZoom] = useState(0);
  const [locateTick, setLocateTick] = useState(0);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  // 북마크는 브라우저에 저장한다. 서버 화면과 맞추려고 마운트 뒤에 읽는다.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BOOKMARK_KEY);
      if (saved) setBookmarks(JSON.parse(saved) as string[]);
    } catch {
      // 저장소를 읽을 수 없으면 빈 목록으로 시작한다.
    }
  }, []);

  function toggleBookmark(id: string) {
    const next = bookmarks.includes(id) ? bookmarks.filter((item) => item !== id) : [...bookmarks, id];
    setBookmarks(next);
    try {
      window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
    } catch {
      // 저장에 실패해도 화면 상태는 유지한다.
    }
  }

  function changeUse(next: UseType | null) {
    router.replace(next ? `/map?use=${next}` : "/map", { scroll: false });
  }

  function toggleFilter(key: keyof MapFilters) {
    setFilters({ ...filters, [key]: !filters[key] });
  }

  const visibleListings = useMemo(() => {
    const filtered = filterListings(LISTINGS, { use, costOnly, filters, query });
    return sortListings(filtered, sort, use);
  }, [use, costOnly, filters, query, sort]);

  // 묶음 핀은 가짜 데이터라 검색어나 칩이 켜져 있으면 숨긴다.
  const filtersOn = filters.under5000 || filters.firstFloorOnly || filters.noPremium;
  const visibleClusters = CLUSTER_PINS.filter((cluster) => {
    if (query.trim() || filtersOn) return false;
    return use === null || cluster.uses.includes(use);
  });

  // 거르는 바람에 선택된 공실이 목록에서 사라지면 카드도 닫는다.
  const selected = visibleListings.find((listing) => listing.id === selectedId) ?? null;

  return (
    <div className={styles.screen}>
      <CategoryTabs use={use} onChange={changeUse} />

      <div className={styles.body}>
        <section className={styles.map} aria-label="공실 지도">
          <MapCanvas
            listings={visibleListings}
            clusters={visibleClusters}
            selectedId={selected?.id ?? null}
            use={use}
            zoom={zoom}
            locateTick={locateTick}
            onZoomChange={setZoom}
            onSelect={setSelectedId}
          />

          <label className={`glass ${styles.search}`}>
            <SearchIcon />
            <input
              className={styles.searchInput}
              type="search"
              placeholder="지역, 지하철역, 건물명 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className={styles.chips}>
            <Chip className={styles.mapChip} selected={filters.under5000} onClick={() => toggleFilter("under5000")}>
              창업비 5천만 이하
            </Chip>
            <Chip className={styles.mapChip} selected={filters.firstFloorOnly} onClick={() => toggleFilter("firstFloorOnly")}>
              1층만
            </Chip>
            <Chip className={styles.mapChip} selected={filters.noPremium} onClick={() => toggleFilter("noPremium")}>
              권리금 없음
            </Chip>
          </div>

          {selected && (
            <PreviewCard
              key={`${selected.id}-${use ?? "none"}`}
              listing={selected}
              use={use}
              bookmarked={bookmarks.includes(selected.id)}
              onToggleBookmark={() => toggleBookmark(selected.id)}
              onSelectUse={changeUse}
            />
          )}

          <div className={styles.controls}>
            <div className={styles.zoomBox}>
              <button
                type="button"
                className={styles.controlButton}
                aria-label="지도 확대"
                disabled={zoom >= MAX_ZOOM}
                onClick={() => setZoom(Math.min(MAX_ZOOM, zoom + 1))}
              >
                <PlusIcon />
              </button>
              <button
                type="button"
                className={styles.controlButton}
                aria-label="지도 축소"
                disabled={zoom <= 0}
                onClick={() => setZoom(Math.max(0, zoom - 1))}
              >
                <MinusIcon />
              </button>
            </div>
            <button
              type="button"
              className={`${styles.controlButton} ${styles.locate}`}
              aria-label="현위치"
              onClick={() => setLocateTick(locateTick + 1)}
            >
              <LocateIcon />
            </button>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={costOnly}
            className={`glass ${styles.costToggle}`}
            onClick={() => setCostOnly(!costOnly)}
          >
            <span className={`${styles.switch} ${costOnly ? styles.switchOn : ""}`} />
            창업비 산출 공실만
          </button>

          <p className={styles.credit}>© OpenStreetMap contributors</p>
        </section>

        <ListPanel
          listings={visibleListings}
          use={use}
          sort={sort}
          selectedId={selected?.id ?? null}
          bookmarks={bookmarks}
          onSortChange={setSort}
          onUseChange={changeUse}
          onSelect={setSelectedId}
          onToggleBookmark={toggleBookmark}
        />
      </div>
    </div>
  );
}

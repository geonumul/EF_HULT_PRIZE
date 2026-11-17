"use client";
// 철거비 추정과 철거 견적 요청 화면. 입력이 바뀔 때마다 추정 범위를 다시 계산한다.
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import CheckList from "@/components/demolition/CheckList";
import {
  ALL_SCOPES,
  FIXTURE_LABELS,
  SCOPE_LABELS,
  estimateDemolition,
  newRequestId,
  saveRequest,
} from "@/lib/demolition";
import { formatArea, formatWon, USE_LABELS } from "@/lib/format";
import { pickVendorIds, regionOfAddress } from "@/mocks/demolition";
import { findRender } from "@/mocks/renders";
import type { Listing, SpaceCondition, UseType } from "@/types";
import type { DemolitionRequest, DemolitionScope, WasteHandling } from "@/types/demolition";
import styles from "./Planner.module.css";

const FIXTURE_OPTIONS: SpaceCondition[] = ["vacant", "has_fixtures", "occupied"];

type Props = { listing: Listing };

export default function Planner({ listing }: Props) {
  const router = useRouter();
  const useTypes = (Object.keys(listing.costs) as UseType[]).filter((use) => findRender(`r-${listing.id}-${use}`));

  const [fixtures, setFixtures] = useState<SpaceCondition>(listing.condition);
  const [scopes, setScopes] = useState<DemolitionScope[]>(ALL_SCOPES);
  const [waste, setWaste] = useState<WasteHandling>("vendor");
  const [useType, setUseType] = useState<UseType>(useTypes[0]);

  const estimate = estimateDemolition({ areaM2: listing.areaM2, fixtures, scopes, waste });
  const isVacant = fixtures === "vacant";
  const canRequest = !isVacant && scopes.length > 0;

  function toggleScope(scope: DemolitionScope) {
    setScopes((current) => (current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope]));
  }

  function requestQuotes() {
    const region = regionOfAddress(listing.address);
    const request: DemolitionRequest = {
      id: newRequestId(),
      listingId: listing.id,
      useType,
      region,
      input: { areaM2: listing.areaM2, fixtures, scopes, waste },
      estimate,
      vendorIds: pickVendorIds(region),
      createdAt: Date.now(),
      status: "open",
    };
    saveRequest(request);
    router.push(`/demolition/${request.id}`);
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>철거 견적 받기</h1>
      <p className={styles.lead}>철거 범위를 고르면 예상 철거비를 보여 드립니다. 요청하면 같은 지역 철거 업체 최대 3곳이 견적을 보냅니다.</p>

      <div className={styles.columns}>
        <div className={styles.left}>
          <section className={styles.box}>
            <h2 className={styles.boxTitle}>공실 정보</h2>
            <dl className={styles.info}>
              <dt>위치</dt>
              <dd>
                {listing.address} {listing.tag}
              </dd>
              <dt>면적</dt>
              <dd>{formatArea(listing.areaM2)}</dd>
              <dt>현재 상태</dt>
              <dd>{FIXTURE_LABELS[listing.condition]}</dd>
            </dl>
          </section>

          <section className={styles.box}>
            <h2 className={styles.boxTitle}>남은 시설 상태</h2>
            <div className={styles.chips}>
              {FIXTURE_OPTIONS.map((option) => (
                <Chip key={option} selected={fixtures === option} onClick={() => setFixtures(option)}>
                  {FIXTURE_LABELS[option]}
                </Chip>
              ))}
            </div>
            {isVacant && <p className={styles.notice}>철거 필요 없음. 남은 시설이 없어 철거비가 들지 않습니다.</p>}
          </section>

          <section className={styles.box}>
            <h2 className={styles.boxTitle}>철거 범위</h2>
            <div className={styles.chips}>
              {ALL_SCOPES.map((scope) => (
                <Chip key={scope} selected={scopes.includes(scope)} onClick={() => toggleScope(scope)} disabled={isVacant}>
                  {SCOPE_LABELS[scope]}
                </Chip>
              ))}
            </div>
            <h2 className={styles.boxTitle}>폐기물 처리</h2>
            <div className={styles.chips}>
              <Chip selected={waste === "vendor"} onClick={() => setWaste("vendor")} disabled={isVacant}>
                업체가 처리
              </Chip>
              <Chip selected={waste === "self"} onClick={() => setWaste("self")} disabled={isVacant}>
                직접 처리
              </Chip>
            </div>
          </section>

          <section className={styles.box}>
            <h2 className={styles.boxTitle}>철거 후 업종</h2>
            <p className={styles.hint}>확정 철거비는 이 업종의 견적서에 들어갑니다.</p>
            <div className={styles.chips}>
              {useTypes.map((use) => (
                <Chip key={use} selected={useType === use} onClick={() => setUseType(use)}>
                  {USE_LABELS[use]}
                </Chip>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.right}>
          <section className={styles.estimateBox}>
            <span className={styles.estimateLabel}>예상 철거비</span>
            <strong className={styles.estimateValue}>
              {isVacant || scopes.length === 0 ? "0원" : `${formatWon(estimate.minWon)} ~ ${formatWon(estimate.maxWon)}`}
            </strong>
            <p className={styles.estimateNote}>예시 단가 기준 추정이며 업체 견적으로 확정됩니다</p>
            <Button size="lg" className={styles.requestButton} disabled={!canRequest} onClick={requestQuotes}>
              철거 견적 받기
            </Button>
            {!isVacant && scopes.length === 0 && <p className={styles.warning}>철거 범위를 하나 이상 고르세요.</p>}
          </section>
          <CheckList />
        </aside>
      </div>
    </main>
  );
}

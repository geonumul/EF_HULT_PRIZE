"use client";

// 공간(공실 또는 공실 후보) 하나를 id로 불러온다.
// 샘플 공실은 바로 찾고, 서버의 공실과 공실 후보는 받아서 등록한 뒤 스튜디오, 견적, 철거 화면이 같은 방식으로 쓴다.
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import { addSpace } from "@/mocks/renders";
import { findListing } from "@/mocks/listings";
import { findMySpace } from "@/lib/mySpaces";
import type { Listing } from "@/types";

export type SpaceStatus = "loading" | "ready" | "missing";

/** 렌더링 id("r-<공간id>-<업종>")에서 공간 id를 꺼낸다. 상품 먼저 방식의 "-products"도 떼어 낸다. */
export function spaceIdOfRender(renderId: string): string {
  return renderId.replace(/^r-/, "").replace(/-products$/, "").replace(/-(cafe|popup|pilates|restaurant|retail|service|office)$/, "");
}

/** 공간을 서버에서 찾는다. 공실 목록에 있으면 그것을, 없으면 공실 후보에서 만든 공간을 돌려준다. */
async function fetchSpace(id: string): Promise<Listing | null> {
  const listings = await apiGet<Listing[]>("/listings");
  const listed = listings?.find((listing) => listing.id === id);
  if (listed) return listed;
  return apiGet<Listing>(`/vacancy-candidates/${encodeURIComponent(id)}/space`);
}

export function useSpace(id: string): { listing: Listing | null; status: SpaceStatus } {
  const [listing, setListing] = useState<Listing | null>(findListing(id) ?? null);
  const [status, setStatus] = useState<SpaceStatus>(listing ? "ready" : "loading");

  useEffect(() => {
    const known = findListing(id);
    if (known) {
      setListing(known);
      setStatus("ready");
      return;
    }
    const mine = findMySpace(id);
    if (mine) {
      addSpace(mine);
      setListing(findListing(id) ?? mine);
      setStatus("ready");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetchSpace(id).then((found) => {
      if (cancelled) return;
      if (!found) {
        setStatus("missing");
        return;
      }
      addSpace(found);
      setListing(findListing(id) ?? found);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { listing, status };
}

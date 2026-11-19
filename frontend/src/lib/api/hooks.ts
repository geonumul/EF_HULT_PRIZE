"use client";

// 목록 데이터를 읽는 훅. 처음에는 가짜 데이터로 바로 그리고, 백엔드 응답이 오면 그 데이터로 바꾼다.
// 그래서 서버가 느려도 화면이 비지 않고, 서버가 꺼져 있어도 화면이 동작한다.
import { isHighCandidate } from "@/lib/vacancy";
import { useEffect, useState } from "react";
import { LISTINGS } from "@/mocks/listings";
import { withShoppingLinks } from "@/lib/shopping";
import { PRODUCTS } from "@/mocks/products";
import type { Listing, Product } from "@/types";
import type { VacancyCandidate } from "@/types/vacancy";
import { apiGet } from "./client";

type DataSource = "mock" | "api";

/** 공실 목록. GET /listings */
export function useListings() {
  const [listings, setListings] = useState<Listing[]>(LISTINGS);
  const [source, setSource] = useState<DataSource>("mock");

  useEffect(() => {
    let cancelled = false;
    apiGet<Listing[]>("/listings").then((data) => {
      if (cancelled || !data || data.length === 0) return;
      setListings(data);
      setSource("api");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { listings, source };
}

/** 상품 목록. GET /products */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [source, setSource] = useState<DataSource>("mock");

  useEffect(() => {
    let cancelled = false;
    apiGet<Product[]>("/products").then((data) => {
      if (cancelled || !data || data.length === 0) return;
      setProducts(data.map(withShoppingLinks));
      setSource("api");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, source };
}

/** 공실 후보. GET /vacancy-candidates. enabled가 true가 될 때 한 번 읽고, 가능성이 높은 후보만 남긴다. 서버가 없으면 빈 목록이다. */
export function useCandidates(enabled: boolean) {
  const [candidates, setCandidates] = useState<VacancyCandidate[]>([]);

  useEffect(() => {
    if (!enabled || candidates.length > 0) return;
    let cancelled = false;
    apiGet<VacancyCandidate[]>("/vacancy-candidates?minConfidence=0&limit=20000").then((data) => {
      if (!cancelled && data) setCandidates(data.filter(isHighCandidate)); // 공실 가능성이 높은 후보만 보여 준다.
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, candidates.length]);

  return { candidates };
}

/** 인터넷 쇼핑몰에서 찾은 상품 하나 */
export type ShoppingItem = { name: string; price: number; mall: string; url: string; imageUrl: string };

// 같은 상품 이름은 한 번만 물어본다. null은 찾지 못했거나 서버에 검색 키가 없다는 뜻이다.
const shoppingCache = new Map<string, ShoppingItem | null>();

/** 상품 이름으로 인터넷 최저가 상품을 찾는다. GET /shopping/search. 못 찾으면 null이라 화면이 검색 링크를 쓴다. */
export function useShoppingItem(name: string, enabled: boolean): ShoppingItem | null {
  const [item, setItem] = useState<ShoppingItem | null>(shoppingCache.get(name) ?? null);

  useEffect(() => {
    if (!enabled) return;
    if (shoppingCache.has(name)) {
      setItem(shoppingCache.get(name) ?? null);
      return;
    }
    let cancelled = false;
    apiGet<{ items: ShoppingItem[] }>(`/shopping/search?q=${encodeURIComponent(name)}&limit=1`).then((data) => {
      const found = data?.items?.[0] ?? null;
      shoppingCache.set(name, found);
      if (!cancelled) setItem(found);
    });
    return () => {
      cancelled = true;
    };
  }, [name, enabled]);

  return item;
}

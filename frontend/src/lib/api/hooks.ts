"use client";

// 목록 데이터를 읽는 훅. 처음에는 가짜 데이터로 바로 그리고, 백엔드 응답이 오면 그 데이터로 바꾼다.
// 그래서 서버가 느려도 화면이 비지 않고, 서버가 꺼져 있어도 화면이 동작한다.
import { useEffect, useState } from "react";
import { LISTINGS } from "@/mocks/listings";
import { PRODUCTS } from "@/mocks/products";
import type { Listing, Product } from "@/types";
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
      setProducts(data);
      setSource("api");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, source };
}

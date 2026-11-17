# supabase

DB 스키마의 기준이 되는 폴더다. 마이그레이션 SQL은 `migrations/`에 번호 순서로 둔다. 4단계에서 Figma "08 Backend · Data"의 데이터 모델(listings, spaces, suitability, renders, render_items, products, vendors, quotes, orders, users, product_links)을 SQL로 옮긴다.

필요한 확장은 `postgis`와 `vector`다.

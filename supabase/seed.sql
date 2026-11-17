-- 시드 데이터. frontend/src/mocks/{listings,products,renders}.ts 와 같은 값이다.
-- 공실의 deposit, rent, costs는 만원 단위, 상품과 판매처 링크 가격은 원 단위다.
-- 값을 바꾸면 backend/app/seed_data.py 도 같이 바꾼다.
-- 4번 공실(seongsu-stn-2f)의 renderCount는 프론트 목에서 0이지만 여기서는 렌더링 3건이 있어 3으로 센다.
-- 업체 owner_id는 비워 둔다. 로그인 사용자와 연결하려면 vendors.owner_id를 갱신한다.

insert into vendors (id, owner_id, name, type, commission_rate) values
  ('vendor-market-b', null, '마켓B', 'supplier', 0.1),
  ('vendor-demo-1', null, '한솔철거', 'demolition', null),
  ('vendor-demo-2', null, '대한철거', 'demolition', null),
  ('vendor-demo-3', null, '새봄철거', 'demolition', null);

insert into listings (id, tag, address, nearby, geom, area_m2, floor, ceiling_h, deposit, rent, building_use, thumbnail, costs) values
  ('seongsu-2ga-1f', '1층 상가', '성수동2가', '성수동2가', ST_SetSRID(ST_MakePoint(127.0557, 37.5446), 4326)::geography, 39.6, 1, 3.2, 3000, 180, '제2종 근린생활시설', '/images/space-a.jpg', '{"cafe": 4200, "popup": 1900, "pilates": 5600}'::jsonb),
  ('ttukseom-1f', '1층 상가', '성수동1가', '뚝섬역 3분', ST_SetSRID(ST_MakePoint(127.0447, 37.5473), 4326)::geography, 46.2, 1, 3.0, 3500, 210, '제2종 근린생활시설', '/images/space-b.jpg', '{"pilates": 5600, "cafe": 4900, "popup": 2100}'::jsonb),
  ('seoulsup-corner-1f', '1층 코너', '성수동1가', '서울숲', ST_SetSRID(ST_MakePoint(127.0374, 37.5444), 4326)::geography, 33.0, 1, 3.4, 2000, 160, '제1종 근린생활시설', '/images/space-c.jpg', '{"popup": 1900, "cafe": 3600, "pilates": 4800}'::jsonb),
  ('seongsu-stn-2f', '2층 상가', '성수동2가', '성수역 5분', ST_SetSRID(ST_MakePoint(127.0559, 37.5446), 4326)::geography, 105.8, 2, 3.1, 5000, 320, '제2종 근린생활시설', '/images/space-d.jpg', '{"cafe": 6100, "pilates": 7200, "popup": 2600}'::jsonb);

insert into spaces (id, listing_id, photos, condition) values
  ('seongsu-2ga-1f', 'seongsu-2ga-1f', array['/images/space-a.jpg'], 'vacant'),
  ('ttukseom-1f', 'ttukseom-1f', array['/images/space-b.jpg'], 'has_fixtures'),
  ('seoulsup-corner-1f', 'seoulsup-corner-1f', array['/images/space-c.jpg'], 'vacant'),
  ('seongsu-stn-2f', 'seongsu-stn-2f', array['/images/space-d.jpg'], 'occupied');

insert into suitability (space_id, use_type, result, reason, extra_cost) values
  ('seongsu-2ga-1f', 'cafe', 'possible', '휴게음식점 300m² 미만', 4700000),
  ('seongsu-2ga-1f', 'popup', 'possible', '팝업 운영 가능', 900000),
  ('seongsu-2ga-1f', 'pilates', 'conditional', '층간 소음 확인', 4400000),
  ('ttukseom-1f', 'pilates', 'possible', '현장 확인으로 저장된 판정', 4400000),
  ('ttukseom-1f', 'cafe', 'possible', '휴게음식점 300m² 미만', 4700000),
  ('ttukseom-1f', 'popup', 'possible', '팝업 운영 가능', 900000),
  ('seoulsup-corner-1f', 'popup', 'possible', '팝업 운영 가능', 900000),
  ('seoulsup-corner-1f', 'cafe', 'possible', '휴게음식점 300m² 미만', 4700000),
  ('seoulsup-corner-1f', 'pilates', 'conditional', '층간 소음 확인', 4400000),
  ('seongsu-stn-2f', 'cafe', 'possible', '휴게음식점 300m² 미만', 4700000),
  ('seongsu-stn-2f', 'pilates', 'possible', '현장 확인으로 저장된 판정', 4400000),
  ('seongsu-stn-2f', 'popup', 'possible', '팝업 운영 가능', 900000);

insert into products (id, vendor_id, name, category, width_mm, depth_mm, height_mm, price, used_price, image_url) values
  ('chair-oak', 'vendor-market-b', '오크 원목 체어', 'chair', 450, 520, 780, 89000, 52000, '/images/prod-chair.jpg'),
  ('table-2p', 'vendor-market-b', '원목 2인 테이블', 'table', 700, 600, 730, 190000, 114000, '/images/prod-chair.jpg'),
  ('counter-bar', 'vendor-market-b', '바 카운터 2400', 'counter', 2400, 600, 1050, 1850000, null, '/images/prod-counter.jpg'),
  ('lamp-pendant', 'vendor-market-b', '펜던트 조명 (유리)', 'lamp', 300, 300, 250, 48000, 29000, '/images/prod-lamp.jpg'),
  ('fridge-showcase', 'vendor-market-b', '업소용 쇼케이스 냉장고', 'fridge', 1200, 700, 1900, 1280000, 780000, '/images/prod-counter.jpg'),
  ('espresso-machine', 'vendor-market-b', '2그룹 에스프레소 머신', 'machine', 760, 580, 520, 3900000, 2400000, '/images/prod-counter.jpg'),
  ('stool-bar', 'vendor-market-b', '바 스툴 (높이 650)', 'chair', 380, 380, 650, 64000, 38000, '/images/prod-chair.jpg'),
  ('shelf-display', 'vendor-market-b', '진열 선반 (오픈형)', 'shelf', 900, 350, 1800, 220000, null, '/images/prod-counter.jpg'),
  ('reformer', 'vendor-market-b', '필라테스 리포머', 'machine', 2400, 700, 400, 2300000, 1400000, '/images/prod-counter.jpg'),
  ('mirror-wall', 'vendor-market-b', '전신 벽거울 1200', 'mirror', 1200, 30, 1800, 180000, null, '/images/prod-lamp.jpg');

insert into product_links (id, product_id, source, label, url, price, status, checked_at) values
  ('chair-oak-a', 'chair-oak', 'partner', '마켓B', 'https://example.com/market-b/chair-oak', 89000, 'live', now()),
  ('chair-oak-b', 'chair-oak', 'coupang', '쿠팡', 'https://example.com/coupang/chair-oak', 92400, 'live', now()),
  ('chair-oak-c', 'chair-oak', 'naver', '네이버 최저가', 'https://example.com/naver/chair-oak', 93000, 'live', now()),
  ('table-2p-a', 'table-2p', 'partner', '마켓B', 'https://example.com/market-b/table-2p', 190000, 'live', now()),
  ('table-2p-b', 'table-2p', 'naver', '네이버 최저가', 'https://example.com/naver/table-2p', 198000, 'live', now()),
  ('counter-bar-a', 'counter-bar', 'partner', '마켓B', 'https://example.com/market-b/counter-bar', 1850000, 'live', now()),
  ('lamp-pendant-a', 'lamp-pendant', 'coupang', '쿠팡', 'https://example.com/coupang/lamp-pendant', 48000, 'live', now()),
  ('lamp-pendant-b', 'lamp-pendant', 'naver', '네이버 최저가', 'https://example.com/naver/lamp-pendant', 51000, 'live', now()),
  ('fridge-showcase-a', 'fridge-showcase', 'partner', '마켓B', 'https://example.com/market-b/fridge', 1280000, 'live', now()),
  ('fridge-showcase-b', 'fridge-showcase', 'used', '폐업 매장 중고', 'https://example.com/used/fridge', 780000, 'live', now()),
  ('espresso-machine-a', 'espresso-machine', 'naver', '네이버 최저가', 'https://example.com/naver/espresso', 3900000, 'live', now()),
  ('stool-bar-a', 'stool-bar', 'coupang', '쿠팡', 'https://example.com/coupang/stool', 64000, 'live', now()),
  ('shelf-display-a', 'shelf-display', 'partner', '마켓B', 'https://example.com/market-b/shelf', 220000, 'live', now()),
  ('reformer-a', 'reformer', 'naver', '네이버 최저가', 'https://example.com/naver/reformer', 2300000, 'live', now()),
  ('reformer-b', 'reformer', 'used', '폐업 매장 중고', 'https://example.com/used/reformer', 1400000, 'live', now()),
  ('mirror-wall-a', 'mirror-wall', 'coupang', '쿠팡', 'https://example.com/coupang/mirror', 180000, 'live', now());

insert into renders (id, space_id, use_type, mode, image_url, checks) values
  ('r-seongsu-2ga-1f-cafe', 'seongsu-2ga-1f', 'cafe', 'text', '/images/render-cafe.jpg', '["통로 폭 900mm 확보", "좌석 22석 배치", "바 카운터 동선 겹침 없음"]'::jsonb),
  ('r-seongsu-2ga-1f-popup', 'seongsu-2ga-1f', 'popup', 'text', '/images/render-popup.jpg', '["통로 폭 1,100mm 확보", "진열대 간격 800mm 이상"]'::jsonb),
  ('r-seongsu-2ga-1f-pilates', 'seongsu-2ga-1f', 'pilates', 'text', '/images/render-pilates.jpg', '["리포머 간격 700mm 확보", "거울 벽면 길이 충분"]'::jsonb),
  ('r-ttukseom-1f-pilates', 'ttukseom-1f', 'pilates', 'text', '/images/render-pilates.jpg', '["리포머 간격 700mm 확보", "거울 벽면 길이 충분"]'::jsonb),
  ('r-ttukseom-1f-cafe', 'ttukseom-1f', 'cafe', 'text', '/images/render-cafe.jpg', '["통로 폭 900mm 확보", "좌석 22석 배치", "바 카운터 동선 겹침 없음"]'::jsonb),
  ('r-ttukseom-1f-popup', 'ttukseom-1f', 'popup', 'text', '/images/render-popup.jpg', '["통로 폭 1,100mm 확보", "진열대 간격 800mm 이상"]'::jsonb),
  ('r-seoulsup-corner-1f-popup', 'seoulsup-corner-1f', 'popup', 'text', '/images/render-popup.jpg', '["통로 폭 1,100mm 확보", "진열대 간격 800mm 이상"]'::jsonb),
  ('r-seoulsup-corner-1f-cafe', 'seoulsup-corner-1f', 'cafe', 'text', '/images/render-cafe.jpg', '["통로 폭 900mm 확보", "좌석 22석 배치", "바 카운터 동선 겹침 없음"]'::jsonb),
  ('r-seoulsup-corner-1f-pilates', 'seoulsup-corner-1f', 'pilates', 'text', '/images/render-pilates.jpg', '["리포머 간격 700mm 확보", "거울 벽면 길이 충분"]'::jsonb),
  ('r-seongsu-stn-2f-cafe', 'seongsu-stn-2f', 'cafe', 'text', '/images/render-cafe.jpg', '["통로 폭 900mm 확보", "좌석 22석 배치", "바 카운터 동선 겹침 없음"]'::jsonb),
  ('r-seongsu-stn-2f-pilates', 'seongsu-stn-2f', 'pilates', 'text', '/images/render-pilates.jpg', '["리포머 간격 700mm 확보", "거울 벽면 길이 충분"]'::jsonb),
  ('r-seongsu-stn-2f-popup', 'seongsu-stn-2f', 'popup', 'text', '/images/render-popup.jpg', '["통로 폭 1,100mm 확보", "진열대 간격 800mm 이상"]'::jsonb);

insert into render_items (render_id, product_id, n, x, y, qty, similarity) values
  ('r-seongsu-2ga-1f-cafe', 'chair-oak', 1, 32, 66, 22, 0.93),
  ('r-seongsu-2ga-1f-cafe', 'table-2p', 2, 52, 70, 11, 0.9),
  ('r-seongsu-2ga-1f-cafe', 'counter-bar', 3, 70, 46, 1, 0.88),
  ('r-seongsu-2ga-1f-cafe', 'lamp-pendant', 4, 48, 20, 6, 0.91),
  ('r-seongsu-2ga-1f-cafe', 'espresso-machine', 5, 80, 60, 1, 0.86),
  ('r-seongsu-2ga-1f-cafe', 'fridge-showcase', 6, 86, 38, 1, 0.87),
  ('r-seongsu-2ga-1f-popup', 'shelf-display', 1, 40, 60, 6, 0.89),
  ('r-seongsu-2ga-1f-popup', 'lamp-pendant', 2, 60, 24, 4, 0.9),
  ('r-seongsu-2ga-1f-popup', 'counter-bar', 3, 72, 66, 1, 0.85),
  ('r-seongsu-2ga-1f-pilates', 'reformer', 1, 36, 68, 8, 0.92),
  ('r-seongsu-2ga-1f-pilates', 'mirror-wall', 2, 78, 40, 4, 0.9),
  ('r-seongsu-2ga-1f-pilates', 'lamp-pendant', 3, 50, 18, 5, 0.88),
  ('r-ttukseom-1f-pilates', 'reformer', 1, 36, 68, 8, 0.92),
  ('r-ttukseom-1f-pilates', 'mirror-wall', 2, 78, 40, 4, 0.9),
  ('r-ttukseom-1f-pilates', 'lamp-pendant', 3, 50, 18, 5, 0.88),
  ('r-ttukseom-1f-cafe', 'chair-oak', 1, 32, 66, 22, 0.93),
  ('r-ttukseom-1f-cafe', 'table-2p', 2, 52, 70, 11, 0.9),
  ('r-ttukseom-1f-cafe', 'counter-bar', 3, 70, 46, 1, 0.88),
  ('r-ttukseom-1f-cafe', 'lamp-pendant', 4, 48, 20, 6, 0.91),
  ('r-ttukseom-1f-cafe', 'espresso-machine', 5, 80, 60, 1, 0.86),
  ('r-ttukseom-1f-cafe', 'fridge-showcase', 6, 86, 38, 1, 0.87),
  ('r-ttukseom-1f-popup', 'shelf-display', 1, 40, 60, 6, 0.89),
  ('r-ttukseom-1f-popup', 'lamp-pendant', 2, 60, 24, 4, 0.9),
  ('r-ttukseom-1f-popup', 'counter-bar', 3, 72, 66, 1, 0.85),
  ('r-seoulsup-corner-1f-popup', 'shelf-display', 1, 40, 60, 6, 0.89),
  ('r-seoulsup-corner-1f-popup', 'lamp-pendant', 2, 60, 24, 4, 0.9),
  ('r-seoulsup-corner-1f-popup', 'counter-bar', 3, 72, 66, 1, 0.85),
  ('r-seoulsup-corner-1f-cafe', 'chair-oak', 1, 32, 66, 22, 0.93),
  ('r-seoulsup-corner-1f-cafe', 'table-2p', 2, 52, 70, 11, 0.9),
  ('r-seoulsup-corner-1f-cafe', 'counter-bar', 3, 70, 46, 1, 0.88),
  ('r-seoulsup-corner-1f-cafe', 'lamp-pendant', 4, 48, 20, 6, 0.91),
  ('r-seoulsup-corner-1f-cafe', 'espresso-machine', 5, 80, 60, 1, 0.86),
  ('r-seoulsup-corner-1f-cafe', 'fridge-showcase', 6, 86, 38, 1, 0.87),
  ('r-seoulsup-corner-1f-pilates', 'reformer', 1, 36, 68, 8, 0.92),
  ('r-seoulsup-corner-1f-pilates', 'mirror-wall', 2, 78, 40, 4, 0.9),
  ('r-seoulsup-corner-1f-pilates', 'lamp-pendant', 3, 50, 18, 5, 0.88),
  ('r-seongsu-stn-2f-cafe', 'chair-oak', 1, 32, 66, 22, 0.93),
  ('r-seongsu-stn-2f-cafe', 'table-2p', 2, 52, 70, 11, 0.9),
  ('r-seongsu-stn-2f-cafe', 'counter-bar', 3, 70, 46, 1, 0.88),
  ('r-seongsu-stn-2f-cafe', 'lamp-pendant', 4, 48, 20, 6, 0.91),
  ('r-seongsu-stn-2f-cafe', 'espresso-machine', 5, 80, 60, 1, 0.86),
  ('r-seongsu-stn-2f-cafe', 'fridge-showcase', 6, 86, 38, 1, 0.87),
  ('r-seongsu-stn-2f-pilates', 'reformer', 1, 36, 68, 8, 0.92),
  ('r-seongsu-stn-2f-pilates', 'mirror-wall', 2, 78, 40, 4, 0.9),
  ('r-seongsu-stn-2f-pilates', 'lamp-pendant', 3, 50, 18, 5, 0.88),
  ('r-seongsu-stn-2f-popup', 'shelf-display', 1, 40, 60, 6, 0.89),
  ('r-seongsu-stn-2f-popup', 'lamp-pendant', 2, 60, 24, 4, 0.9),
  ('r-seongsu-stn-2f-popup', 'counter-bar', 3, 72, 66, 1, 0.85);

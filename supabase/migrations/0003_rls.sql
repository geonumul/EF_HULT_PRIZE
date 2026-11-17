-- 행 단위 보안(RLS). 모든 테이블을 켜고, 본인 소유 데이터만 읽고 쓰게 한다.
-- 공개 조회 대상은 공실, 공간, 적합성, 렌더링, 상품, 판매처 링크, 후기다.
-- backend는 서비스 권한으로 접속해 RLS를 지나가므로, 소유자 확인은 backend 코드에서 한다.
-- 이 정책은 브라우저가 Supabase에 직접 접근할 때를 지킨다.

alter table users enable row level security;
alter table vendors enable row level security;
alter table listings enable row level security;
alter table spaces enable row level security;
alter table suitability enable row level security;
alter table products enable row level security;
alter table product_links enable row level security;
alter table renders enable row level security;
alter table render_items enable row level security;
alter table quotes enable row level security;
alter table orders enable row level security;
alter table render_jobs enable row level security;
alter table render_boards enable row level security;
alter table render_board_items enable row level security;
alter table demolition_requests enable row level security;
alter table demolition_bids enable row level security;
alter table reviews enable row level security;
alter table link_clicks enable row level security;

-- 로그인 사용자가 소유한 업체 id 목록
create function my_vendor_ids() returns setof text
language sql stable security definer set search_path = public as $$
  select id from vendors where owner_id = auth.uid()
$$;

-- 현재 사용자의 역할. 정책 안에서 users를 직접 조회하면 정책이 자기 자신을 부르므로 함수로 읽는다.
create function my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid()
$$;

-- users: 본인 행만. 역할은 본인이 바꿀 수 없다.
create policy users_select_own on users for select using (id = auth.uid());
create policy users_update_own on users for update using (id = auth.uid())
  with check (id = auth.uid() and role = my_role());

-- vendors: 소유자만
create policy vendors_select_own on vendors for select using (owner_id = auth.uid());
create policy vendors_update_own on vendors for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- listings: 누구나 조회, 소유자만 쓰기
create policy listings_select_public on listings for select using (true);
create policy listings_insert_own on listings for insert with check (owner_id = auth.uid());
create policy listings_update_own on listings for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy listings_delete_own on listings for delete using (owner_id = auth.uid());

-- spaces: 누구나 조회, 공실 소유자만 쓰기
create policy spaces_select_public on spaces for select using (true);
create policy spaces_write_owner on spaces for all
  using (exists (select 1 from listings l where l.id = spaces.listing_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from listings l where l.id = spaces.listing_id and l.owner_id = auth.uid()));

-- suitability, renders, render_items: 누구나 조회. 쓰기는 서비스 권한만 한다. (정책 없음)
create policy suitability_select_public on suitability for select using (true);
create policy renders_select_public on renders for select using (true);
create policy render_items_select_public on render_items for select using (true);

-- products, product_links: 누구나 조회, 소유 업체만 쓰기
create policy products_select_public on products for select using (true);
create policy products_write_vendor on products for all
  using (vendor_id in (select my_vendor_ids())) with check (vendor_id in (select my_vendor_ids()));
create policy product_links_select_public on product_links for select using (true);
create policy product_links_write_vendor on product_links for all
  using (exists (select 1 from products p where p.id = product_links.product_id and p.vendor_id in (select my_vendor_ids())))
  with check (exists (select 1 from products p where p.id = product_links.product_id and p.vendor_id in (select my_vendor_ids())));

-- quotes, orders, render_jobs, render_boards: 본인 것만 읽고 쓴다.
-- orders와 render_jobs는 결제 승인과 진행 갱신을 서버가 하므로 브라우저에는 읽기만 열어 둔다.
create policy quotes_own on quotes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy orders_select_own on orders for select using (user_id = auth.uid());
create policy render_jobs_select_own on render_jobs for select using (user_id = auth.uid());
create policy render_jobs_insert_own on render_jobs for insert with check (user_id = auth.uid());
create policy render_boards_own on render_boards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy render_board_items_own on render_board_items for all
  using (exists (select 1 from render_boards b where b.id = render_board_items.board_id and b.user_id = auth.uid()))
  with check (exists (select 1 from render_boards b where b.id = render_board_items.board_id and b.user_id = auth.uid()));

-- 철거 요청: 요청자 본인, 그리고 요청을 전달받은 업체가 읽는다.
create policy demolition_requests_own on demolition_requests for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy demolition_requests_select_vendor on demolition_requests for select
  using (vendor_ids && array(select my_vendor_ids()));

-- 철거 견적: 업체는 자기 견적을 쓰고 읽고, 요청자는 받은 견적을 읽는다. 선택(accepted)은 서버가 처리한다.
create policy demolition_bids_vendor on demolition_bids for all
  using (vendor_id in (select my_vendor_ids())) with check (vendor_id in (select my_vendor_ids()));
create policy demolition_bids_select_requester on demolition_bids for select
  using (exists (select 1 from demolition_requests r where r.id = demolition_bids.request_id and r.user_id = auth.uid()));

-- reviews: 누구나 조회, 작성자만 쓰기
create policy reviews_select_public on reviews for select using (true);
create policy reviews_insert_own on reviews for insert with check (user_id = auth.uid());

-- link_clicks: 정책 없음. 서비스 권한(backend)만 기록하고 읽는다.

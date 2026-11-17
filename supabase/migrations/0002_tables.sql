-- 테이블. Figma "08 Backend · Data"의 데이터 모델과 docs/FEATURES.md의 데이터 변경 표를 따른다.
-- 금액 단위: listings의 deposit, rent, costs는 만원. 상품, 견적, 주문, 철거 금액은 원.
-- 공실, 공간, 상품, 판매처 링크, 렌더링은 프론트 가짜 데이터와 id를 맞추려고 text id를 쓴다.
-- 공간(spaces)은 공실마다 하나이고 id가 공실 id와 같다. (프론트 경로 /space/<공실id>)

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'partner', 'admin')),
  phone text,
  email text,
  created_at timestamptz not null default now()
);

-- 가입하면 users 행을 만든다.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create table vendors (
  id text primary key,
  owner_id uuid references users (id),
  name text not null,
  type text not null check (type in ('supplier', 'used', 'construction', 'demolition')),
  commission_rate numeric(5, 4),
  created_at timestamptz not null default now()
);

create table listings (
  id text primary key,
  owner_id uuid references users (id),
  tag text not null,
  address text not null,
  nearby text not null default '',
  geom geography (point, 4326) not null,
  area_m2 numeric(8, 2) not null,
  floor integer not null,
  ceiling_h numeric(4, 2) not null,
  deposit integer not null default 0,
  rent integer not null default 0,
  building_use text not null default '',
  thumbnail text not null default '',
  costs jsonb not null default '{}',  -- 업종별 창업비(만원). 예: {"cafe": 4200}
  created_at timestamptz not null default now()
);
create index listings_geom_idx on listings using gist (geom);

create table spaces (
  id text primary key,
  listing_id text not null references listings (id) on delete cascade,
  photos text[] not null default '{}',
  dimensions jsonb,
  layout_3d text,
  condition text not null default 'vacant' check (condition in ('vacant', 'has_fixtures', 'occupied'))
);
create index spaces_listing_idx on spaces (listing_id);

create table suitability (
  id uuid primary key default gen_random_uuid(),
  space_id text not null references spaces (id) on delete cascade,
  use_type text not null,
  result text not null check (result in ('possible', 'conditional', 'impossible')),
  reason text,
  extra_cost bigint not null default 0,  -- 추가 설비비(원)
  unique (space_id, use_type)
);

create table products (
  id text primary key,
  vendor_id text references vendors (id),
  name text not null,
  category text not null,
  width_mm integer not null,
  depth_mm integer not null,
  height_mm integer not null,
  spec jsonb not null default '{}',
  price integer not null,
  used_price integer,
  image_url text not null default '',
  embedding vector (512),  -- CLIP 이미지 임베딩. 모델을 바꾸면 차원도 바꾼다.
  created_at timestamptz not null default now()
);
create index products_category_idx on products (category);
create index products_embedding_idx on products using hnsw (embedding vector_cosine_ops);

create table product_links (
  id text primary key,
  product_id text not null references products (id) on delete cascade,
  source text not null check (source in ('naver', 'coupang', 'partner', 'used')),
  label text not null,
  url text not null,
  affiliate_url text,
  price integer not null,
  checked_at timestamptz,
  status text not null default 'live' check (status in ('live', 'soldout', 'dead'))
);
create index product_links_product_idx on product_links (product_id);

create table renders (
  id text primary key,
  space_id text not null references spaces (id) on delete cascade,
  use_type text not null,
  style text,
  mode text not null default 'text' check (mode in ('text', 'products')),
  prompt text,
  image_url text not null default '',
  checks jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index renders_space_idx on renders (space_id);

create table render_items (
  id uuid primary key default gen_random_uuid(),
  render_id text not null references renders (id) on delete cascade,
  product_id text not null references products (id),
  n integer not null,  -- 화면에 보이는 태그 번호
  x numeric(5, 2) not null,  -- 이미지 안 위치(%)
  y numeric(5, 2) not null,
  bbox jsonb,
  qty integer not null default 1,
  similarity numeric(4, 3)  -- 이미지 먼저 방식에서만
);
create index render_items_render_idx on render_items (render_id);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  render_id text not null references renders (id),
  user_id uuid not null references users (id),
  total bigint not null,
  breakdown jsonb not null,  -- 견적서 전체. items, facility, construction, demolition 그룹을 담는다.
  used_product_ids text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'paid')),
  created_at timestamptz not null default now(),
  unique (user_id, render_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes (id),
  user_id uuid not null references users (id),
  vendor_id text references vendors (id),
  order_id text not null unique,  -- 토스페이먼츠 orderId
  payment_key text,
  amount bigint not null,
  paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled'))
);

create table render_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  mode text not null default 'text' check (mode in ('text', 'products')),
  listing_id text not null references listings (id),
  use_type text not null,
  prompt text not null default '',
  product_ids text[] not null default '{}',
  items jsonb not null default '[]',  -- 상품 먼저 방식의 [{productId, qty}]
  result_render_id text references renders (id),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table render_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  space_id text references spaces (id),
  use_type text
);

create table render_board_items (
  board_id uuid not null references render_boards (id) on delete cascade,
  product_id text not null references products (id),
  qty integer not null default 1 check (qty > 0),
  primary key (board_id, product_id)
);

create table demolition_requests (
  id uuid primary key default gen_random_uuid(),
  space_id text not null references spaces (id),
  user_id uuid not null references users (id),
  scope jsonb not null default '{}',  -- 천장, 바닥, 벽체, 설비, 간판
  note text not null default '',
  vendor_ids text[] not null default '{}',  -- 요청을 전달받은 업체(최대 3곳)
  status text not null default 'open' check (status in ('open', 'accepted', 'done', 'canceled')),
  accepted_bid_id uuid,
  created_at timestamptz not null default now()
);

create table demolition_bids (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references demolition_requests (id) on delete cascade,
  vendor_id text not null references vendors (id),
  amount bigint not null,
  start_date date,
  scope_note text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (request_id, vendor_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id text not null references vendors (id),
  request_id uuid references demolition_requests (id),
  user_id uuid not null references users (id),
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now()
);

-- /go/{link_id} 클릭 기록. 수수료 정산 근거다.
create table link_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id text not null references product_links (id),
  user_id uuid references users (id),
  clicked_at timestamptz not null default now()
);
create index link_clicks_link_idx on link_clicks (link_id);

-- 공실 후보. 공공 데이터(건축물대장과 상가정보)로 찾은 "비어 있을 가능성이 있는 상가 층"이다.
-- 임대 여부는 알 수 없는 추정이라 listings와 따로 둔다. 현장이나 중개사가 확인하면 status를 바꾼다.
-- 찾는 방법과 정확도 계획은 docs/DATA_AND_AI.md를 따른다.

create table vacancy_candidates (
  id text primary key,                 -- "<지번코드>-<층>". 같은 층을 다시 찾아도 한 행으로 남는다.
  address text not null,               -- 지번 주소
  building_name text not null default '',
  floor integer not null,
  floor_use text not null default '',  -- 건축물대장 층별 주용도. 예: 소매점
  floor_detail text not null default '', -- 층별 용도 설명. 예: 제1종근린생활시설(소매점)
  floor_area_m2 numeric(8, 2),
  building_use text not null default '', -- 건축물대장 표제부 주용도
  stores_on_floor integer not null default 0,   -- 같은 층에서 영업 중으로 확인된 점포 수
  unknown_floor_stores integer not null default 0, -- 같은 번지에서 층 정보가 비어 있는 점포 수. 많을수록 불확실하다.
  confidence numeric(3, 2) not null default 0.50,  -- 0~1. 높을수록 비어 있을 가능성이 크다.
  reasons text[] not null default '{}',
  geom geography (point, 4326) not null,
  status text not null default 'candidate' check (status in ('candidate', 'confirmed', 'rejected')),
  found_at timestamptz not null default now(),
  checked_at timestamptz
);
create index vacancy_candidates_geom_idx on vacancy_candidates using gist (geom);
create index vacancy_candidates_status_idx on vacancy_candidates (status);

alter table vacancy_candidates enable row level security;
create policy vacancy_candidates_select_public on vacancy_candidates for select using (status <> 'rejected');

-- ===================================================================
-- COZAMA (cozama_project_DB) 스키마
-- 신규(fresh) 프로젝트 기준 전체 스키마. 이미 적용된 라이브 DB에는
-- supabase/migrations/ 하위의 증분 마이그레이션 파일을 순서대로 적용한다.
-- Supabase MCP가 연결된 세션에서는 execute_sql / apply_migration으로,
-- 그렇지 않으면 Supabase 대시보드 SQL Editor에서 직접 실행한다.
-- ===================================================================

-- ---------------------------------------------------------------
-- 0. 확장
-- ---------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- 1. profiles (회원)
-- ---------------------------------------------------------------
create sequence if not exists member_no_seq start 1;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  member_no text unique,
  user_id text unique,
  name text,
  email text,
  phone text,
  phone2 text,
  zipcode text,
  address text,
  address_detail text,
  gender text,
  birth_date date,
  birth_type text default 'solar',
  region text,
  marketing_agree jsonb default '{}'::jsonb,
  points_balance integer not null default 0,
  created_at timestamptz not null default now()
);

-- auth.users 가입 시 profiles stub 자동 생성
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- profiles insert 시 member_no 채번 + 웰컴쿠폰 자동 발급
create or replace function handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_welcome_coupon_id uuid;
begin
  new.member_no := 'M-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('member_no_seq')::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists before_profile_insert on profiles;
create trigger before_profile_insert
  before insert on profiles
  for each row execute function handle_new_profile();

create or replace function issue_welcome_coupon()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon_id uuid;
begin
  select id into v_coupon_id from coupons where code = 'WELCOME10' limit 1;
  if v_coupon_id is not null then
    insert into user_coupons (user_id, coupon_id) values (new.id, v_coupon_id);
  end if;
  return new;
end;
$$;

drop trigger if exists after_profile_insert on profiles;
create trigger after_profile_insert
  after insert on profiles
  for each row execute function issue_welcome_coupon();

-- ---------------------------------------------------------------
-- 2. products
-- ---------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  product_code text unique not null,
  name text not null,
  price integer not null,
  category text,               -- women / men
  is_new boolean not null default false,
  is_best boolean not null default false,
  is_sale boolean not null default false,
  description text,
  thumbnail_main text,
  thumbnail_hover text,
  size text default 'FREE',
  stock integer not null default 999,
  detail_images text[] default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 3. cart_items / wishlist
-- ---------------------------------------------------------------
create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  option text default 'FREE',
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------------------------------------------------------------
-- 4. coupons / user_coupons
-- ---------------------------------------------------------------
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  discount_type text not null default 'percent', -- percent | fixed
  discount_value integer not null,
  min_order_amount integer default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

insert into coupons (code, name, discount_type, discount_value, min_order_amount)
values ('WELCOME10', '웰컴 10% 할인 쿠폰', 'percent', 10, 0)
on conflict (code) do nothing;

create table if not exists user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  coupon_id uuid not null references coupons(id) on delete cascade,
  is_used boolean not null default false,
  issued_at timestamptz not null default now(),
  used_at timestamptz
);

-- ---------------------------------------------------------------
-- 5. orders / order_items
-- ---------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  user_id uuid references profiles(id) on delete cascade, -- null이면 비회원 주문
  status text not null default '입금전', -- 입금전/배송준비중/배송중/배송완료/취소/교환/반품
  guest_name text,     -- 비회원 주문자명
  guest_phone text,    -- 비회원 연락처
  guest_password text, -- 비회원 주문조회 비밀번호 (crypt() 해시 저장, RPC로만 조회/생성)
  receiver_name text,
  receiver_phone text,
  address text,
  address_detail text,
  delivery_message text,
  payment_method text,
  bank_name text,
  depositor_name text,
  coupon_id uuid references coupons(id),
  discount_amount integer not null default 0,
  points_used integer not null default 0,
  points_earned integer not null default 0,
  shipping_fee integer not null default 3500,
  total_amount integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text,
  option text,
  price integer,
  quantity integer not null default 1
);

alter table orders drop constraint if exists orders_member_or_guest;
alter table orders add constraint orders_member_or_guest check (
  (user_id is not null)
  or (guest_name is not null and guest_phone is not null and guest_password is not null)
);

-- ---------------------------------------------------------------
-- 6. points (원장)
-- ---------------------------------------------------------------
create table if not exists points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount integer not null,     -- +적립 / -사용
  reason text,
  order_id uuid references orders(id),
  created_at timestamptz not null default now()
);

create or replace function sync_points_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set points_balance = points_balance + new.amount where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists after_points_insert on points;
create trigger after_points_insert
  after insert on points
  for each row execute function sync_points_balance();

-- ---------------------------------------------------------------
-- 7. reviews
-- ---------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  order_item_id uuid references order_items(id),
  rating smallint not null check (rating between 1 and 5),
  title text,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 8. inquiries / inquiry_replies
-- ---------------------------------------------------------------
create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  content text not null,
  is_secret boolean not null default false,
  status text not null default '답변대기', -- 답변대기 | 답변완료
  created_at timestamptz not null default now()
);

create table if not exists inquiry_replies (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references inquiries(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 9. notices
-- ---------------------------------------------------------------
create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- ===================================================================
-- RPC 함수
-- ===================================================================

-- 로그인용: user_id(아이디) -> email 조회
create or replace function get_email_by_user_id(p_user_id text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from profiles where user_id = p_user_id limit 1;
$$;

-- 아이디 찾기: 이름 + (이메일 또는 휴대폰) -> user_id 조회
create or replace function find_user_id(p_name text, p_email text, p_phone text)
returns text
language sql
security definer
set search_path = public
as $$
  select user_id from profiles
  where name = p_name
    and (
      (p_email is not null and email = p_email)
      or (p_phone is not null and phone = p_phone)
    )
  limit 1;
$$;

grant execute on function get_email_by_user_id(text) to anon, authenticated;
grant execute on function find_user_id(text, text, text) to anon, authenticated;

-- 회원가입용: 아이디 중복 확인 (비로그인 상태에서 profiles.user_id 존재 여부만 확인)
create or replace function is_user_id_available(p_user_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from profiles where user_id = p_user_id);
$$;

grant execute on function is_user_id_available(text) to anon, authenticated;

-- 비회원 주문 생성 (비밀번호 crypt() 해시 저장, orders + order_items 함께 insert)
create or replace function create_guest_order(
  p_order_no text,
  p_guest_name text,
  p_guest_phone text,
  p_guest_password text,
  p_receiver_name text,
  p_receiver_phone text,
  p_address text,
  p_address_detail text,
  p_delivery_message text,
  p_payment_method text,
  p_bank_name text,
  p_depositor_name text,
  p_shipping_fee integer,
  p_total_amount integer,
  p_items jsonb
)
returns table (id uuid, order_no text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  insert into orders (
    order_no, user_id, status, guest_name, guest_phone, guest_password,
    receiver_name, receiver_phone, address, address_detail, delivery_message,
    payment_method, bank_name, depositor_name, shipping_fee, total_amount
  ) values (
    p_order_no, null, '입금전', p_guest_name, p_guest_phone, crypt(p_guest_password, gen_salt('bf')),
    p_receiver_name, p_receiver_phone, p_address, p_address_detail, p_delivery_message,
    p_payment_method, p_bank_name, p_depositor_name, p_shipping_fee, p_total_amount
  ) returning orders.id into v_order_id;

  insert into order_items (order_id, product_id, product_name, option, price, quantity)
  select v_order_id, (item->>'product_id')::uuid, item->>'product_name', item->>'option',
         (item->>'price')::integer, (item->>'quantity')::integer
  from jsonb_array_elements(p_items) as item;

  return query select v_order_id, p_order_no;
end;
$$;

grant execute on function create_guest_order(
  text, text, text, text, text, text, text, text, text, text, text, text, integer, integer, jsonb
) to anon, authenticated;

-- 비회원 주문 조회 (주문자명 + 주문번호 + 비밀번호 검증, guest_password 원문은 응답에서 제외)
create or replace function get_guest_order(p_order_no text, p_guest_name text, p_guest_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_items jsonb;
begin
  select * into v_order from orders
  where order_no = p_order_no
    and guest_name = p_guest_name
    and user_id is null
    and guest_password is not null
    and guest_password = crypt(p_guest_password, guest_password);

  if v_order.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(oi), '[]'::jsonb) into v_items
  from order_items oi where oi.order_id = v_order.id;

  return jsonb_build_object(
    'order', to_jsonb(v_order) - 'guest_password',
    'items', v_items
  );
end;
$$;

grant execute on function get_guest_order(text, text, text) to anon, authenticated;

-- ===================================================================
-- RLS (Row Level Security)
-- ===================================================================
alter table profiles enable row level security;
alter table products enable row level security;
alter table cart_items enable row level security;
alter table wishlist enable row level security;
alter table coupons enable row level security;
alter table user_coupons enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table points enable row level security;
alter table reviews enable row level security;
alter table inquiries enable row level security;
alter table inquiry_replies enable row level security;
alter table notices enable row level security;

-- 공개 읽기
create policy "products_public_read" on products for select using (true);
create policy "coupons_public_read" on coupons for select using (true);
create policy "reviews_public_read" on reviews for select using (true);
create policy "notices_public_read" on notices for select using (true);
create policy "inquiries_public_read" on inquiries for select using (true);
create policy "inquiry_replies_public_read" on inquiry_replies for select using (true);

-- 본인 데이터만 CRUD
create policy "profiles_self_select" on profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);

create policy "cart_items_self_all" on cart_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wishlist_self_all" on wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_coupons_self_select" on user_coupons for select using (auth.uid() = user_id);
create policy "user_coupons_self_update" on user_coupons for update using (auth.uid() = user_id);

create policy "orders_self_all" on orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "order_items_self_select" on order_items for select using (
  exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy "order_items_self_insert" on order_items for insert with check (
  exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);

create policy "points_self_select" on points for select using (auth.uid() = user_id);
create policy "points_self_insert" on points for insert with check (auth.uid() = user_id);

create policy "reviews_self_insert" on reviews for insert with check (auth.uid() = user_id);
create policy "reviews_self_update" on reviews for update using (auth.uid() = user_id);
create policy "reviews_self_delete" on reviews for delete using (auth.uid() = user_id);

create policy "inquiries_self_insert" on inquiries for insert with check (auth.uid() = user_id);
create policy "inquiries_self_update" on inquiries for update using (auth.uid() = user_id);

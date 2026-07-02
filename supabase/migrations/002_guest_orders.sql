-- ===================================================================
-- COZAMA 비회원 주문(Guest Order) 마이그레이션
-- Supabase 대시보드 SQL Editor에서 그대로 실행한다.
-- (기존 orders 테이블이 이미 생성되어 있는 라이브 DB 기준 증분 패치)
-- ===================================================================

-- ---------------------------------------------------------------
-- 1. orders 테이블 : user_id nullable + 비회원 정보 컬럼
-- ---------------------------------------------------------------
alter table orders alter column user_id drop not null;

alter table orders add column if not exists guest_name text;
alter table orders add column if not exists guest_phone text;
alter table orders add column if not exists guest_password text;

alter table orders drop constraint if exists orders_member_or_guest;
alter table orders add constraint orders_member_or_guest check (
  (user_id is not null)
  or (guest_name is not null and guest_phone is not null and guest_password is not null)
);

-- ---------------------------------------------------------------
-- 2. RPC : 비회원 주문 생성
--    - 비밀번호는 pgcrypto(crypt/gen_salt)로 해시하여 저장
--    - security definer 로 RLS를 우회해 orders/order_items를 함께 insert
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- 3. RPC : 비회원 주문 조회 (주문자명 + 주문번호 + 비밀번호)
--    - 비밀번호는 crypt() 로 검증, guest_password 원문은 응답에서 제외
-- ---------------------------------------------------------------
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

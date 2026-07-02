-- ===================================================================
-- COZAMA 아이디 중복 확인 마이그레이션
-- Supabase 대시보드 SQL Editor에서 그대로 실행한다.
-- ===================================================================

-- profiles 테이블은 RLS로 본인 행만 select 가능하므로, 회원가입 화면(비로그인 상태)에서
-- 다른 사람의 user_id 존재 여부만 확인할 수 있도록 security definer RPC로 우회 제공한다.
create or replace function is_user_id_available(p_user_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from profiles where user_id = p_user_id);
$$;

grant execute on function is_user_id_available(text) to anon, authenticated;

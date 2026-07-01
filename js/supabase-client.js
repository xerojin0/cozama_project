/* ===================================================================
   COZAMA Supabase Client
   - anon key/URL은 RLS로 보호되는 공개 값이라 코드에 직접 둔다.
=================================================================== */
const SUPABASE_URL = 'https://vzviiniyeytjjhfyclzj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dmlpbml5ZXl0ampoZnljbHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjU2NjQsImV4cCI6MjA5NjgwMTY2NH0.CfYY8IkJmc0A6YPfX2xh651jPNvuaugkpTZ51fVjM54';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

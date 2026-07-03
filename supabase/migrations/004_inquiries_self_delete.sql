-- ===================================================================
-- COZAMA 상품문의(inquiries) 본인 삭제 허용
-- 기존에는 조회(공개)/작성/수정 정책만 있고 삭제 정책이 없어
-- 마이페이지 "내가 쓴 글"에서 문의글을 삭제할 수 없었다.
-- inquiry_replies.inquiry_id 는 ON DELETE CASCADE 이므로
-- 문의 삭제 시 달려있던 답변도 함께 삭제된다.
-- ===================================================================

create policy inquiries_self_delete on inquiries for delete using (auth.uid() = user_id);

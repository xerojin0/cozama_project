/* ===================================================================
   COZAMA board.js (notice / review / inquiry-write)
=================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  loadNoticeList();
  loadNoticeDetail();
  loadReviewGrid();
  initInquiryForm();
});

/* ---------------- NOTICE 목록 ---------------- */
async function loadNoticeList() {
  const tbody = document.getElementById('noticeTableBody');
  if (!tbody) return;

  const { data: notices } = await window.supabaseClient
    .from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });

  if (!notices || !notices.length) {
    tbody.innerHTML = '<tr><td colspan="2">등록된 공지사항이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = notices.map((n) => `
    <tr>
      <td class="title_cell"><a href="notice-detail.html?id=${n.id}">${n.is_pinned ? '<span class="board_pin">공지</span>' : ''}${n.title}</a></td>
      <td class="date_cell">${n.created_at ? n.created_at.slice(0, 10) : ''}</td>
    </tr>
  `).join('');
}

/* ---------------- NOTICE 상세 ---------------- */
async function loadNoticeDetail() {
  const titleEl = document.getElementById('noticeTitle');
  if (!titleEl) return;

  const id = new URLSearchParams(location.search).get('id');
  const { data: notice } = await window.supabaseClient.from('notices').select('*').eq('id', id).single();
  if (!notice) {
    document.getElementById('noticeContent').textContent = '게시글을 찾을 수 없습니다.';
    return;
  }
  titleEl.textContent = notice.title;
  document.getElementById('noticeDate').textContent = notice.created_at ? notice.created_at.slice(0, 10) : '';
  document.getElementById('noticeContent').textContent = notice.content;
}

/* ---------------- REVIEW 모아보기 ---------------- */
async function loadReviewGrid() {
  const grid = document.getElementById('reviewGrid');
  if (!grid) return;

  const { data: reviews } = await window.supabaseClient
    .from('reviews').select('*, products(*)').order('created_at', { ascending: false }).limit(40);

  if (!reviews || !reviews.length) {
    grid.style.display = 'none';
    document.getElementById('reviewEmptyState').style.display = 'block';
    return;
  }

  grid.innerHTML = reviews.map((r) => `
    <a href="product-detail.html?id=${r.products ? r.products.product_code : ''}#section-review" class="review_card">
      <div class="thumb_wrap"><img src="${r.products ? r.products.thumbnail_main : ''}" alt="리뷰 이미지"></div>
      <p class="review_product_name">${r.products ? r.products.name : ''}</p>
      <p class="review_rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</p>
      <p class="review_text">${r.content}</p>
    </a>
  `).join('');
}

/* ---------------- 상품문의 작성 ---------------- */
function initInquiryForm() {
  const form = document.getElementById('inquiryForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data } = await window.supabaseClient.auth.getSession();
    if (!data.session) { location.href = 'login.html'; return; }

    const productId = new URLSearchParams(location.search).get('product_id');
    const { error } = await window.supabaseClient.from('inquiries').insert({
      product_id: productId,
      user_id: data.session.user.id,
      title: document.getElementById('inquiryTitle').value,
      content: document.getElementById('inquiryContent').value,
      is_secret: document.getElementById('inquirySecret').checked,
      status: '답변대기',
    });

    if (error) { alert('문의 등록 중 오류가 발생했습니다.'); return; }
    alert('문의가 등록되었습니다.');
    history.back();
  });
}

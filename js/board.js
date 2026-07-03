/* ===================================================================
   COZAMA board.js (notice / review / inquiry-write)
=================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  loadNoticeList();
  loadNoticeDetail();
  loadReviewGrid();
  initInquiryForm();
  initReviewForm();
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

/* ---------------- 상품문의 작성 / 수정 ---------------- */
async function initInquiryForm() {
  const form = document.getElementById('inquiryForm');
  if (!form) return;

  const inquiryId = new URLSearchParams(location.search).get('id');
  const titleEl = document.getElementById('inquiryFormTitle');
  const titleInput = document.getElementById('inquiryTitle');
  const contentInput = document.getElementById('inquiryContent');
  const secretInput = document.getElementById('inquirySecret');
  const submitBtn = document.getElementById('inquirySubmitBtn');
  const deleteBtn = document.getElementById('inquiryDeleteBtn');

  if (inquiryId) {
    /* ---- 수정 모드 ---- */
    const { data } = await window.supabaseClient.auth.getSession();
    if (!data.session) { location.href = 'login.html'; return; }
    const user = data.session.user;

    const { data: inquiry } = await window.supabaseClient.from('inquiries').select('*').eq('id', inquiryId).single();
    if (!inquiry || inquiry.user_id !== user.id) {
      alert('문의글을 찾을 수 없습니다.');
      location.href = 'mypage.html';
      return;
    }
    if (inquiry.status === '답변완료') {
      alert('이미 답변이 완료된 문의는 수정/삭제할 수 없습니다.');
      location.href = 'mypage.html';
      return;
    }

    titleEl.textContent = '상품문의 수정';
    titleInput.value = inquiry.title;
    contentInput.value = inquiry.content;
    secretInput.checked = inquiry.is_secret;
    submitBtn.textContent = '문의 수정하기';
    deleteBtn.style.display = 'inline-flex';

    deleteBtn.addEventListener('click', async () => {
      if (!confirm('문의글을 삭제하시겠습니까?')) return;
      const { error } = await window.supabaseClient.from('inquiries').delete().eq('id', inquiryId);
      if (error) { alert('삭제 중 오류가 발생했습니다.'); return; }
      alert('문의글이 삭제되었습니다.');
      location.href = 'mypage.html';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await window.supabaseClient.from('inquiries').update({
        title: titleInput.value,
        content: contentInput.value,
        is_secret: secretInput.checked,
      }).eq('id', inquiryId);
      if (error) { alert('문의 수정 중 오류가 발생했습니다.'); return; }
      alert('문의글이 수정되었습니다.');
      location.href = 'mypage.html';
    });
    return;
  }

  /* ---- 작성 모드 ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data } = await window.supabaseClient.auth.getSession();
    if (!data.session) { location.href = 'login.html'; return; }

    const productId = new URLSearchParams(location.search).get('product_id');
    const { error } = await window.supabaseClient.from('inquiries').insert({
      product_id: productId,
      user_id: data.session.user.id,
      title: titleInput.value,
      content: contentInput.value,
      is_secret: secretInput.checked,
      status: '답변대기',
    });

    if (error) { alert('문의 등록 중 오류가 발생했습니다.'); return; }
    alert('문의가 등록되었습니다.');
    history.back();
  });
}

/* ---------------- REVIEW 작성 / 수정 (review-write.html) ---------------- */
async function initReviewForm() {
  const form = document.getElementById('reviewForm');
  if (!form) return;

  const { data } = await window.supabaseClient.auth.getSession();
  if (!data.session) { location.href = 'login.html'; return; }
  const user = data.session.user;

  const reviewId = new URLSearchParams(location.search).get('id');

  const titleEl = document.getElementById('reviewFormTitle');
  const productSelect = document.getElementById('reviewProductSelect');
  const productPickWrap = document.getElementById('productPickWrap');
  const productPickEmpty = document.getElementById('productPickEmpty');
  const productCard = document.getElementById('reviewProductCard');
  const productThumb = document.getElementById('reviewProductThumb');
  const productName = document.getElementById('reviewProductName');
  const productOption = document.getElementById('reviewProductOption');
  const ratingInput = document.getElementById('starRatingInput');
  const titleInput = document.getElementById('reviewTitle');
  const contentInput = document.getElementById('reviewContent');
  const submitBtn = document.getElementById('reviewSubmitBtn');
  const deleteBtn = document.getElementById('reviewDeleteBtn');

  let currentRating = 0;
  const setRating = (value) => {
    currentRating = value;
    ratingInput.querySelectorAll('.star_btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.value) <= value);
    });
  };
  ratingInput.querySelectorAll('.star_btn').forEach((btn) => {
    btn.addEventListener('click', () => setRating(Number(btn.dataset.value)));
  });

  const showProductCard = (thumb, name, option) => {
    productThumb.src = thumb || '';
    productName.textContent = name || '';
    productOption.textContent = option ? `옵션 : ${option}` : '';
    productCard.style.display = 'flex';
  };

  if (reviewId) {
    /* ---- 수정 모드 ---- */
    const { data: review } = await window.supabaseClient
      .from('reviews').select('*, products(name, thumbnail_main), order_items(option)')
      .eq('id', reviewId).single();

    if (!review || review.user_id !== user.id) {
      alert('리뷰를 찾을 수 없습니다.');
      location.href = 'mypage.html';
      return;
    }

    titleEl.textContent = '리뷰 수정';
    productPickWrap.style.display = 'none';
    showProductCard(review.products && review.products.thumbnail_main, review.products && review.products.name, review.order_items && review.order_items.option);
    setRating(review.rating);
    titleInput.value = review.title || '';
    contentInput.value = review.content;
    submitBtn.textContent = '리뷰 수정하기';
    deleteBtn.style.display = 'inline-flex';

    deleteBtn.addEventListener('click', async () => {
      if (!confirm('리뷰를 삭제하시겠습니까?')) return;
      const { error } = await window.supabaseClient.from('reviews').delete().eq('id', reviewId);
      if (error) { alert('삭제 중 오류가 발생했습니다.'); return; }
      alert('리뷰가 삭제되었습니다.');
      location.href = 'mypage.html';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentRating) { alert('평점을 선택해주세요.'); return; }
      const { error } = await window.supabaseClient.from('reviews').update({
        rating: currentRating,
        title: titleInput.value || null,
        content: contentInput.value,
      }).eq('id', reviewId);
      if (error) { alert('리뷰 수정 중 오류가 발생했습니다.'); return; }
      alert('리뷰가 수정되었습니다.');
      location.href = 'mypage.html';
    });
    return;
  }

  /* ---- 작성 모드 : 배송완료 상품 중 리뷰 미작성 건 ---- */
  const [{ data: orders }, { data: myReviews }] = await Promise.all([
    window.supabaseClient
      .from('orders')
      .select('order_no, status, order_items(id, product_id, product_name, option, products(name, thumbnail_main))')
      .eq('user_id', user.id).eq('status', '배송완료'),
    window.supabaseClient.from('reviews').select('order_item_id').eq('user_id', user.id),
  ]);

  const reviewedItemIds = new Set((myReviews || []).map((r) => r.order_item_id).filter(Boolean));
  const itemMap = {};
  const options = [];
  (orders || []).forEach((o) => {
    (o.order_items || []).forEach((item) => {
      if (!item.product_id || reviewedItemIds.has(item.id)) return;
      itemMap[item.id] = item;
      options.push(`<option value="${item.id}">[${o.order_no}] ${item.product_name}${item.option ? ' (' + item.option + ')' : ''}</option>`);
    });
  });

  if (!options.length) {
    productSelect.style.display = 'none';
    productPickEmpty.style.display = 'block';
    submitBtn.disabled = true;
    return;
  }

  productSelect.innerHTML = '<option value="">상품을 선택해주세요</option>' + options.join('');
  productSelect.addEventListener('change', () => {
    const item = itemMap[productSelect.value];
    if (!item) { productCard.style.display = 'none'; return; }
    showProductCard(item.products && item.products.thumbnail_main, item.products && item.products.name, item.option);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = itemMap[productSelect.value];
    if (!item) { alert('리뷰를 작성할 상품을 선택해주세요.'); return; }
    if (!currentRating) { alert('평점을 선택해주세요.'); return; }

    const { error } = await window.supabaseClient.from('reviews').insert({
      product_id: item.product_id,
      user_id: user.id,
      order_item_id: item.id,
      rating: currentRating,
      title: titleInput.value || null,
      content: contentInput.value,
    });
    if (error) { alert('리뷰 등록 중 오류가 발생했습니다.'); return; }
    alert('리뷰가 등록되었습니다.');
    location.href = 'review.html';
  });
}

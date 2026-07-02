/* ===================================================================
   COZAMA product-detail.js
=================================================================== */

let currentProduct = null;
let cartLines = []; // [{ option, qty }]

document.addEventListener('DOMContentLoaded', async () => {
  const code = new URLSearchParams(location.search).get('id');
  if (!code) return;

  const { data: product, error } = await window.supabaseClient
    .from('products').select('*').eq('product_code', code).single();

  if (error || !product) {
    document.querySelector('.detail_info').innerHTML = '<p class="body_text">상품 정보를 찾을 수 없습니다.</p>';
    return;
  }
  currentProduct = product;

  trackRecentView(product.product_code);
  renderProductInfo(product);
  renderGallery(product);
  renderTogetherBuy(product);
  renderDescFlow(product);
  initGuideAccordion();
  initOptionSelect(product);
  initActions(product);
  loadReviews(product.id);
  loadInquiries(product.id);
  initInquiryWriteLink(product.id);
});

function trackRecentView(code) {
  const list = JSON.parse(localStorage.getItem('cozama_recent_viewed') || '[]').filter((c) => c !== code);
  list.unshift(code);
  localStorage.setItem('cozama_recent_viewed', JSON.stringify(list.slice(0, 10)));
}

function renderProductInfo(p) {
  document.getElementById('pageTitleTag').textContent = `${p.name} | COZAMA`;
  document.getElementById('detailCategory').textContent = (p.category || 'HOMEWEAR').toUpperCase();
  document.getElementById('detailName').textContent = p.name;
  document.getElementById('detailPrice').textContent = `${Number(p.price).toLocaleString()}원`;
  document.getElementById('detailDesc').textContent = p.description || '';
}

function renderGallery(p) {
  const images = (p.detail_images && p.detail_images.length ? p.detail_images : [p.thumbnail_main]);
  const mainWrap = document.getElementById('mainSwiperWrapper');
  const thumbWrap = document.getElementById('thumbSwiperWrapper');

  mainWrap.innerHTML = images.map((src) => `<div class="swiper-slide"><img src="${src}" alt="${p.name}"></div>`).join('');
  thumbWrap.innerHTML = images.map((src) => `<div class="swiper-slide thumb_item"><img src="${src}" alt=""></div>`).join('');

  if (!window.Swiper) return;
  const thumbSwiper = new Swiper('.swiper-detail-thumbs', {
    slidesPerView: 'auto',
    spaceBetween: 20,
    watchSlidesProgress: true,
  });
  new Swiper('.swiper-detail-main', {
    autoHeight: true,
    thumbs: { swiper: thumbSwiper },
    navigation: {
      nextEl: '.detail_gallery_nav.next',
      prevEl: '.detail_gallery_nav.prev',
    },
    on: {
      slideChange(sw) {
        document.querySelectorAll('.thumb_item').forEach((el, i) => el.classList.toggle('active', i === sw.realIndex));
      },
    },
  });
  document.querySelectorAll('.thumb_item').forEach((el, i) => i === 0 && el.classList.add('active'));
}

async function renderTogetherBuy(p) {
  const { data: items } = await window.supabaseClient
    .from('products').select('*').neq('product_code', p.product_code).limit(4);
  const wrap = document.getElementById('togetherBuyList');
  if (!items || !items.length) { wrap.innerHTML = '<p class="body_text">추천 상품이 없습니다.</p>'; return; }
  wrap.innerHTML = items.map((item) => `
    <a href="product-detail.html?id=${item.product_code}" class="prod_card">
      <div class="thumb_wrap"><img src="${item.thumbnail_main}" alt="${item.name}"></div>
      <p class="prod_name" style="font-size:13px;">${item.name}</p>
      <p class="prod_price" style="font-size:13px;">${Number(item.price).toLocaleString()}원</p>
    </a>
  `).join('');
}

function renderDescFlow(p) {
  const images = p.detail_images && p.detail_images.length ? p.detail_images : [];
  document.getElementById('detailDescFlow').innerHTML = images.map((src) => `<img src="${src}" alt="상세이미지">`).join('');
}

function initGuideAccordion() {
  document.querySelectorAll('.guide_item').forEach((item) => {
    item.querySelector('.guide_head').addEventListener('click', () => item.classList.toggle('active'));
  });
}

function initOptionSelect(p) {
  const select = document.getElementById('optionSelect');
  select.addEventListener('change', () => {
    if (!select.value) return;
    const existing = cartLines.find((l) => l.option === select.value);
    if (existing) existing.qty += 1;
    else cartLines.push({ option: select.value, qty: 1 });
    renderSelectedOptions(p);
    select.value = '';
  });
}

function renderSelectedOptions(p) {
  const wrap = document.getElementById('selectedOptions');
  wrap.innerHTML = cartLines.map((line, idx) => `
    <div class="selected_option_row" data-idx="${idx}">
      <span>${line.option}</span>
      <div class="qty_control">
        <button type="button" class="qty_minus">-</button>
        <span>${line.qty}</span>
        <button type="button" class="qty_plus">+</button>
        <button type="button" class="qty_remove">✕</button>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('.qty_minus').forEach((btn) => btn.addEventListener('click', (e) => {
    const idx = Number(e.target.closest('.selected_option_row').dataset.idx);
    cartLines[idx].qty = Math.max(1, cartLines[idx].qty - 1);
    renderSelectedOptions(p);
  }));
  wrap.querySelectorAll('.qty_plus').forEach((btn) => btn.addEventListener('click', (e) => {
    const idx = Number(e.target.closest('.selected_option_row').dataset.idx);
    cartLines[idx].qty += 1;
    renderSelectedOptions(p);
  }));
  wrap.querySelectorAll('.qty_remove').forEach((btn) => btn.addEventListener('click', (e) => {
    const idx = Number(e.target.closest('.selected_option_row').dataset.idx);
    cartLines.splice(idx, 1);
    renderSelectedOptions(p);
  }));

  updateTotalAmount(p);
}

function updateTotalAmount(p) {
  const totalQty = cartLines.reduce((sum, l) => sum + l.qty, 0);
  document.getElementById('totalAmount').textContent = `${(totalQty * Number(p.price)).toLocaleString()}원`;
}

function initActions(p) {
  const wishBtn = document.getElementById('detailWishBtn');

  window.CozamaWishlist.getLikedIds([p.id]).then((likedIds) => {
    if (likedIds.has(p.id)) {
      wishBtn.classList.add('active');
      wishBtn.textContent = '♥ 좋아요';
    }
  });

  wishBtn.addEventListener('click', async () => {
    const isActive = wishBtn.classList.contains('active');
    const result = await window.CozamaWishlist.toggle(p.id, isActive);
    if (result === null) return;
    wishBtn.classList.toggle('active', result);
    wishBtn.textContent = result ? '♥ 좋아요' : '♡ 좋아요';
  });

  document.getElementById('detailShareBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(location.href).then(() => alert('상품 링크가 복사되었습니다.'));
  });

  document.getElementById('addCartBtn').addEventListener('click', async () => {
    if (!cartLines.length) { alert('옵션을 선택해주세요.'); return; }
    const { data } = await window.supabaseClient.auth.getSession();
    if (!data.session) {
      cartLines.forEach((l) => window.CozamaGuestCart.add(p.id, l.option, l.qty));
      window.CozamaCart.refreshBadge();
      alert('장바구니에 담았습니다.');
      return;
    }
    const rows = cartLines.map((l) => ({ user_id: data.session.user.id, product_id: p.id, option: l.option, quantity: l.qty }));
    await window.supabaseClient.from('cart_items').insert(rows);
    window.CozamaCart.refreshBadge();
    alert('장바구니에 담았습니다.');
  });

  document.getElementById('buyNowBtn').addEventListener('click', () => {
    if (!cartLines.length) { alert('옵션을 선택해주세요.'); return; }
    sessionStorage.setItem('cozama_buy_now', JSON.stringify({ product: p, lines: cartLines }));
    location.href = 'checkout.html?mode=buynow';
  });
}

async function loadReviews(productId) {
  const { data: reviews } = await window.supabaseClient
    .from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });

  document.getElementById('reviewCount').textContent = reviews ? reviews.length : 0;
  if (!reviews || !reviews.length) {
    document.getElementById('reviewEmpty').style.display = 'block';
    document.getElementById('avgScore').textContent = '0.0';
    return;
  }
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  document.getElementById('avgScore').textContent = avg.toFixed(1);
  document.getElementById('reviewList').innerHTML = reviews.map((r) => `
    <div class="review_row">
      <div>
        <p class="review_score">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</p>
        <p class="body_text">${r.content}</p>
        <p class="review_writer">${r.created_at ? r.created_at.slice(0, 10) : ''}</p>
      </div>
    </div>
  `).join('');
}

async function loadInquiries(productId) {
  const { data: inquiries } = await window.supabaseClient
    .from('inquiries').select('*').eq('product_id', productId).order('created_at', { ascending: false });

  document.getElementById('inquiryCount').textContent = inquiries ? inquiries.length : 0;
  if (!inquiries || !inquiries.length) {
    document.getElementById('inquiryEmpty').style.display = 'block';
    return;
  }
  document.getElementById('inquiryTableBody').innerHTML = inquiries.map((q) => `
    <tr>
      <td>${q.is_secret ? '🔒 비밀글입니다' : q.title}</td>
      <td>-</td>
      <td>${q.created_at ? q.created_at.slice(0, 10) : ''}</td>
      <td><span class="inquiry_status ${q.status === '답변완료' ? 'done' : 'wait'}">${q.status || '답변대기'}</span></td>
    </tr>
  `).join('');
}

function initInquiryWriteLink(productId) {
  document.getElementById('inquiryWriteBtn').addEventListener('click', (e) => {
    e.preventDefault();
    location.href = `inquiry-write.html?product_id=${productId}`;
  });
}

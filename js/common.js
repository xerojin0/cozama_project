/* ===================================================================
   COZAMA common.js
   - 햄버거 슬라이딩 메뉴 / GNB 아코디언 / 로그인 상태 UI
=================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initGnbSlideMenu();
  initGnbAccordion();
  initAuthState();
  initSearchOverlay();
  initQuickMenu();
  window.CozamaCart.refreshBadge();
});

/* ---- 햄버거 메뉴 열기/닫기 ---- */
function initGnbSlideMenu() {
  const openBtn = document.querySelector('.gnb_open_btn');
  const closeBtn = document.querySelector('.gnb_close_btn');
  const overlay = document.querySelector('.gnb_overlay');
  if (!overlay) return;

  const open = () => {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  openBtn && openBtn.addEventListener('click', open);
  closeBtn && closeBtn.addEventListener('click', close);
}

/* ---- SHOP / BOARD 1Depth 아코디언 ---- */
function initGnbAccordion() {
  const depthItems = document.querySelectorAll('.gnb_1depth');
  depthItems.forEach((item) => {
    const link = item.querySelector('.gnb_1depth_link');
    const sub = item.querySelector('.gnb_2depth');
    if (!sub) return; // 하위메뉴 없는 항목(ABOUT US, SALE, LOOKBOOK)은 그냥 이동
    link.addEventListener('click', (e) => {
      e.preventDefault();
      item.classList.toggle('active');
    });
  });
}

/* ---- 로그인 상태에 따라 GNB / 헤더 UI 토글 ---- */
async function initAuthState() {
  const authBox = document.querySelector('.gnb_auth');
  if (!authBox || !window.supabaseClient) return;

  const { data } = await window.supabaseClient.auth.getSession();
  const isLoggedIn = !!data.session;
  authBox.dataset.auth = isLoggedIn ? 'in' : 'out';

  const logoutBtn = authBox.querySelector('.logout_btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.supabaseClient.auth.signOut();
      location.href = 'index.html';
    });
  }
}

/* ---- 검색 오버레이 (전체 페이지 공통 헤더) ---- */
const SEARCH_HOT_KEYWORDS = ['잠옷세트', '홈웨어', '카디건', '라운지', '파자마'];

function initSearchOverlay() {
  const searchBtns = document.querySelectorAll('.icon_btn[aria-label="검색"]');
  if (!searchBtns.length || !window.supabaseClient) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'search_backdrop';

  const overlay = document.createElement('div');
  overlay.className = 'search_overlay';
  overlay.innerHTML = `
    <div class="search_overlay_inner">
      <button type="button" class="search_close_btn" aria-label="검색 닫기">✕</button>
      <div class="search_input_row">
        <input type="text" id="searchOverlayInput" placeholder="찾으시는 상품을 검색해보세요" autocomplete="off">
        <button type="button" class="search_submit_btn" aria-label="검색 실행"><img src="img/icon/search_icon.svg" alt=""></button>
      </div>
      <div class="search_hot_keywords" id="searchHotKeywords">
        <span class="hk_label">인기 검색어</span>
        ${SEARCH_HOT_KEYWORDS.map((k) => `<button type="button" data-keyword="${k}">${k}</button>`).join('')}
      </div>
      <div class="search_result_wrap" id="searchResultWrap"></div>
    </div>
  `;

  document.body.append(backdrop, overlay);

  const input = overlay.querySelector('#searchOverlayInput');
  const resultWrap = overlay.querySelector('#searchResultWrap');
  const hotKeywords = overlay.querySelector('#searchHotKeywords');

  const open = () => {
    const gnb = document.querySelector('.gnb_overlay');
    if (gnb) { gnb.classList.remove('active'); document.body.style.overflow = ''; }
    backdrop.classList.add('active');
    overlay.classList.add('active');
    input.focus();
  };
  const close = () => {
    backdrop.classList.remove('active');
    overlay.classList.remove('active');
    input.value = '';
    resultWrap.innerHTML = '';
    hotKeywords.style.display = 'flex';
  };

  searchBtns.forEach((btn) => btn.addEventListener('click', open));
  overlay.querySelector('.search_close_btn').addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) close();
  });

  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const keyword = input.value.trim();
    if (!keyword) {
      hotKeywords.style.display = 'flex';
      resultWrap.innerHTML = '';
      return;
    }
    hotKeywords.style.display = 'none';
    debounceTimer = setTimeout(() => runSearch(keyword, resultWrap), 300);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const keyword = input.value.trim();
    if (!keyword) return;
    location.href = `product-list.html?cate=all&search=${encodeURIComponent(keyword)}`;
  });

  overlay.querySelector('.search_submit_btn').addEventListener('click', () => {
    const keyword = input.value.trim();
    if (!keyword) return;
    location.href = `product-list.html?cate=all&search=${encodeURIComponent(keyword)}`;
  });

  hotKeywords.querySelectorAll('button[data-keyword]').forEach((btn) => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.keyword;
      hotKeywords.style.display = 'none';
      runSearch(btn.dataset.keyword, resultWrap);
    });
  });
}

async function runSearch(keyword, resultWrap) {
  const { data: products, count } = await window.supabaseClient
    .from('products')
    .select('*', { count: 'exact' })
    .ilike('name', `%${keyword}%`)
    .limit(8);

  if (!products || !products.length) {
    resultWrap.innerHTML = '<p class="search_empty">검색 결과가 없습니다.</p>';
    return;
  }

  resultWrap.innerHTML = products.map((p) => `
    <a href="product-detail.html?id=${p.product_code}" class="search_result_item">
      <img src="${p.thumbnail_main || ''}" alt="${p.name}">
      <div>
        <p class="sr_name">${p.name}</p>
        <p class="sr_price">${Number(p.price).toLocaleString()}원</p>
      </div>
    </a>
  `).join('') + `<a href="product-list.html?cate=all&search=${encodeURIComponent(keyword)}" class="search_view_all">'${keyword}' 검색결과 ${count || products.length}건 전체보기</a>`;
}

/* ---- 퀵메뉴 (위로/아래로 스무스 스크롤 + CS 안내) ---- */
function initQuickMenu() {
  const topBtn = document.querySelector('.quick_top');
  const bottomBtn = document.querySelector('.quick_bottom');
  const csBtn = document.querySelector('.quick_cs');
  if (!topBtn || !bottomBtn) return;

  const updateVisibility = () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    topBtn.classList.toggle('show', scrollY > 0);
    bottomBtn.classList.toggle('hide', scrollY >= maxScroll - 1);
  };

  topBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  bottomBtn.addEventListener('click', () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  });
  csBtn && csBtn.addEventListener('click', () => alert('상담시스템 준비중입니다.'));

  window.addEventListener('scroll', updateVisibility);
  window.addEventListener('resize', updateVisibility);
  updateVisibility();
}

/* ---- 좋아요(wishlist) 토글 공통 로직 ---- */
window.CozamaWishlist = {
  async getLikedIds(productIds) {
    const ids = [...new Set(productIds)].filter(Boolean);
    if (!ids.length) return new Set();
    const { data } = await window.supabaseClient.auth.getSession();
    if (!data.session) return new Set();
    const { data: rows } = await window.supabaseClient
      .from('wishlist').select('product_id')
      .eq('user_id', data.session.user.id)
      .in('product_id', ids);
    return new Set((rows || []).map((r) => r.product_id));
  },

  // 현재 active 상태(isActive)를 반대로 뒤집는다. 성공 시 새 상태(boolean), 실패/비로그인 시 null 반환
  async toggle(productId, isActive) {
    const { data } = await window.supabaseClient.auth.getSession();
    if (!data.session) { location.href = 'login.html'; return null; }

    if (isActive) {
      const { error } = await window.supabaseClient
        .from('wishlist').delete()
        .eq('user_id', data.session.user.id).eq('product_id', productId);
      return error ? null : false;
    }
    const { error } = await window.supabaseClient
      .from('wishlist').insert({ user_id: data.session.user.id, product_id: productId });
    return error ? null : true;
  },
};

/* ---- 헤더 장바구니 뱃지 (회원: cart_items 합계 / 비회원: localStorage 합계) ---- */
window.CozamaCart = {
  async getCount() {
    if (!window.supabaseClient) return 0;
    const { data } = await window.supabaseClient.auth.getSession();
    if (data.session) {
      const { data: items } = await window.supabaseClient
        .from('cart_items').select('quantity').eq('user_id', data.session.user.id);
      return (items || []).reduce((sum, i) => sum + i.quantity, 0);
    }
    return window.CozamaGuestCart.get().reduce((sum, i) => sum + i.quantity, 0);
  },

  async refreshBadge() {
    const badges = document.querySelectorAll('.cart_badge');
    if (!badges.length) return;
    const count = await this.getCount();
    badges.forEach((el) => {
      el.textContent = count > 99 ? '99+' : String(count);
      el.classList.toggle('show', count > 0);
    });
  },
};

/* ---- 비회원 장바구니 (localStorage) ---- */
window.CozamaGuestCart = {
  KEY: 'cozama_guest_cart',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
  },

  add(productId, option, quantity) {
    const items = this.get();
    const existing = items.find((i) => i.product_id === productId && i.option === option);
    if (existing) existing.quantity += quantity;
    else items.push({ product_id: productId, option: option || 'FREE', quantity });
    this.save(items);
  },

  updateQty(productId, option, quantity) {
    const items = this.get();
    const item = items.find((i) => i.product_id === productId && i.option === option);
    if (item) item.quantity = Math.max(1, quantity);
    this.save(items);
  },

  remove(productId, option) {
    this.save(this.get().filter((i) => !(i.product_id === productId && i.option === option)));
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },
};

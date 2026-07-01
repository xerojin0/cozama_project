/* ===================================================================
   COZAMA mypage.js
=================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const { data } = await window.supabaseClient.auth.getSession();
  if (!data.session) { location.href = 'login.html'; return; }
  const user = data.session.user;

  initSideNav();
  await loadProfile(user);
  await loadOrders(user);
  await loadPoints(user);
  await loadCoupons(user);
  await loadWishlist(user);
  await loadRecentViewed();
  await loadMyPosts(user);
  initProfileForm(user);
});

function initSideNav() {
  document.querySelectorAll('.mypage_nav a[data-panel]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.mypage_nav a[data-panel]').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.mypage_panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === link.dataset.panel));
    });
  });
}

let profileCache = null;

async function loadProfile(user) {
  const { data: profile } = await window.supabaseClient.from('profiles').select('*').eq('id', user.id).single();
  profileCache = profile;
  if (!profile) return;

  document.getElementById('sideMemberNo').textContent = profile.member_no || '-';
  document.getElementById('sideMemberName').textContent = profile.name || '-';

  document.getElementById('profileMemberNo').value = profile.member_no || '';
  document.getElementById('profileUserId').value = profile.user_id || '';
  document.getElementById('profileName').value = profile.name || '';
  document.getElementById('profileEmail').value = profile.email || user.email || '';
  document.getElementById('profilePhone').value = profile.phone || '';
  document.getElementById('profileAddress').value = profile.address || '';
}

function initProfileForm(user) {
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await window.supabaseClient.from('profiles').update({
      name: document.getElementById('profileName').value,
      phone: document.getElementById('profilePhone').value,
      address: document.getElementById('profileAddress').value,
    }).eq('id', user.id);
    alert(error ? '수정 중 오류가 발생했습니다.' : '개인정보가 수정되었습니다.');
  });
}

const STATUS_KEYS = { '입금전': '입금전', '배송준비중': '배송준비중', '배송중': '배송중', '배송완료': '배송완료' };

async function loadOrders(user) {
  const { data: orders } = await window.supabaseClient
    .from('orders').select('*, order_items(*)').eq('user_id', user.id).order('created_at', { ascending: false });

  const counts = { '입금전': 0, '배송준비중': 0, '배송중': 0, '배송완료': 0, '취소교환반품': 0 };
  (orders || []).forEach((o) => {
    if (STATUS_KEYS[o.status]) counts[o.status] += 1;
    else counts['취소교환반품'] += 1;
  });
  Object.keys(counts).forEach((key) => {
    const el = document.getElementById(`statusCount_${key}`);
    if (el) el.textContent = counts[key];
  });

  const tbody = document.getElementById('orderTableBody');
  if (!orders || !orders.length) {
    tbody.innerHTML = '<tr><td colspan="5">주문 내역이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map((o) => `
    <tr>
      <td>${o.order_no}</td>
      <td class="ellipsis">${(o.order_items || []).map((i) => i.product_name).join(', ')}</td>
      <td>${Number(o.total_amount).toLocaleString()}원</td>
      <td>${o.status}</td>
      <td>${o.created_at ? o.created_at.slice(0, 10) : ''}</td>
    </tr>
  `).join('');
}

async function loadPoints(user) {
  const { data: points } = await window.supabaseClient
    .from('points').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

  const balance = (points || []).reduce((sum, p) => sum + p.amount, 0);
  document.getElementById('pointsBalance').textContent = balance.toLocaleString();

  const tbody = document.getElementById('pointsTableBody');
  if (!points || !points.length) {
    tbody.innerHTML = '<tr><td colspan="3">적립금 내역이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = points.map((p) => `
    <tr>
      <td>${p.reason}</td>
      <td style="color:${p.amount < 0 ? 'var(--color-primary)' : 'inherit'}">${p.amount > 0 ? '+' : ''}${p.amount.toLocaleString()}P</td>
      <td>${p.created_at ? p.created_at.slice(0, 10) : ''}</td>
    </tr>
  `).join('');
}

async function loadCoupons(user) {
  const { data: coupons } = await window.supabaseClient
    .from('user_coupons').select('*, coupons(*)').eq('user_id', user.id).order('issued_at', { ascending: false });

  const tbody = document.getElementById('couponsTableBody');
  if (!coupons || !coupons.length) {
    tbody.innerHTML = '<tr><td colspan="4">보유하신 쿠폰이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = coupons.map((uc) => {
    const c = uc.coupons || {};
    const label = c.discount_type === 'percent' ? `${c.discount_value}%` : `${Number(c.discount_value).toLocaleString()}원`;
    return `
    <tr>
      <td>${c.name || ''}</td>
      <td>${label}</td>
      <td>${uc.issued_at ? uc.issued_at.slice(0, 10) : ''}</td>
      <td>${uc.is_used ? '사용완료' : '사용가능'}</td>
    </tr>`;
  }).join('');
}

async function loadWishlist(user) {
  const { data: items } = await window.supabaseClient
    .from('wishlist').select('*, products(*)').eq('user_id', user.id).order('created_at', { ascending: false });

  const grid = document.getElementById('wishlistGrid');
  if (!items || !items.length) {
    grid.innerHTML = '<p class="body_text">관심상품이 없습니다.</p>';
    return;
  }
  grid.innerHTML = items.map((i) => renderProductCard(i.products)).join('');
}

async function loadRecentViewed() {
  const codes = JSON.parse(localStorage.getItem('cozama_recent_viewed') || '[]');
  const grid = document.getElementById('recentViewGrid');
  if (!codes.length) {
    grid.innerHTML = '<p class="body_text">최근 본 상품이 없습니다.</p>';
    return;
  }
  const { data: items } = await window.supabaseClient.from('products').select('*').in('product_code', codes);
  const ordered = codes.map((c) => (items || []).find((i) => i.product_code === c)).filter(Boolean);
  grid.innerHTML = ordered.map(renderProductCard).join('');
}

function renderProductCard(p) {
  if (!p) return '';
  return `
    <a href="product-detail.html?id=${p.product_code}" class="rv_card">
      <img src="${p.thumbnail_main}" alt="${p.name}">
      <p class="prod_name">${p.name}</p>
      <p class="prod_price">${Number(p.price).toLocaleString()}원</p>
    </a>
  `;
}

async function loadMyPosts(user) {
  const { data: reviews } = await window.supabaseClient
    .from('reviews').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

  const tbody = document.getElementById('myPostsTableBody');
  if (!reviews || !reviews.length) {
    tbody.innerHTML = '<tr><td colspan="2">작성하신 글이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = reviews.map((r) => `
    <tr>
      <td class="ellipsis">${r.title || r.content}</td>
      <td>${r.created_at ? r.created_at.slice(0, 10) : ''}</td>
    </tr>
  `).join('');
}

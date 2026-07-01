/* ===================================================================
   COZAMA product-list.js
=================================================================== */

const PAGE_SIZE = 30;
const CATE_TITLE = { all: 'ALL', women: 'WOMEN', men: 'MEN', new: 'NEW ITEMS', best: 'BEST SELLERS', sale: 'SALE' };

document.addEventListener('DOMContentLoaded', () => {
  renderList();
  document.getElementById('sortSelect').addEventListener('change', () => renderList(1));
});

function getParams() {
  const params = new URLSearchParams(location.search);
  return {
    cate: params.get('cate') || 'all',
    page: Number(params.get('page') || 1),
  };
}

async function renderList(forcePage) {
  const { cate, page: pageFromUrl } = getParams();
  const page = forcePage || pageFromUrl;
  document.getElementById('listTitle').textContent = CATE_TITLE[cate] || 'ALL';

  const sort = document.getElementById('sortSelect').value;
  let query = window.supabaseClient.from('products').select('*', { count: 'exact' });

  if (cate === 'women' || cate === 'men') query = query.eq('category', cate);
  else if (cate === 'new') query = query.eq('is_new', true);
  else if (cate === 'best') query = query.eq('is_best', true);
  else if (cate === 'sale') query = query.eq('is_sale', true);

  if (sort === 'price_asc') query = query.order('price', { ascending: true });
  else if (sort === 'price_desc') query = query.order('price', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data: products, count, error } = await query;
  const grid = document.getElementById('prodListGrid');
  const emptyState = document.getElementById('emptyState');

  if (error || !products || products.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    document.getElementById('itemCount').textContent = 0;
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  emptyState.style.display = 'none';
  document.getElementById('itemCount').textContent = count || products.length;

  grid.innerHTML = products.map(renderCard).join('');
  bindCardActions(grid);
  renderPagination(cate, page, Math.ceil((count || 0) / PAGE_SIZE));
}

function renderCard(p) {
  const badge = p.is_new ? '<span class="badge list_badge">NEW</span>' : (p.is_best ? '<span class="badge list_badge">BEST</span>' : '');
  const hoverImg = p.thumbnail_hover ? `<img class="thumb_hover" src="${p.thumbnail_hover}" alt="">` : '';
  return `
    <div class="list_card" data-id="${p.id}">
      <a href="product-detail.html?id=${p.product_code}">
        <div class="thumb_wrap">
          ${badge}
          <img src="${p.thumbnail_main}" alt="${p.name}">
          ${hoverImg}
        </div>
      </a>
      <div class="quick_actions">
        <button type="button" class="wish_btn" aria-label="관심상품" data-id="${p.id}">♡</button>
        <button type="button" class="cart_add_btn" aria-label="장바구니" data-id="${p.id}"><img src="img/icon/basket_icon.svg" alt="" style="width:16px;"></button>
      </div>
      <div class="list_info">
        <a href="product-detail.html?id=${p.product_code}">
          <p class="list_name">${p.name}</p>
          <p class="list_price">${Number(p.price).toLocaleString()}원</p>
        </a>
      </div>
    </div>
  `;
}

function bindCardActions(grid) {
  grid.querySelectorAll('.wish_btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { data } = await window.supabaseClient.auth.getSession();
      if (!data.session) { location.href = 'login.html'; return; }
      await window.supabaseClient.from('wishlist').insert({ user_id: data.session.user.id, product_id: btn.dataset.id });
      btn.classList.toggle('active');
      btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
    });
  });
  grid.querySelectorAll('.cart_add_btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { data } = await window.supabaseClient.auth.getSession();
      if (!data.session) { location.href = 'login.html'; return; }
      await window.supabaseClient.from('cart_items').insert({ user_id: data.session.user.id, product_id: btn.dataset.id, quantity: 1 });
      alert('장바구니에 담았습니다.');
    });
  });
}

function renderPagination(cate, current, totalPages) {
  const nav = document.getElementById('pagination');
  if (totalPages <= 1) { nav.innerHTML = ''; return; }

  const link = (p, label, disabled) =>
    `<button type="button" class="page_num" data-page="${p}" ${disabled ? 'disabled style="opacity:.3;"' : ''}>${label}</button>`;

  let html = '';
  html += link(1, '&laquo;', current === 1);
  html += link(Math.max(1, current - 1), '&lsaquo;', current === 1);

  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) {
    html += `<button type="button" class="page_num ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  html += link(Math.min(totalPages, current + 1), '&rsaquo;', current === totalPages);
  html += link(totalPages, '&raquo;', current === totalPages);

  nav.innerHTML = html;
  nav.querySelectorAll('button[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = Number(btn.dataset.page);
      const params = new URLSearchParams(location.search);
      params.set('page', p);
      history.replaceState(null, '', `?${params.toString()}`);
      renderList(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

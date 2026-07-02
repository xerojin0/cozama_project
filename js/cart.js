/* ===================================================================
   COZAMA cart.js
=================================================================== */

let cartItemsCache = [];
let isGuest = false;

document.addEventListener('DOMContentLoaded', async () => {
  const { data } = await window.supabaseClient.auth.getSession();
  if (data.session) {
    await loadCart(data.session.user.id);
  } else {
    isGuest = true;
    await loadGuestCart();
  }
  bindBottomActions();
});

async function loadCart(userId) {
  const { data: items } = await window.supabaseClient
    .from('cart_items')
    .select('*, products(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  cartItemsCache = items || [];
  renderCartList();
}

async function loadGuestCart() {
  const guestItems = window.CozamaGuestCart.get();
  const productIds = [...new Set(guestItems.map((i) => i.product_id))];

  let productsById = {};
  if (productIds.length) {
    const { data: products } = await window.supabaseClient.from('products').select('*').in('id', productIds);
    (products || []).forEach((p) => { productsById[p.id] = p; });
  }

  cartItemsCache = guestItems.map((i) => ({
    id: `${i.product_id}::${i.option}`,
    product_id: i.product_id,
    option: i.option,
    quantity: i.quantity,
    products: productsById[i.product_id] || null,
  }));
  renderCartList();
}

function renderCartList() {
  const listEl = document.getElementById('cartList');
  const emptyEl = document.getElementById('cartEmpty');
  const wrapEl = document.getElementById('cartWrap');
  const bottomBar = document.getElementById('cartBottomBar');

  if (!cartItemsCache.length) {
    listEl.innerHTML = '';
    wrapEl.style.display = 'none';
    bottomBar.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  wrapEl.style.display = 'block';
  bottomBar.style.display = 'flex';
  emptyEl.style.display = 'none';

  listEl.innerHTML = cartItemsCache.map((item) => {
    const p = item.products || {};
    const points = Math.floor((p.price || 0) * item.quantity * 0.01);
    return `
    <div class="cart_row" data-cart-id="${item.id}">
      <input type="checkbox" class="row_check" checked>
      <img class="cart_thumb" src="${p.thumbnail_main || ''}" alt="${p.name || ''}">
      <div>
        <p class="cart_name">${p.name || '삭제된 상품'}</p>
        <p class="cart_option">옵션 : ${item.option || 'FREE'}</p>
      </div>
      <div class="qty_box">
        <button type="button" class="qty_minus">-</button>
        <input type="text" class="qty_input" value="${item.quantity}" readonly>
        <button type="button" class="qty_plus">+</button>
      </div>
      <div>
        <p class="cart_price">${Number((p.price || 0) * item.quantity).toLocaleString()}원</p>
        <p class="cart_ship">배송비 3,500원</p>
      </div>
      <div>
        <p class="cart_point">적립 예정 ${points.toLocaleString()}P</p>
      </div>
      <button type="button" class="cart_del_btn" aria-label="삭제">✕</button>
    </div>
    `;
  }).join('');

  bindRowActions();
}

function bindRowActions() {
  document.querySelectorAll('.cart_row').forEach((row) => {
    const cartId = row.dataset.cartId;

    row.querySelector('.qty_plus').addEventListener('click', () => updateQty(cartId, 1));
    row.querySelector('.qty_minus').addEventListener('click', () => updateQty(cartId, -1));
    row.querySelector('.cart_del_btn').addEventListener('click', () => deleteItems([cartId]));
  });

  document.getElementById('selectAll').addEventListener('change', (e) => {
    document.querySelectorAll('.row_check').forEach((cb) => (cb.checked = e.target.checked));
  });
}

async function updateQty(cartId, delta) {
  const item = cartItemsCache.find((i) => i.id === cartId);
  if (!item) return;
  const newQty = Math.max(1, item.quantity + delta);

  if (isGuest) {
    window.CozamaGuestCart.updateQty(item.product_id, item.option, newQty);
    loadGuestCart();
    window.CozamaCart.refreshBadge();
    return;
  }
  await window.supabaseClient.from('cart_items').update({ quantity: newQty }).eq('id', cartId);
  const { data } = await window.supabaseClient.auth.getSession();
  loadCart(data.session.user.id);
  window.CozamaCart.refreshBadge();
}

async function deleteItems(ids) {
  if (!ids.length) return;

  if (isGuest) {
    ids.forEach((id) => {
      const item = cartItemsCache.find((i) => i.id === id);
      if (item) window.CozamaGuestCart.remove(item.product_id, item.option);
    });
    loadGuestCart();
    window.CozamaCart.refreshBadge();
    return;
  }
  await window.supabaseClient.from('cart_items').delete().in('id', ids);
  const { data } = await window.supabaseClient.auth.getSession();
  loadCart(data.session.user.id);
  window.CozamaCart.refreshBadge();
}

function bindBottomActions() {
  document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
    const ids = getSelectedIds();
    if (!ids.length) return alert('삭제할 상품을 선택해주세요.');
    deleteItems(ids);
  });

  document.getElementById('deleteAllBtn').addEventListener('click', () => {
    if (!confirm('장바구니를 모두 비우시겠습니까?')) return;
    deleteItems(cartItemsCache.map((i) => i.id));
  });

  document.getElementById('orderSelectedBtn').addEventListener('click', () => {
    const ids = getSelectedIds();
    if (!ids.length) return alert('주문할 상품을 선택해주세요.');
    if (isGuest) return goToGuestCheckout(ids);
    goToCheckout(ids);
  });

  document.getElementById('orderAllBtn').addEventListener('click', () => {
    if (!cartItemsCache.length) return;
    if (isGuest) return goToGuestCheckout(cartItemsCache.map((i) => i.id));
    goToCheckout(cartItemsCache.map((i) => i.id));
  });
}

function getSelectedIds() {
  return [...document.querySelectorAll('.cart_row')]
    .filter((row) => row.querySelector('.row_check').checked)
    .map((row) => row.dataset.cartId);
}

function goToCheckout(ids) {
  sessionStorage.setItem('cozama_checkout_cart_ids', JSON.stringify(ids));
  location.href = 'checkout.html?mode=cart';
}

function goToGuestCheckout(ids) {
  const lines = ids
    .map((id) => cartItemsCache.find((i) => i.id === id))
    .filter((i) => i && i.products)
    .map((i) => ({ product_id: i.product_id, option: i.option, quantity: i.quantity }));
  if (!lines.length) return alert('주문할 상품을 선택해주세요.');
  sessionStorage.setItem('cozama_checkout_guest_lines', JSON.stringify(lines));
  location.href = 'checkout.html?mode=guestcart';
}

/* ===================================================================
   COZAMA checkout.js
=================================================================== */

const SHIPPING_FEE = 3500;
let orderLines = [];      // [{ product, option, quantity }]
let currentUser = null;
let myProfile = null;
let myCoupons = [];
let appliedCoupon = null;
let pointBalance = 0;
let currentPayMethod = 'bank';

document.addEventListener('DOMContentLoaded', async () => {
  const { data } = await window.supabaseClient.auth.getSession();
  if (!data.session) { location.href = 'login.html'; return; }
  currentUser = data.session.user;

  await loadProfile();
  await loadOrderLines();
  renderOrderProducts();
  updateSummary();

  initLoadMyInfo();
  initAddressSearch();
  initDeliveryMsgSelect();
  initCouponModal();
  initDiscountCode();
  initPointUse();
  initPayMethodTabs();
  initPayButton();
});

async function loadProfile() {
  const { data } = await window.supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
  myProfile = data;
  pointBalance = (data && data.points_balance) || 0;
  document.getElementById('myPointBalance').textContent = pointBalance.toLocaleString();

  const { data: coupons } = await window.supabaseClient
    .from('user_coupons').select('*, coupons(*)').eq('user_id', currentUser.id).eq('is_used', false);
  myCoupons = coupons || [];
}

async function loadOrderLines() {
  const mode = new URLSearchParams(location.search).get('mode');

  if (mode === 'buynow') {
    const saved = JSON.parse(sessionStorage.getItem('cozama_buy_now') || 'null');
    if (saved) {
      orderLines = saved.lines.map((l) => ({ product: saved.product, option: l.option, quantity: l.qty }));
    }
  } else {
    const ids = JSON.parse(sessionStorage.getItem('cozama_checkout_cart_ids') || '[]');
    if (ids.length) {
      const { data: items } = await window.supabaseClient
        .from('cart_items').select('*, products(*)').in('id', ids);
      orderLines = (items || []).map((i) => ({ product: i.products, option: i.option, quantity: i.quantity, cartId: i.id }));
    }
  }
}

function renderOrderProducts() {
  const wrap = document.getElementById('orderProdList');
  if (!orderLines.length) {
    wrap.innerHTML = '<p class="body_text">주문할 상품이 없습니다.</p>';
    return;
  }
  wrap.innerHTML = orderLines.map((line) => `
    <div class="order_prod_row">
      <img src="${line.product.thumbnail_main}" alt="${line.product.name}">
      <div>
        <p class="prod_name">${line.product.name}</p>
        <p class="prod_option">옵션 : ${line.option || 'FREE'}</p>
        <p class="prod_price_qty">${Number(line.product.price).toLocaleString()}원 (${line.quantity}개)</p>
      </div>
    </div>
  `).join('');
}

function getProductAmount() {
  return orderLines.reduce((sum, l) => sum + Number(l.product.price) * l.quantity, 0);
}

function getCouponDiscount(productAmount) {
  if (!appliedCoupon) return 0;
  const c = appliedCoupon.coupons;
  if (!c) return 0;
  if (c.discount_type === 'percent') return Math.floor(productAmount * (c.discount_value / 100));
  return Math.min(c.discount_value, productAmount);
}

function updateSummary() {
  const productAmount = getProductAmount();
  const shipAmount = orderLines.length ? SHIPPING_FEE : 0;
  const couponDiscount = getCouponDiscount(productAmount);
  const pointInput = document.getElementById('pointUseInput');
  let pointUse = Math.max(0, Number(pointInput.value) || 0);
  pointUse = Math.min(pointUse, pointBalance, Math.max(0, productAmount - couponDiscount));
  pointInput.value = pointUse;

  const total = Math.max(0, productAmount + shipAmount - couponDiscount - pointUse);
  const pointEarn = Math.floor((productAmount - couponDiscount) * 0.01);

  document.getElementById('summaryProductAmount').textContent = `${productAmount.toLocaleString()}원`;
  document.getElementById('summaryShipAmount').textContent = `${shipAmount.toLocaleString()}원`;
  document.getElementById('summaryCouponDiscount').textContent = `-${couponDiscount.toLocaleString()}원`;
  document.getElementById('summaryPointUse').textContent = `-${pointUse.toLocaleString()}원`;
  document.getElementById('summaryTotal').textContent = `${total.toLocaleString()}원`;
  document.getElementById('summaryPointEarn').textContent = pointEarn.toLocaleString();
  document.getElementById('payBtnAmount').textContent = `KRW ${total.toLocaleString()}`;
}

/* ---------------- 1-1 회원정보 불러오기 / 주소검색 ---------------- */
function initLoadMyInfo() {
  document.getElementById('loadMyInfoBtn').addEventListener('click', () => {
    if (!myProfile) return;
    document.getElementById('receiverName').value = myProfile.name || '';
    document.getElementById('receiverPhone').value = myProfile.phone || '';
    document.getElementById('receiverZipcode').value = myProfile.zipcode || '';
    document.getElementById('receiverAddress').value = myProfile.address || '';
    document.getElementById('receiverAddressDetail').value = myProfile.address_detail || '';
  });
}

function initAddressSearch() {
  document.getElementById('addrSearchBtn').addEventListener('click', () => {
    if (!window.daum || !window.daum.Postcode) { alert('주소 검색 스크립트를 불러오지 못했습니다.'); return; }
    new daum.Postcode({
      oncomplete: (data) => {
        document.getElementById('receiverZipcode').value = data.zonecode;
        document.getElementById('receiverAddress').value = data.roadAddress || data.jibunAddress;
        document.getElementById('receiverAddressDetail').focus();
      },
    }).open();
  });
}

/* ---------------- 1-2 배송 메시지 ---------------- */
function initDeliveryMsgSelect() {
  const select = document.getElementById('deliveryMsgSelect');
  const custom = document.getElementById('deliveryMsgCustom');
  select.addEventListener('change', () => {
    custom.style.display = select.value === 'custom' ? 'block' : 'none';
  });
}

/* ---------------- 1-4 쿠폰 / 할인코드 / 적립금 ---------------- */
function initCouponModal() {
  const modal = document.getElementById('couponModal');
  document.getElementById('couponChangeBtn').addEventListener('click', () => {
    renderCouponList();
    modal.classList.add('active');
  });
  document.getElementById('couponModalCloseBtn').addEventListener('click', () => modal.classList.remove('active'));
}

function renderCouponList() {
  const wrap = document.getElementById('couponListWrap');
  if (!myCoupons.length) {
    wrap.innerHTML = '<p class="body_text">보유하신 쿠폰이 없습니다.</p>';
    return;
  }
  wrap.innerHTML = myCoupons.map((uc) => {
    const c = uc.coupons || {};
    const label = c.discount_type === 'percent' ? `${c.discount_value}% 할인` : `${Number(c.discount_value).toLocaleString()}원 할인`;
    return `<div class="coupon_list_item"><span>${c.name} (${label})</span><button type="button" data-uc-id="${uc.id}">선택</button></div>`;
  }).join('');

  wrap.querySelectorAll('button[data-uc-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appliedCoupon = myCoupons.find((uc) => uc.id === btn.dataset.ucId);
      document.getElementById('appliedCouponLabel').textContent = appliedCoupon.coupons.name;
      document.getElementById('couponModal').classList.remove('active');
      updateSummary();
    });
  });
}

function initDiscountCode() {
  document.getElementById('discountCodeApplyBtn').addEventListener('click', async () => {
    const code = document.getElementById('discountCodeInput').value.trim();
    if (!code) return;
    const { data: coupon } = await window.supabaseClient.from('coupons').select('*').eq('code', code).single();
    if (!coupon) { alert('유효하지 않은 할인코드입니다.'); return; }
    appliedCoupon = { coupons: coupon };
    document.getElementById('appliedCouponLabel').textContent = coupon.name;
    updateSummary();
  });
}

function initPointUse() {
  document.getElementById('pointUseInput').addEventListener('input', updateSummary);
  document.getElementById('pointAllUseBtn').addEventListener('click', () => {
    document.getElementById('pointUseInput').value = pointBalance;
    updateSummary();
  });
}

/* ---------------- 1-5 결제수단 탭 ---------------- */
function initPayMethodTabs() {
  document.querySelectorAll('.pay_tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pay_tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.pay_method_panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`.pay_method_panel[data-panel="${tab.dataset.method}"]`).classList.add('active');
      currentPayMethod = tab.dataset.method;
    });
  });
}

/* ---------------- 결제하기 ---------------- */
function initPayButton() {
  document.getElementById('payBtn').addEventListener('click', async () => {
    if (!orderLines.length) return alert('주문할 상품이 없습니다.');
    const receiverName = document.getElementById('receiverName').value.trim();
    const receiverPhone = document.getElementById('receiverPhone').value.trim();
    const receiverAddress = document.getElementById('receiverAddress').value.trim();
    if (!receiverName || !receiverPhone || !receiverAddress) {
      alert('배송지 정보를 입력해주세요.');
      return;
    }

    const productAmount = getProductAmount();
    const couponDiscount = getCouponDiscount(productAmount);
    const pointUse = Number(document.getElementById('pointUseInput').value) || 0;
    const total = Math.max(0, productAmount + SHIPPING_FEE - couponDiscount - pointUse);
    const pointEarn = Math.floor((productAmount - couponDiscount) * 0.01);

    const deliveryMsgSelect = document.getElementById('deliveryMsgSelect').value;
    const deliveryMsg = deliveryMsgSelect === 'custom' ? document.getElementById('deliveryMsgCustom').value : deliveryMsgSelect;

    const orderNo = `ORD${Date.now()}`;
    const { data: order, error } = await window.supabaseClient.from('orders').insert({
      order_no: orderNo,
      user_id: currentUser.id,
      status: '입금전',
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      address: receiverAddress,
      address_detail: document.getElementById('receiverAddressDetail').value,
      delivery_message: deliveryMsg,
      payment_method: currentPayMethod,
      bank_name: currentPayMethod === 'bank' ? document.getElementById('bankSelect').value : null,
      depositor_name: currentPayMethod === 'bank' ? document.getElementById('depositorName').value : null,
      coupon_id: appliedCoupon ? appliedCoupon.coupons.id : null,
      discount_amount: couponDiscount,
      points_used: pointUse,
      points_earned: pointEarn,
      shipping_fee: SHIPPING_FEE,
      total_amount: total,
    }).select().single();

    if (error) { alert('주문 처리 중 오류가 발생했습니다.'); return; }

    const orderItemRows = orderLines.map((l) => ({
      order_id: order.id,
      product_id: l.product.id,
      product_name: l.product.name,
      option: l.option,
      price: l.product.price,
      quantity: l.quantity,
    }));
    await window.supabaseClient.from('order_items').insert(orderItemRows);

    if (pointUse > 0) {
      await window.supabaseClient.from('points').insert({ user_id: currentUser.id, amount: -pointUse, reason: '주문 사용', order_id: order.id });
    }
    if (pointEarn > 0) {
      await window.supabaseClient.from('points').insert({ user_id: currentUser.id, amount: pointEarn, reason: '주문 적립', order_id: order.id });
    }
    if (appliedCoupon && appliedCoupon.id) {
      await window.supabaseClient.from('user_coupons').update({ is_used: true, used_at: new Date().toISOString() }).eq('id', appliedCoupon.id);
    }

    const cartIds = orderLines.filter((l) => l.cartId).map((l) => l.cartId);
    if (cartIds.length) await window.supabaseClient.from('cart_items').delete().in('id', cartIds);

    sessionStorage.removeItem('cozama_buy_now');
    sessionStorage.removeItem('cozama_checkout_cart_ids');

    alert(`주문이 완료되었습니다. (주문번호 : ${orderNo})`);
    location.href = 'mypage.html';
  });
}

/* ===================================================================
   COZAMA main.js (메인페이지 전용 Swiper 초기화)
=================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initHeroSwiper();
  initNewArrivalSwiper();
  initLikeButtons();
});

function initHeroSwiper() {
  const el = document.querySelector('.swiper-hero');
  if (!el || !window.Swiper) return;
  new Swiper(el, {
    effect: 'fade',
    fadeEffect: { crossFade: true },
    loop: true,
    pagination: {
      el: '.hero_pagination',
      type: 'fraction',
    },
    navigation: {
      nextEl: '.main_visual .swiper_next',
      prevEl: '.main_visual .swiper_prev',
    },
  });
}

function initNewArrivalSwiper() {
  const el = document.querySelector('.swiper-new-arrival');
  if (!el || !window.Swiper) return;
  new Swiper(el, {
    slidesPerView: 'auto',
    spaceBetween: 20,
    loop: true,
    navigation: {
      nextEl: '.new_arrival .swiper_next',
      prevEl: '.new_arrival .swiper_prev',
    },
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
  });
}

async function initLikeButtons() {
  const btns = [...document.querySelectorAll('.like_btn[data-code]')];
  if (!btns.length || !window.supabaseClient) return;

  const codes = btns.map((btn) => btn.dataset.code);
  const { data: products } = await window.supabaseClient
    .from('products').select('id, product_code').in('product_code', codes);
  const idByCode = {};
  (products || []).forEach((p) => { idByCode[p.product_code] = p.id; });

  const likedIds = await window.CozamaWishlist.getLikedIds(Object.values(idByCode));

  btns.forEach((btn) => {
    const productId = idByCode[btn.dataset.code];
    if (!productId) return;

    if (likedIds.has(productId)) {
      btn.classList.add('active');
      btn.textContent = '♥';
    }

    btn.addEventListener('click', async () => {
      const isActive = btn.classList.contains('active');
      const result = await window.CozamaWishlist.toggle(productId, isActive);
      if (result === null) return;
      btn.classList.toggle('active', result);
      btn.textContent = result ? '♥' : '♡';
    });
  });
}

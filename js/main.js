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

function initLikeButtons() {
  document.querySelectorAll('.like_btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
    });
  });
}

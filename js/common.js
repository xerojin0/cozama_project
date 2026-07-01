/* ===================================================================
   COZAMA common.js
   - 햄버거 슬라이딩 메뉴 / GNB 아코디언 / 로그인 상태 UI
=================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initGnbSlideMenu();
  initGnbAccordion();
  initAuthState();
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

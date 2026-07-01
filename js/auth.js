/* ===================================================================
   COZAMA auth.js
   - login / join / find-account 페이지 공통 로직
=================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTabSwitch();
  initLoginForm();
  initGuestOrderForm();
  initJoinAgreeAll();
  initJoinStepNav();
  initAddressSearch();
  initJoinSubmit();
  initFindAccountRadios();
  initFindIdForms();
  initFindPwForms();
});

/* ---------------- 공통 탭 스위치 (login.html / find-account.html) ---------------- */
function initTabSwitch() {
  const tabBtns = document.querySelectorAll('.tab_btn');
  if (!tabBtns.length) return;

  const params = new URLSearchParams(location.search);
  const initTab = params.get('tab');
  if (initTab === 'pw') activateTab('find-pw');
  else if (initTab === 'id') activateTab('find-id');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  function activateTab(tabName) {
    document.querySelectorAll('.tab_btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabName));
    document.querySelectorAll('.tab_panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === tabName));
  }
}

/* ---------------- 로그인 ---------------- */
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('loginId').value.trim();
    const password = document.getElementById('loginPw').value;
    const errorEl = document.getElementById('loginError');
    errorEl.classList.remove('show');

    try {
      const { data: email, error: rpcError } = await window.supabaseClient
        .rpc('get_email_by_user_id', { p_user_id: userId });
      if (rpcError || !email) throw new Error('아이디를 찾을 수 없습니다.');

      const { error: signInError } = await window.supabaseClient.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      if (document.getElementById('saveId').checked) {
        localStorage.setItem('cozama_saved_id', userId);
      } else {
        localStorage.removeItem('cozama_saved_id');
      }
      location.href = 'mypage.html';
    } catch (err) {
      errorEl.classList.add('show');
    }
  });

  const savedId = localStorage.getItem('cozama_saved_id');
  if (savedId) {
    document.getElementById('loginId').value = savedId;
    document.getElementById('saveId').checked = true;
  }

  const secureBtn = document.getElementById('secureInfoBtn');
  if (secureBtn) {
    secureBtn.addEventListener('click', () => {
      const text = document.getElementById('secureInfoText');
      text.style.display = text.style.display === 'none' ? 'block' : 'none';
    });
  }
}

function initGuestOrderForm() {
  const form = document.getElementById('guestOrderForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('입력하신 정보로 주문내역을 조회했습니다. (데모)');
  });
}

/* ---------------- 회원가입 - 전체동의 ---------------- */
function initJoinAgreeAll() {
  const allBox = document.getElementById('agreeAll');
  if (!allBox) return;
  const items = document.querySelectorAll('.agree_item');
  const nextBtn = document.getElementById('step1NextBtn');

  const syncNextBtn = () => {
    const requiredOk = [...document.querySelectorAll('.agree_item[data-required="true"]')].every((i) => i.checked);
    nextBtn.disabled = !requiredOk;
  };

  allBox.addEventListener('change', () => {
    items.forEach((i) => (i.checked = allBox.checked));
    syncNextBtn();
  });

  items.forEach((item) => {
    item.addEventListener('change', () => {
      allBox.checked = [...items].every((i) => i.checked);
      syncNextBtn();
    });
  });
}

/* ---------------- 회원가입 - 단계 전환 ---------------- */
function initJoinStepNav() {
  const step1Next = document.getElementById('step1NextBtn');
  if (!step1Next) return;
  step1Next.addEventListener('click', () => goToStep(2));
}

function goToStep(stepNum) {
  document.querySelectorAll('.join_step').forEach((s) => s.classList.toggle('active', Number(s.dataset.step) === stepNum));
  document.querySelectorAll('.step_indicator .step').forEach((s, idx) => s.classList.toggle('active', idx + 1 === stepNum));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- 다음 우편번호 검색 ---------------- */
function initAddressSearch() {
  const btn = document.getElementById('addrSearchBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!window.daum || !window.daum.Postcode) {
      alert('주소 검색 스크립트를 불러오지 못했습니다.');
      return;
    }
    new daum.Postcode({
      oncomplete: (data) => {
        document.getElementById('joinZipcode').value = data.zonecode;
        document.getElementById('joinAddress').value = data.roadAddress || data.jibunAddress;
        document.getElementById('joinAddressDetail').focus();
      },
    }).open();
  });
}

/* ---------------- 회원가입 제출 ---------------- */
function initJoinSubmit() {
  const form = document.getElementById('joinForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('joinError');
    errorEl.textContent = '';

    const pw = document.getElementById('joinPw').value;
    const pwConfirm = document.getElementById('joinPwConfirm').value;
    const pwMismatch = document.getElementById('pwMismatchError');
    if (pw !== pwConfirm) {
      pwMismatch.classList.add('show');
      return;
    }
    pwMismatch.classList.remove('show');

    const userId = document.getElementById('joinUserId').value.trim();
    const name = document.getElementById('joinName').value.trim();
    const email = document.getElementById('joinEmail').value.trim();
    const phone = [
      document.getElementById('joinPhoneFirst').value,
      document.getElementById('joinPhoneMid').value,
      document.getElementById('joinPhoneLast').value,
    ].join('-');
    const phone2Mid = document.getElementById('joinPhone2Mid').value;
    const phone2 = phone2Mid
      ? [document.getElementById('joinPhone2First').value, phone2Mid, document.getElementById('joinPhone2Last').value].join('-')
      : null;
    const zipcode = document.getElementById('joinZipcode').value;
    const address = document.getElementById('joinAddress').value;
    const addressDetail = document.getElementById('joinAddressDetail').value;
    const gender = (document.querySelector('input[name="gender"]:checked') || {}).value || null;
    const birthYear = document.getElementById('birthYear').value;
    const birthMonth = document.getElementById('birthMonth').value;
    const birthDay = document.getElementById('birthDay').value;
    const birthDate = birthYear && birthMonth && birthDay
      ? `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
      : null;
    const birthType = (document.querySelector('input[name="birthType"]:checked') || {}).value || 'solar';
    const region = document.getElementById('joinRegion').value || null;

    try {
      const { data: signUpData, error: signUpError } = await window.supabaseClient.auth.signUp({ email, password: pw });
      if (signUpError) throw signUpError;

      const userIdAuth = signUpData.user && signUpData.user.id;
      if (userIdAuth) {
        const { error: profileError } = await window.supabaseClient.from('profiles').update({
          user_id: userId,
          name,
          phone,
          phone2,
          zipcode,
          address,
          address_detail: addressDetail,
          gender,
          birth_date: birthDate,
          birth_type: birthType,
          region,
        }).eq('id', userIdAuth);
        if (profileError) throw profileError;
      }

      document.getElementById('completeName').textContent = name;
      document.getElementById('completeDate').textContent = new Date().toISOString().slice(0, 10);
      goToStep(3);
    } catch (err) {
      errorEl.textContent = err.message || '회원가입 중 오류가 발생했습니다.';
    }
  });
}

/* ---------------- 아이디/비밀번호 찾기 - 라디오 전환 ---------------- */
function initFindAccountRadios() {
  document.querySelectorAll('input[name="findIdMethod"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      document.getElementById('findIdEmailForm').style.display = radio.value === 'email' && radio.checked ? 'block' : 'none';
      document.getElementById('findIdPhoneForm').style.display = radio.value === 'phone' && radio.checked ? 'block' : 'none';
    });
  });
  document.querySelectorAll('input[name="findPwMethod"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      document.getElementById('findPwEmailForm').style.display = radio.value === 'email' && radio.checked ? 'block' : 'none';
      document.getElementById('findPwPhoneForm').style.display = radio.value === 'phone' && radio.checked ? 'block' : 'none';
    });
  });
}

function initFindIdForms() {
  const emailForm = document.getElementById('findIdEmailForm');
  const phoneForm = document.getElementById('findIdPhoneForm');
  if (!emailForm) return;

  const handle = (rpcParams) => async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await window.supabaseClient.rpc('find_user_id', rpcParams);
      if (error || !data) throw new Error('일치하는 회원 정보가 없습니다.');
      document.getElementById('foundUserId').textContent = data;
      document.getElementById('findIdResult').style.display = 'block';
    } catch (err) {
      alert(err.message);
    }
  };

  emailForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const [nameInput, emailInput] = emailForm.querySelectorAll('input');
    window.supabaseClient.rpc('find_user_id', { p_name: nameInput.value, p_email: emailInput.value, p_phone: null })
      .then(({ data, error }) => {
        if (error || !data) return alert('일치하는 회원 정보가 없습니다.');
        document.getElementById('foundUserId').textContent = data;
        document.getElementById('findIdResult').style.display = 'block';
      });
  });

  phoneForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const [nameInput, phoneInput] = phoneForm.querySelectorAll('input');
    window.supabaseClient.rpc('find_user_id', { p_name: nameInput.value, p_email: null, p_phone: phoneInput.value })
      .then(({ data, error }) => {
        if (error || !data) return alert('일치하는 회원 정보가 없습니다.');
        document.getElementById('foundUserId').textContent = data;
        document.getElementById('findIdResult').style.display = 'block';
      });
  });
}

function initFindPwForms() {
  const emailForm = document.getElementById('findPwEmailForm');
  const phoneForm = document.getElementById('findPwPhoneForm');
  if (!emailForm) return;

  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = emailForm.querySelectorAll('input')[1];
    await window.supabaseClient.auth.resetPasswordForEmail(emailInput.value);
    document.getElementById('findPwResult').style.display = 'block';
  });

  phoneForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('휴대폰 인증을 통한 비밀번호 재설정은 이메일 발송으로 대체 안내됩니다. 가입하신 이메일을 확인해주세요.');
  });
}

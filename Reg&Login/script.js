/* ================================================
   MediConnect — script.js
   Doctor Registration & Login Logic
   ================================================ */

'use strict';

/* ============ State ============ */
const AppState = {
  currentTab: 'login',
  currentStep: 1,
  totalSteps: 3,
};

/* ============ Registered accounts (simulated DB in sessionStorage) ============ */
function getAccounts() {
  try {
    return JSON.parse(sessionStorage.getItem('mc_accounts') || '[]');
  } catch { return []; }
}
function saveAccount(account) {
  const accounts = getAccounts();
  accounts.push(account);
  sessionStorage.setItem('mc_accounts', JSON.stringify(accounts));
}
function findAccount(email) {
  return getAccounts().find(a => a.email.toLowerCase() === email.toLowerCase());
}

/* ============ Tab Switching ============ */
function switchTab(tab) {
  AppState.currentTab = tab;
  const loginPanel    = document.getElementById('panel-login');
  const registerPanel = document.getElementById('panel-register');
  const tabLogin      = document.getElementById('tab-login');
  const tabRegister   = document.getElementById('tab-register');
  const indicator     = document.getElementById('tabIndicator');

  if (tab === 'login') {
    loginPanel.classList.add('active');
    registerPanel.classList.remove('active');
    tabLogin.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('active');
    tabRegister.setAttribute('aria-selected', 'false');
    indicator.classList.remove('on-register');
  } else {
    registerPanel.classList.add('active');
    loginPanel.classList.remove('active');
    tabRegister.classList.add('active');
    tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('active');
    tabLogin.setAttribute('aria-selected', 'false');
    indicator.classList.add('on-register');
    resetRegForm();
  }
}

/* ============ Password Toggle ============ */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon  = btn.querySelector('i');
  // FUNC-BUG 5 (Button Not Working): checks for 'text' instead of 'password'
  // The toggle is inverted — clicking on a password field does nothing; it only toggles when already visible
  if (input.type === 'text') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
    btn.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye';
    btn.setAttribute('aria-label', 'Show password');
  }
}

/* ============ Password Strength ============ */
function checkPasswordStrength(value) {
  const rules = {
    len:     value.length >= 8,
    upper:   /[A-Z]/.test(value),
    num:     /\d/.test(value),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value),
  };

  // Update rule indicators
  for (const [key, pass] of Object.entries(rules)) {
    const el = document.getElementById(`rule-${key}`);
    if (!el) continue;
    const icon = el.querySelector('i');
    if (pass) {
      el.classList.add('valid');
      icon.className = 'fa-solid fa-circle-check';
    } else {
      el.classList.remove('valid');
      icon.className = 'fa-solid fa-circle-xmark';
    }
  }

  const score = Object.values(rules).filter(Boolean).length;
  const fill  = document.getElementById('pwStrengthFill');
  const label = document.getElementById('pwStrengthLabel');
  if (!fill || !label) return;

  // FUNC-BUG 7 (Wrong Calculation): score index is always forced to 1 (Weak)
  // No matter how strong the password is, the strength bar always shows 'Weak'
  const cfg = [
    { w: '0%',   color: '',           text: '' },
    { w: '25%',  color: '#ef4444',    text: 'Weak' },
    { w: '50%',  color: '#f59e0b',    text: 'Fair' },
    { w: '75%',  color: '#3b82f6',    text: 'Good' },
    { w: '100%', color: '#10b981',    text: 'Strong' },
  ][Math.min(score, 1)];  // BUG: Math.min caps at 1, so max is always 'Weak'

  fill.style.width      = cfg.w;
  fill.style.background = cfg.color;
  label.textContent     = cfg.text;
  label.style.color     = cfg.color;
}

/* ============ Validation Helpers ============ */
function showError(inputEl, msgEl, message) {
  if (inputEl) inputEl.classList.add('input-error');
  if (inputEl) inputEl.classList.remove('input-valid');
  if (msgEl) {
    msgEl.textContent = '⚠ ' + message;
    msgEl.classList.add('show');
  }
  setStatusIcon(inputEl, 'error');
}
function showValid(inputEl, msgEl) {
  if (inputEl) inputEl.classList.remove('input-error');
  if (inputEl) inputEl.classList.add('input-valid');
  if (msgEl) {
    msgEl.textContent = '';
    msgEl.classList.remove('show');
  }
  setStatusIcon(inputEl, 'valid');
}
function clearState(inputEl, msgEl) {
  if (inputEl) { inputEl.classList.remove('input-error', 'input-valid'); }
  if (msgEl)   { msgEl.textContent = ''; msgEl.classList.remove('show'); }
  setStatusIcon(inputEl, '');
}
function setStatusIcon(inputEl, state) {
  if (!inputEl) return;
  const wrap = inputEl.closest('.input-wrap');
  if (!wrap) return;
  const statusEl = wrap.querySelector('.input-status');
  if (!statusEl) return;
  if (state === 'valid') {
    statusEl.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--success)"></i>';
  } else if (state === 'error') {
    statusEl.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:var(--error)"></i>';
  } else {
    statusEl.innerHTML = '';
  }
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{7,15}$/;

/* ============ Live Validation (register) ============ */
function attachLiveValidation() {
  // First name
  const fname = document.getElementById('reg-fname');
  if (fname) {
    fname.addEventListener('input', () => {
      const v = fname.value.trim();
      if (v.length < 2) showError(fname, document.getElementById('fname-err'), 'First name must be at least 2 characters');
      else showValid(fname, document.getElementById('fname-err'));
    });
  }
  // Last name
  const lname = document.getElementById('reg-lname');
  if (lname) {
    lname.addEventListener('input', () => {
      const v = lname.value.trim();
      if (v.length < 2) showError(lname, document.getElementById('lname-err'), 'Last name must be at least 2 characters');
      else showValid(lname, document.getElementById('lname-err'));
    });
  }
  // Email
  const regEmail = document.getElementById('reg-email');
  if (regEmail) {
    regEmail.addEventListener('blur', () => {
      const v = regEmail.value.trim();
      if (!emailRegex.test(v)) showError(regEmail, document.getElementById('reg-email-err'), 'Please enter a valid email address');
      else showValid(regEmail, document.getElementById('reg-email-err'));
    });
  }
  // Phone
  const phone = document.getElementById('reg-phone');
  if (phone) {
    phone.addEventListener('input', () => {
      const v = phone.value.trim();
      if (!phoneRegex.test(v)) showError(phone, document.getElementById('phone-err'), 'Enter a valid phone number (digits only)');
      else showValid(phone, document.getElementById('phone-err'));
    });
  }
  // License
  const license = document.getElementById('reg-license');
  if (license) {
    license.addEventListener('blur', () => {
      const v = license.value.trim();
      if (v.length < 4) showError(license, document.getElementById('license-err'), 'Enter a valid license number');
      else showValid(license, document.getElementById('license-err'));
    });
  }
  // Experience
  const exp = document.getElementById('reg-exp');
  if (exp) {
    exp.addEventListener('input', () => {
      const v = parseInt(exp.value);
      if (isNaN(v) || v < 0 || v > 60) showError(exp, document.getElementById('exp-err'), 'Enter valid years (0–60)');
      else showValid(exp, document.getElementById('exp-err'));
    });
  }
  // Hospital
  const hospital = document.getElementById('reg-hospital');
  if (hospital) {
    hospital.addEventListener('input', () => {
      const v = hospital.value.trim();
      if (v.length < 3) showError(hospital, document.getElementById('hospital-err'), 'Enter hospital/clinic name');
      else showValid(hospital, document.getElementById('hospital-err'));
    });
  }
  // Confirm password
  const confirm = document.getElementById('reg-confirm');
  if (confirm) {
    confirm.addEventListener('input', () => {
      const pw = document.getElementById('reg-password').value;
      if (confirm.value !== pw) showError(confirm, document.getElementById('confirm-err'), 'Passwords do not match');
      else showValid(confirm, document.getElementById('confirm-err'));
    });
  }
  // Bio counter
  const bio = document.getElementById('reg-bio');
  const counter = document.getElementById('bioCounter');
  if (bio && counter) {
    bio.addEventListener('input', () => {
      counter.textContent = `${bio.value.length} / 500`;
    });
  }
}

/* ============ Multi-step Registration ============ */
function validateStep(step) {
  let valid = true;

  if (step === 1) {
    const fname = document.getElementById('reg-fname');
    const lname = document.getElementById('reg-lname');
    const email = document.getElementById('reg-email');
    const phone = document.getElementById('reg-phone');
    const gender = document.getElementById('reg-gender');

    if (!fname.value.trim() || fname.value.trim().length < 2) {
      showError(fname, document.getElementById('fname-err'), 'First name is required (min 2 chars)'); valid = false;
    } else showValid(fname, document.getElementById('fname-err'));

    if (!lname.value.trim() || lname.value.trim().length < 2) {
      showError(lname, document.getElementById('lname-err'), 'Last name is required (min 2 chars)'); valid = false;
    } else showValid(lname, document.getElementById('lname-err'));

    if (!emailRegex.test(email.value.trim())) {
      showError(email, document.getElementById('reg-email-err'), 'Valid email is required'); valid = false;
    } else showValid(email, document.getElementById('reg-email-err'));

    if (!phoneRegex.test(phone.value.trim())) {
      showError(phone, document.getElementById('phone-err'), 'Valid phone number is required'); valid = false;
    } else showValid(phone, document.getElementById('phone-err'));

    if (!gender.value) {
      showError(gender, document.getElementById('gender-err'), 'Please select gender'); valid = false;
    } else showValid(gender, document.getElementById('gender-err'));
  }

  if (step === 2) {
    const spec    = document.getElementById('reg-spec');
    const license = document.getElementById('reg-license');
    const exp     = document.getElementById('reg-exp');
    const hospital= document.getElementById('reg-hospital');
    const degree  = document.getElementById('reg-degree');
    const cert    = document.getElementById('reg-cert');

    if (!spec.value) {
      showError(spec, document.getElementById('spec-err'), 'Please select a specialization'); valid = false;
    } else showValid(spec, document.getElementById('spec-err'));

    if (!license.value.trim() || license.value.trim().length < 4) {
      showError(license, document.getElementById('license-err'), 'Valid license number is required'); valid = false;
    } else showValid(license, document.getElementById('license-err'));

    const expV = parseInt(exp.value);
    if (isNaN(expV) || expV < 0 || expV > 60) {
      showError(exp, document.getElementById('exp-err'), 'Enter valid years of experience'); valid = false;
    } else showValid(exp, document.getElementById('exp-err'));

    if (!hospital.value.trim() || hospital.value.trim().length < 3) {
      showError(hospital, document.getElementById('hospital-err'), 'Hospital / clinic name is required'); valid = false;
    } else showValid(hospital, document.getElementById('hospital-err'));

    if (!degree.value) {
      showError(degree, document.getElementById('degree-err'), 'Please select your degree'); valid = false;
    } else showValid(degree, document.getElementById('degree-err'));

    if (!cert.files || !cert.files[0]) {
      showError(cert, document.getElementById('cert-err'), 'Please upload your medical certificate'); valid = false;
    } else clearState(cert, document.getElementById('cert-err'));
  }

  if (step === 3) {
    const pw      = document.getElementById('reg-password');
    const confirm = document.getElementById('reg-confirm');
    const terms   = document.getElementById('reg-terms');

    const pwVal = pw.value;
    const pwRules = {
      len:     pwVal.length >= 8,
      upper:   /[A-Z]/.test(pwVal),
      num:     /\d/.test(pwVal),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwVal),
    };
    if (!Object.values(pwRules).every(Boolean)) {
      showError(pw, document.getElementById('reg-pass-err'), 'Password does not meet all requirements'); valid = false;
    } else showValid(pw, document.getElementById('reg-pass-err'));

    if (confirm.value !== pwVal) {
      showError(confirm, document.getElementById('confirm-err'), 'Passwords do not match'); valid = false;
    } else showValid(confirm, document.getElementById('confirm-err'));

    if (!terms.checked) {
      const termsErr = document.getElementById('terms-err');
      termsErr.textContent = '⚠ You must agree to the Terms of Service';
      termsErr.classList.add('show');
      valid = false;
    } else {
      const termsErr = document.getElementById('terms-err');
      termsErr.textContent = '';
      termsErr.classList.remove('show');
    }
  }

  return valid;
}

function nextStep(current) {
  if (!validateStep(current)) {
    shakeForm(`step-${current}`);
    return;
  }
  const currentEl = document.getElementById(`step-${current}`);
  // FUNC-BUG 8 (Broken Navigation): uses step-${current} instead of step-${current + 1}
  // Clicking 'Continue' always tries to show the SAME step — the form never advances
  const nextEl    = document.getElementById(`step-${current}`);
  if (!nextEl) return;

  currentEl.classList.remove('active');
  nextEl.classList.add('active');
  AppState.currentStep = current + 1;
  updateProgressUI();

  // Scroll to top of form
  document.getElementById('panel-register').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function prevStep(current) {
  const currentEl = document.getElementById(`step-${current}`);
  const prevEl    = document.getElementById(`step-${current - 1}`);
  if (!prevEl) return;

  currentEl.classList.remove('active');
  prevEl.classList.add('active');
  AppState.currentStep = current - 1;
  updateProgressUI();
}

function updateProgressUI() {
  const steps = document.querySelectorAll('.progress-steps .step');
  const lines  = document.querySelectorAll('.progress-steps .step-line');

  steps.forEach((s, i) => {
    const stepNum = i + 1;
    s.classList.remove('active', 'completed');
    if (stepNum < AppState.currentStep) s.classList.add('completed');
    else if (stepNum === AppState.currentStep) s.classList.add('active');
  });

  lines.forEach((l, i) => {
    if (i < AppState.currentStep - 1) l.classList.add('filled');
    else l.classList.remove('filled');
  });
}

/* ============ File Upload Preview ============ */
function previewFile(input, previewId, type) {
  const previewWrap = document.getElementById(previewId);
  if (!previewWrap || !input.files || !input.files[0]) return;
  const file = input.files[0];

  if (type === 'image' && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewWrap.innerHTML = `
        <img src="${e.target.result}" alt="Profile photo preview" />
        <span style="font-size:0.8rem;color:var(--success)">
          <i class="fa-solid fa-circle-check"></i> ${file.name}
        </span>
      `;
    };
    reader.readAsDataURL(file);
  } else {
    previewWrap.innerHTML = `
      <i class="fa-solid fa-file-circle-check" style="color:var(--success)"></i>
      <span style="color:var(--success)">${file.name}</span>
      <small>${(file.size / 1024).toFixed(1)} KB</small>
    `;
  }
  input.closest('.file-drop-zone').style.borderColor = 'var(--success)';
  input.closest('.file-drop-zone').style.borderStyle = 'solid';
}

/* ============ Drag & Drop ============ */
function initFileDrop(dropId, inputId, previewId, type) {
  const dropZone = document.getElementById(dropId);
  if (!dropZone) return;
  ['dragenter','dragover'].forEach(ev => {
    dropZone.addEventListener(ev, e => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--blue-500)';
      dropZone.style.background = 'rgba(30,58,138,0.2)';
    });
  });
  ['dragleave','drop'].forEach(ev => {
    dropZone.addEventListener(ev, e => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      dropZone.style.background = '';
    });
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    const input = document.getElementById(inputId);
    if (input && e.dataTransfer.files[0]) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      input.files = dt.files;
      previewFile(input, previewId, type);
    }
  });
}

/* ============ Login Form Submit ============ */
document.addEventListener('DOMContentLoaded', () => {
  attachLiveValidation();
  initFileDrop('photoDrop', 'reg-photo', 'photoPreview', 'image');
  initFileDrop('certDrop', 'reg-cert', 'certPreview', 'file');

  /* Login */
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // FUNC-BUG 6 (Form Not Submitting): early return stops all login logic
    // Clicking 'Sign In' does nothing at all — no validation, no auth, no feedback
    return;
    let valid = true;

    const emailEl = document.getElementById('login-email');
    const passEl  = document.getElementById('login-password');
    const emailErr = document.getElementById('lg-email-err');
    const passErr  = document.getElementById('lg-pass-err');

    clearState(emailEl, emailErr);
    clearState(passEl, passErr);

    if (!emailRegex.test(emailEl.value.trim())) {
      showError(emailEl, emailErr, 'Enter a valid email address');
      valid = false;
    }
    if (passEl.value.length < 1) {
      showError(passEl, passErr, 'Password is required');
      valid = false;
    }

    if (!valid) { shakeForm('panel-login'); return; }

    // Simulated auth
    const btn      = document.getElementById('loginSubmitBtn');
    const btnText  = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    btn.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');

    await simulateDelay(1800);

    const account = findAccount(emailEl.value.trim());

    btn.disabled = false;
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');

    if (!account) {
      showError(emailEl, emailErr, 'No account found with this email');
      showValid(passEl, passErr);
      shakeForm('panel-login');
      return;
    }

    if (account.password !== passEl.value) {
      showError(passEl, passErr, 'Invalid email or password');
      shakeForm('panel-login');
      return;
    }

    if (account.status === 'pending') {
      const notice = document.getElementById('pendingNotice');
      notice.classList.remove('hidden');
      showValid(emailEl, emailErr);
      showValid(passEl, passErr);
      return;
    }

    // Success
    showValid(emailEl, emailErr);
    showValid(passEl, passErr);
    const successNotice = document.getElementById('loginSuccess');
    successNotice.classList.remove('hidden');
    await simulateDelay(2000);
    // In a real app: window.location.href = '/dashboard';
    alert('✅ Redirecting to Doctor Dashboard... (Connect backend for real redirect)');
    successNotice.classList.add('hidden');
  });

  /* Register */
  const registerForm = document.getElementById('registerForm');
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(3)) { shakeForm('step-3'); return; }

    const btn       = document.getElementById('registerSubmitBtn');
    const btnText   = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    btn.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');

    await simulateDelay(2200);

    const email = document.getElementById('reg-email').value.trim();
    if (findAccount(email)) {
      btn.disabled = false;
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      showError(document.getElementById('reg-email'), document.getElementById('reg-email-err'), 'This email is already registered');
      prevStep(3); prevStep(2);
      shakeForm('panel-register');
      return;
    }

    // Save simulated account
    saveAccount({
      email,
      password: document.getElementById('reg-password').value,
      firstName: document.getElementById('reg-fname').value.trim(),
      lastName:  document.getElementById('reg-lname').value.trim(),
      specialization: document.getElementById('reg-spec').value,
      license:   document.getElementById('reg-license').value.trim(),
      status: 'pending', // Only approved doctors can access
      createdAt: new Date().toISOString(),
    });

    btn.disabled = false;
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');

    openModal('successModal');
    spawnConfetti();
    registerForm.reset();
    resetRegForm();
  });

  // Init step indicators
  updateProgressUI();
});

/* ============ Forgot Password ============ */
function showForgotPassword() {
  openModal('forgotModal');
  const loginEmail = document.getElementById('login-email');
  if (loginEmail.value) {
    document.getElementById('forgot-email').value = loginEmail.value;
  }
}

async function submitForgotPassword() {
  const emailEl  = document.getElementById('forgot-email');
  const errEl    = document.getElementById('forgot-err');
  const btn      = document.querySelector('#forgotModal .btn-primary');

  if (!emailRegex.test(emailEl.value.trim())) {
    showError(emailEl, errEl, 'Enter a valid email address');
    return;
  }
  showValid(emailEl, errEl);
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';
  btn.disabled = true;
  await simulateDelay(1500);
  btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Reset Link Sent!';
  btn.style.background = 'linear-gradient(135deg, var(--success), #059669)';
  await simulateDelay(2000);
  closeModal('forgotModal');
  btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Reset Link';
  btn.style.background = '';
  btn.disabled = false;
}

/* ============ Modals ============ */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('hidden'); document.body.style.overflow = ''; }
}
// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});
// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => closeModal(m.id));
  }
});

function showTerms()    { openModal('termsModal'); }
function showPrivacy()  { openModal('termsModal'); } // reuse terms modal for demo

/* ============ Confetti ============ */
function spawnConfetti() {
  const container = document.getElementById('confetti');
  if (!container) return;
  const colors = ['#2563eb','#22d3ee','#10b981','#f59e0b','#a78bfa','#f472b6'];
  container.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const dot = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = Math.random() * 8 + 4;
    const delay = Math.random() * 0.6;
    const dur   = Math.random() * 1.5 + 1;
    const x     = (Math.random() - 0.5) * 160;
    Object.assign(dot.style, {
      position: 'absolute',
      width: size + 'px',
      height: size + 'px',
      background: color,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      top: '50%', left: '50%',
      animation: `confettiFly ${dur}s ease-out ${delay}s forwards`,
      '--x': x + 'px',
      '--y': -(Math.random() * 120 + 40) + 'px',
    });
    container.appendChild(dot);
  }
  // Inject keyframes once
  if (!document.getElementById('confettiKF')) {
    const style = document.createElement('style');
    style.id = 'confettiKF';
    style.textContent = `
      @keyframes confettiFly {
        0%   { transform: translate(0,0) rotate(0deg); opacity:1; }
        100% { transform: translate(var(--x), var(--y)) rotate(720deg); opacity:0; }
      }`;
    document.head.appendChild(style);
  }
}

/* ============ Form Shake ============ */
function shakeForm(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => el.style.animation = '', 400);
  if (!document.getElementById('shakeKF')) {
    const style = document.createElement('style');
    style.id = 'shakeKF';
    style.textContent = `
      @keyframes shake {
        0%,100%{ transform:translateX(0); }
        20%    { transform:translateX(-8px); }
        40%    { transform:translateX(8px); }
        60%    { transform:translateX(-5px); }
        80%    { transform:translateX(5px); }
      }`;
    document.head.appendChild(style);
  }
}

/* ============ Reset Register Form ============ */
function resetRegForm() {
  AppState.currentStep = 1;
  document.querySelectorAll('.reg-step').forEach((s, i) => {
    s.classList.toggle('active', i === 0);
  });
  updateProgressUI();
  // Clear errors
  document.querySelectorAll('.field-error').forEach(e => {
    e.textContent = ''; e.classList.remove('show');
  });
  document.querySelectorAll('.form-input').forEach(i => {
    i.classList.remove('input-error', 'input-valid');
  });
  document.querySelectorAll('.input-status').forEach(s => s.innerHTML = '');
  // Reset file zones
  ['photoPreview', 'certPreview'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'photoPreview') {
      el.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><span>Click or drag to upload photo</span><small>JPG, PNG up to 5MB</small>';
    } else {
      el.innerHTML = '<i class="fa-solid fa-file-arrow-up"></i><span>Upload certificate / license scan</span><small>PDF, JPG, PNG up to 10MB</small>';
    }
  });
  ['photoDrop','certDrop'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.borderStyle = ''; }
  });
  // Reset bio counter
  const counter = document.getElementById('bioCounter');
  if (counter) counter.textContent = '0 / 500';
  // Reset password strength
  const fill  = document.getElementById('pwStrengthFill');
  const label = document.getElementById('pwStrengthLabel');
  if (fill)  { fill.style.width = '0%'; fill.style.background = ''; }
  if (label) { label.textContent = ''; }
  document.querySelectorAll('.rule').forEach(r => {
    r.classList.remove('valid');
    r.querySelector('i').className = 'fa-solid fa-circle-xmark';
  });
}

/* ============ Utility ============ */
function simulateDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ============ Navbar scroll effect ============ */
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 10) {
      navbar.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
    } else {
      navbar.style.boxShadow = '';
    }
  }
});

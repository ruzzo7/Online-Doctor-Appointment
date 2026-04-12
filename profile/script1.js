/* =====================================================
   SCRIPT1.JS — Doctor Manage Profile | Logic
   ===================================================== */

// ── State ──────────────────────────────────────────
const state1 = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  gender: '',
  address: '',
  specialization: '',
  degree: '',
  experience: '',
  fees: '',
  language: '',
  license: '',
  bio: '',
  avatarSrc: null,
  storyOpen: true,
};

// ── DOM Helpers ─────────────────────────────────────
const el1 = (id) => document.getElementById(id);

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage1();
  updatePreview1();
  updateMiniCard1();
  animatePageIn1();
});

// ── Animate page elements on load ───────────────────
function animatePageIn1() {
  const sections = document.querySelectorAll('.form-section, .story-card, .preview-panel, .page-title-bar');
  sections.forEach((s, i) => {
    s.style.opacity = '0';
    s.style.transform = 'translateY(18px)';
    s.style.transition = `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`;
    requestAnimationFrame(() => {
      s.style.opacity = '1';
      s.style.transform = 'translateY(0)';
    });
  });
}

// ── Story Toggle ─────────────────────────────────────
function toggleStory1() {
  const body = el1('story-body1');
  const chevron = el1('chevron-icon1');
  state1.storyOpen = !state1.storyOpen;

  if (state1.storyOpen) {
    body.style.maxHeight = body.scrollHeight + 'px';
    body.style.padding = '0 20px 20px';
    chevron.classList.add('open');
  } else {
    body.style.maxHeight = '0';
    body.style.overflow = 'hidden';
    body.style.padding = '0 20px';
    chevron.classList.remove('open');
  }
}

// Init story body to be open by default with smooth transition
(function initStory1() {
  const body = el1('story-body1');
  if (body) {
    body.style.transition = 'max-height 0.35s ease, padding 0.35s ease';
    body.style.overflow = 'hidden';
    body.style.maxHeight = '800px';
  }
  const chevron = el1('chevron-icon1');
  if (chevron) chevron.classList.add('open');
})();

// ── Preview Toggle (mobile / button) ────────────────
function togglePreview1() {
  const preview = el1('preview-panel1');
  const btn = el1('btn-preview1');
  if (!preview) return;

  const isHidden = preview.style.display === 'none' || preview.style.display === '';
  preview.style.display = isHidden ? '' : 'none';
  btn.innerHTML = isHidden
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Hide Preview`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Preview`;
}

// ── Live Preview Updater ─────────────────────────────
function updatePreview1() {
  // Read values
  state1.firstName = el1('inp-firstname1')?.value.trim() || '';
  state1.lastName = el1('inp-lastname1')?.value.trim() || '';
  state1.email = el1('inp-email1')?.value.trim() || '';
  state1.phone = el1('inp-phone1')?.value.trim() || '';
  state1.specialization = el1('inp-specialization1')?.value || '';
  state1.degree = el1('inp-degree1')?.value.trim() || '';
  state1.experience = el1('inp-experience1')?.value || '';
  state1.fees = el1('inp-fees1')?.value || '';
  state1.language = el1('inp-language1')?.value.trim() || '';
  state1.bio = el1('inp-bio1')?.value.trim() || '';

  // Full name
  const fullName = [
    state1.firstName ? 'Dr.' : '',
    state1.firstName,
    state1.lastName,
  ].filter(Boolean).join(' ') || 'Dr. Full Name';

  el1('preview-name1').textContent = fullName;

  // Initials for preview avatar
  const initials = getInitials1(state1.firstName, state1.lastName);
  const prevAvatar = el1('preview-avatar1');
  if (!state1.avatarSrc) {
    prevAvatar.textContent = initials || 'DR';
  }

  // Spec / Degree
  el1('preview-spec1').textContent = state1.specialization || 'Specialization';
  el1('preview-degree1').textContent = state1.degree || 'Degree / Qualification';

  // Stats with animation
  updateStat1('stat-exp-val1', state1.experience ? state1.experience + ' yrs' : '—');
  updateStat1('stat-fee-val1', state1.fees ? '$' + state1.fees : '—');
  updateStat1('stat-lang-val1', state1.language ? state1.language.split(',')[0].trim() : '—');

  // Bio
  el1('preview-bio1').textContent = state1.bio || 'Your bio will appear here...';

  // Contact
  el1('contact-email1').textContent = state1.email || 'email@hospital.com';
  el1('contact-phone1').textContent = state1.phone || '+1 (555) 000-0000';

  // Mini card
  updateMiniCard1();
}

function updateStat1(elId, newVal) {
  const el = el1(elId);
  if (!el) return;
  if (el.textContent !== newVal) {
    el.classList.remove('updated');
    void el.offsetWidth; // reflow
    el.textContent = newVal;
    el.classList.add('updated');
  }
}

function getInitials1(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();
}

function updateMiniCard1() {
  const name = [state1.firstName, state1.lastName].filter(Boolean).join(' ') || 'Dr. Smith';
  const initials = getInitials1(state1.firstName, state1.lastName) || 'DR';
  const miniName = el1('mini-name-display1');
  const miniAvt = el1('mini-avatar1');
  if (miniName) miniName.textContent = name.length > 16 ? name.slice(0, 15) + '…' : name;
  if (miniAvt && !state1.avatarSrc) miniAvt.textContent = initials;

  // Topbar
  const topAvt = el1('topbar-avatar1');
  if (topAvt && !state1.avatarSrc) topAvt.textContent = initials;
}

// ── Avatar Upload ─────────────────────────────────────
function triggerAvatarUpload1() {
  el1('avatar-file-input1')?.click();
}

function handleAvatarChange1(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast1('File too large. Max size is 5MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    state1.avatarSrc = e.target.result;
    setAvatarImages1(state1.avatarSrc);
  };
  reader.readAsDataURL(file);
}

function setAvatarImages1(src) {
  // Large form avatar
  const large = el1('avatar-large1');
  if (large) {
    large.innerHTML = `<img src="${src}" alt="Doctor photo" />`;
  }
  // Preview card avatar
  const prevAvt = el1('preview-avatar1');
  if (prevAvt) {
    prevAvt.innerHTML = `<img src="${src}" alt="Doctor photo" />`;
  }
  // Sidebar mini
  const mini = el1('mini-avatar1');
  if (mini) {
    mini.innerHTML = `<img src="${src}" alt="Doctor photo" />`;
  }
  // Topbar
  const top = el1('topbar-avatar1');
  if (top) {
    top.innerHTML = `<img src="${src}" alt="Doctor photo" />`;
  }
}

// ── Save Profile ──────────────────────────────────────
function saveProfile1() {
  // Validate required fields
  const required = [
    { id: 'inp-firstname1', label: 'First Name' },
    { id: 'inp-lastname1', label: 'Last Name' },
    { id: 'inp-email1', label: 'Email Address' },
    { id: 'inp-specialization1', label: 'Specialization' },
    { id: 'inp-experience1', label: 'Years of Experience' },
    { id: 'inp-fees1', label: 'Consultation Fees' },
  ];

  for (const field of required) {
    const input = el1(field.id);
    if (!input || !input.value.trim()) {
      input?.focus();
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showFieldError1(input);
      showToast1(`Please fill in: ${field.label}`, 'error');
      return;
    }
  }

  // Email validation
  const email = el1('inp-email1')?.value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    el1('inp-email1')?.focus();
    showToast1('Please enter a valid email address.', 'error');
    return;
  }

  // Save to localStorage
  persistToStorage1();

  // Show save button loading state
  const btn = el1('btn-save1');
  const btnBottom = el1('btn-save-bottom1');
  [btn, btnBottom].forEach(b => { if (b) b.disabled = true; });

  setTimeout(() => {
    [btn, btnBottom].forEach(b => { if (b) b.disabled = false; });
    showToast1('✓ Profile saved and visible to patients!', 'success');
  }, 900);
}

function showFieldError1(input) {
  if (!input) return;
  input.style.borderColor = '#ef4444';
  input.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.25)';
  const clear = () => {
    input.style.borderColor = '';
    input.style.boxShadow = '';
    input.removeEventListener('input', clear);
  };
  input.addEventListener('input', clear);
}

// ── Reset Form ────────────────────────────────────────
function resetForm1() {
  const inputs = ['inp-firstname1', 'inp-lastname1', 'inp-email1', 'inp-phone1',
    'inp-gender1', 'inp-address1', 'inp-specialization1', 'inp-degree1',
    'inp-experience1', 'inp-fees1', 'inp-language1', 'inp-license1', 'inp-bio1'];
  inputs.forEach(id => { const el = el1(id); if (el) el.value = ''; });
  state1.avatarSrc = null;

  // Reset avatars
  const large = el1('avatar-large1');
  if (large) large.innerHTML = 'DR';
  const prevAvt = el1('preview-avatar1');
  if (prevAvt) prevAvt.innerHTML = 'DR';
  el1('mini-avatar1').textContent = 'DR';
  el1('topbar-avatar1').textContent = 'DR';

  updatePreview1();
  showToast1('Form has been reset.', 'success');
}

// ── Sidebar Toggle (mobile) ───────────────────────────
function toggleSidebar1() {
  el1('sidebar1')?.classList.toggle('open');
}

// Click outside to close sidebar on mobile
document.addEventListener('click', (e) => {
  const sidebar = el1('sidebar1');
  const toggle = el1('menu-toggle1');
  if (!sidebar || !toggle) return;
  if (window.innerWidth < 768 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});

// ── Toast Notification ─────────────────────────────────
let toastTimer1 = null;
function showToast1(message, type = 'success') {
  const toast = el1('toast1');
  if (!toast) return;
  clearTimeout(toastTimer1);
  toast.textContent = message;
  toast.className = `toast ${type === 'error' ? 'error' : ''} show`;
  toastTimer1 = setTimeout(() => { toast.classList.remove('show'); }, 3200);
}

// ── localStorage Persistence ──────────────────────────
const STORAGE_KEY1 = 'doctorProfile_v1';

function persistToStorage1() {
  const data = {
    firstName: el1('inp-firstname1')?.value || '',
    lastName: el1('inp-lastname1')?.value || '',
    email: el1('inp-email1')?.value || '',
    phone: el1('inp-phone1')?.value || '',
    gender: el1('inp-gender1')?.value || '',
    address: el1('inp-address1')?.value || '',
    specialization: el1('inp-specialization1')?.value || '',
    degree: el1('inp-degree1')?.value || '',
    experience: el1('inp-experience1')?.value || '',
    fees: el1('inp-fees1')?.value || '',
    language: el1('inp-language1')?.value || '',
    license: el1('inp-license1')?.value || '',
    bio: el1('inp-bio1')?.value || '',
    avatarSrc: state1.avatarSrc,
  };
  try {
    localStorage.setItem(STORAGE_KEY1, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not persist to localStorage:', e);
  }
}

function loadFromStorage1() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY1);
    if (!raw) return;
    const data = JSON.parse(raw);

    const map = {
      'inp-firstname1': data.firstName,
      'inp-lastname1': data.lastName,
      'inp-email1': data.email,
      'inp-phone1': data.phone,
      'inp-gender1': data.gender,
      'inp-address1': data.address,
      'inp-specialization1': data.specialization,
      'inp-degree1': data.degree,
      'inp-experience1': data.experience,
      'inp-fees1': data.fees,
      'inp-language1': data.language,
      'inp-license1': data.license,
      'inp-bio1': data.bio,
    };

    Object.entries(map).forEach(([id, val]) => {
      const input = el1(id);
      if (input && val) input.value = val;
    });

    if (data.avatarSrc) {
      state1.avatarSrc = data.avatarSrc;
      setAvatarImages1(data.avatarSrc);
    }
  } catch (e) {
    console.warn('Could not load from localStorage:', e);
  }
}

// ── Nav active highlighting ───────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    this.classList.add('active');
  });
});

// ── Config ──────────────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
    doctor : { icon: 'stethoscope',  title: 'Welcome Back, Doctor'  },
    patient: { icon: 'user',          title: 'Welcome Back, Patient' },
    admin  : { icon: 'shield-check',  title: 'Welcome Back, Admin'   }
};

function resolveApiUrl() {
    const relativeUrl = '../backend/login.php';
    const isDefaultHttpPort = window.location.protocol.startsWith('http') &&
        (window.location.port === '' || window.location.port === '80' || window.location.port === '443');

    // If frontend is served from a static dev server (for example :5500),
    // route API calls to Apache/XAMPP so PHP can handle POST requests.
    if (!isDefaultHttpPort) {
        return 'http://localhost/Online-Doctor-Appointment/login%20page/backend/login.php';
    }

    return relativeUrl;
}

const API_URL = resolveApiUrl();

// ── State ────────────────────────────────────────────────────────────────────────
let currentRole  = 'doctor';
let showPassword = false;

// ── DOM Refs ─────────────────────────────────────────────────────────────────────
const roleTabs          = document.querySelectorAll('.role-tab');
const loginForm         = document.getElementById('loginForm');
const togglePasswordBtn = document.getElementById('togglePassword');
const passwordInput     = document.getElementById('password');
const eyeIcon           = document.getElementById('eyeIcon');
const roleIconWrap      = document.getElementById('roleIconWrap');
const formTitle         = document.getElementById('formTitle');
const loginButton       = document.getElementById('loginButton');
const btnText           = document.getElementById('btnText');
const messageBox        = document.getElementById('messageBox');
const clockDisplay      = document.getElementById('clockDisplay');
const signupRow         = document.querySelector('.signup-row');

// ── Live Clock ───────────────────────────────────────────────────────────────────
function updateClock() {
    const now  = new Date();
    let h      = now.getHours();
    const m    = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    clockDisplay.textContent = `${String(h).padStart(2,'0')}:${m} ${ampm}`;
}
updateClock();
setInterval(updateClock, 10000);

// ── Init ─────────────────────────────────────────────────────────────────────────
function init() {
    document.body.setAttribute('data-role', currentRole);
    roleTabs.forEach(tab => tab.addEventListener('click', handleRoleChange));
    loginForm.addEventListener('submit', handleLogin);
    togglePasswordBtn.addEventListener('click', handlePasswordToggle);
    updateRoleHeader(currentRole);

    // Live validation listeners
    const inputs = loginForm.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            validateField(input);
            checkFormValidity();
        });
        input.addEventListener('blur', () => {
            validateField(input);
        });
    });
}

const validators = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    password: (v) => v.length > 0
};

function validateField(input) {
    const id = input.id;
    const validator = validators[id];
    if (!validator) return true;

    const isValid = validator(input.value.trim());
    const errorSpan = document.getElementById(`${id}-error`);
    const fieldWrap = input.closest('.field-wrap');

    if (isValid) {
        if (errorSpan) errorSpan.classList.remove('visible');
        if (fieldWrap) {
            fieldWrap.classList.remove('invalid');
            fieldWrap.classList.add('valid');
        }
        return true;
    } else {
        if (input.value.length > 0) {
            if (errorSpan) errorSpan.classList.add('visible');
            if (fieldWrap) {
                fieldWrap.classList.add('invalid');
                fieldWrap.classList.remove('valid');
            }
        } else {
            if (errorSpan) errorSpan.classList.remove('visible');
            if (fieldWrap) fieldWrap.classList.remove('invalid', 'valid');
        }
        return false;
    }
}

function checkFormValidity() {
    const inputs = [...loginForm.querySelectorAll('input[required]')];
    const allValid = inputs.every(input => validators[input.id](input.value.trim()));
    loginButton.disabled = !allValid;
}

function updateRoleHeader(role) {
    const cfg = ROLE_CONFIG[role];
    if (!cfg) return;

    roleIconWrap.innerHTML = `<i data-lucide="${cfg.icon}"></i>`;
    formTitle.textContent = cfg.title;

    // Toggle registration link visibility for admin
    if (signupRow) {
        signupRow.style.display = (role === 'admin') ? 'none' : 'block';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Role Change ──────────────────────────────────────────────────────────────────
function handleRoleChange(e) {
    const btn  = e.currentTarget;
    const role = btn.getAttribute('data-role');

    currentRole = role;
    document.body.setAttribute('data-role', role);

    roleTabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    updateRoleHeader(role);

    hideMessage();
}

// ── Password Toggle ───────────────────────────────────────────────────────────────
function handlePasswordToggle() {
    showPassword = !showPassword;
    passwordInput.type = showPassword ? 'text' : 'password';
    eyeIcon.setAttribute('data-lucide', showPassword ? 'eye-off' : 'eye');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Messages ──────────────────────────────────────────────────────────────────────
function showMessage(text, type) {
    messageBox.textContent   = text;
    messageBox.className     = 'message-box ' + type;
    messageBox.style.display = 'block';
}
function hideMessage() {
    messageBox.style.display = 'none';
    messageBox.textContent   = '';
    messageBox.className     = 'message-box';
}

// ── Login Submit ──────────────────────────────────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    hideMessage();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Loading state
    loginButton.disabled = true;
    btnText.textContent  = 'Signing in…';

    try {
        const res  = await fetch(API_URL, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ email, password, role: currentRole })
        });
        
        let data;
        const contentType = res.headers.get('content-type');
        const rawText = await res.clone().text();

        if (contentType && contentType.includes('application/json')) {
            try {
                data = JSON.parse(rawText);
            } catch (jsonErr) {
                throw new Error(`Invalid JSON response from server: ${rawText}`);
            }
        } else {
            throw new Error(rawText || `Server returned ${res.status} ${res.statusText}`);
        }

        if (data.success) {
            showMessage(data.message, 'success');
            // Store user info for dashboard access
            if (data.user) {
                localStorage.setItem('medicare_user', JSON.stringify(data.user));
            }
            // Redirect to dashboard after 1.5 s
            setTimeout(() => { 
                if (currentRole === 'patient') {
                    window.location.href = `../../Patient/frontend/index.html`; 
                } else {
                    window.location.href = `../../${currentRole}/index.html`; 
                }
            }, 1500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (err) {
        showMessage(`⚠️ Connection Error: ${err.message}`, 'error');
        console.error('Fetch Error:', err);
    } finally {
        loginButton.disabled = false;
        btnText.textContent  = 'Sign In';
    }
}

// ── Signup Link Handling ────────────────────────────────────────────────────────
function handleSignupRedirect(e) {
    e.preventDefault();
    if (currentRole === 'patient' || currentRole === 'doctor') {
        window.location.href = `register.html?role=${currentRole}`;
    } else {
        showMessage('Signup is only available for Doctors and Patients.', 'error');
    }
}

// ── Boot ──────────────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        const signupLinks = document.querySelectorAll('.signup-link, .signup-row .link-btn');
        signupLinks.forEach(link => link.addEventListener('click', handleSignupRedirect));
    });
} else {
    init();
    const signupLinks = document.querySelectorAll('.signup-link, .signup-row .link-btn');
    signupLinks.forEach(link => link.addEventListener('click', handleSignupRedirect));
}

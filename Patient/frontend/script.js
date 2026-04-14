/**
 * Patient Dashboard Main Script
 * Handles section navigation and doctor filtering.
 */

// ── API URLs ───────────────────────────────────────────────────────────────────
function resolveApiUrl(endpoint) {
  const baseUrl = '../backend/';
  const isDefaultHttpPort = window.location.protocol.startsWith('http') &&
    (window.location.port === '' || window.location.port === '80' || window.location.port === '443');

  if (!isDefaultHttpPort) {
    return `http://localhost/Online-Doctor-Appointment/Patient/backend/${endpoint}`;
  }

  return baseUrl + endpoint;
}

const GET_PROFILE_URL = resolveApiUrl('get_profile.php');
const UPDATE_PROFILE_URL = resolveApiUrl('update_profile.php');
const GET_DOCTORS_URL = resolveApiUrl('get_doctors.php');
const GET_APPOINTMENTS_URL = resolveApiUrl('get_appointments.php');
const BOOK_APPOINTMENT_URL = resolveApiUrl('book_appointment.php');

let doctorsCache = [];

// ── Auth Check ─────────────────────────────────────────────────────────────────
function checkAuth() {
  const user = JSON.parse(localStorage.getItem('medicare_user'));
  if (!user || user.role !== 'patient') {
    window.location.href = '../../login page/frontend/index.html';
    return null;
  }
  return user;
}

// ── Load Profile ───────────────────────────────────────────────────────────────
async function loadProfile() {
  const user = checkAuth();
  if (!user) return;

  try {
    const res = await fetch(GET_PROFILE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id })
    });

    const data = await res.json();
    if (data.success) {
      document.getElementById('fullName').value = data.profile.full_name || '';
      document.getElementById('age').value = data.profile.age || '';
      document.getElementById('email').value = data.profile.email || '';
      document.getElementById('phone').value = data.profile.phone || '';
    } else {
      alert('Failed to load profile: ' + data.message);
    }
  } catch (err) {
    console.error('Error loading profile:', err);
    alert('Error loading profile');
  }
}

// ── Save Profile ───────────────────────────────────────────────────────────────
async function saveProfile() {
  const user = checkAuth();
  if (!user) return;

  const fullName = document.getElementById('fullName').value.trim();
  const age = parseInt(document.getElementById('age').value, 10);
  const phone = document.getElementById('phone').value.trim();

  if (!validators.fullName(fullName) || !validators.age(age) || !validators.phone(phone)) {
    alert('Please correct the highlighted fields before saving.');
    return;
  }

  try {
    const res = await fetch(UPDATE_PROFILE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        full_name: fullName,
        phone: phone,
        age: age
      })
    });

    const data = await res.json();
    if (data.success) {
      alert(data.message);
      setEditMode(false);
    } else {
      alert('Failed to update profile: ' + data.message);
    }
  } catch (err) {
    console.error('Error saving profile:', err);
    alert('Error saving profile');
  }
}

function setEditMode(enabled) {
  ['fullName', 'age', 'phone'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.disabled = !enabled;
  });

  if (saveBtn) {
    saveBtn.classList.toggle('hidden', !enabled);
    saveBtn.disabled = !enabled;
  }
  if (editBtn) {
    editBtn.classList.toggle('hidden', enabled);
  }
}

/**
 * Navigate between different dashboard sections
 * @param {Event|null} event - The click event
 * @param {string} sectionId - The ID of the section to show
 */
function showSection(event, sectionId) {
  if (event) event.preventDefault();

  // Hide all sections except the active one
  const sections = document.querySelectorAll('main section');
  sections.forEach(section => {
    section.classList.toggle('hidden', section.id !== sectionId);
  });

  // Update navigation active states (Sidebar)
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    const isTarget = link.id === sectionId + 'Nav';
    link.classList.toggle('active', isTarget);
  });

  // Update Top Profile Icon highlight
  const profileBtn = document.getElementById('profileTabBtn');
  if (profileBtn) {
    profileBtn.classList.toggle('active', sectionId === 'profile');
  }

  // Update URL hash for history/refresh support
  if (sectionId) {
    window.location.hash = sectionId;
  }

  if (sectionId === 'appointments') {
    loadPatientAppointments();
  }
}

/**
 * Filter the doctor cards grid based on user input
 */
function filterDoctors() {
  const specialtySelect = document.getElementById("specialty");
  const nameInput = document.getElementById("doctorName");

  if (!specialtySelect || !nameInput) return;

  const specialty = specialtySelect.value.toLowerCase();
  const name = nameInput.value.toLowerCase();
  const doctorCards = document.querySelectorAll(".doctor-card");
  const doctorState = document.getElementById('doctorListState');

  // Performance-friendly filtering using requestAnimationFrame
  window.requestAnimationFrame(() => {
    let visibleCount = 0;
    doctorCards.forEach(doc => {
      const docName = (doc.getAttribute("data-name") || "").toLowerCase();
      const docSpecialty = (doc.getAttribute("data-specialty") || "").toLowerCase();

      const matchesSpecialty = specialty === "" || docSpecialty.includes(specialty);
      const matchesName = name === "" || docName.includes(name);

      const visible = matchesSpecialty && matchesName;
      doc.style.display = visible ? "flex" : "none";
      if (visible) visibleCount += 1;
    });

    if (doctorState) {
      doctorState.style.display = visibleCount === 0 ? 'flex' : 'none';
      doctorState.innerHTML = visibleCount === 0
        ? '<p style="color: var(--text-muted);">No doctors match your search.</p>'
        : '';
    }
  });
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function timeLabel(value) {
  if (!value) return 'Not set';
  const [hourString, minuteString] = value.split(':');
  let hour = Number(hourString);
  const minute = minuteString || '00';
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${minute} ${period}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderDoctors(doctors) {
  const list = document.getElementById('doctorList');
  if (!list) return;

  doctorsCache = Array.isArray(doctors) ? doctors : [];

  if (!Array.isArray(doctors) || doctors.length === 0) {
    console.log('[Patient] No doctors to render');
    list.innerHTML = '<div class="empty-state" id="doctorListState"><p style="color: var(--text-muted);">No doctors found yet.</p></div>';
    return;
  }

  console.log(`[Patient] Rendering ${doctors.length} doctor(s)`);

  list.innerHTML = doctors.map((doc) => {
    const name = doc.full_name || doc.email || 'Doctor';
    const specialization = doc.specialization || 'General Physician';
    const experience = doc.experience ? `${doc.experience} years` : 'Not set';
    const fee = formatMoney(doc.consultation_fee);
    const status = doc.status || 'pending';
    const availableFrom = timeLabel(doc.available_from);
    const availableTo = timeLabel(doc.available_to);
    const availability = `${availableFrom} - ${availableTo}`;

    const safeName = escapeHtml(name);
    const safeSpecialization = escapeHtml(specialization);
    const safeExperience = escapeHtml(experience);
    const safeFee = escapeHtml(fee);
    const safeAvailability = escapeHtml(availability);
    const safeStatus = escapeHtml(status);
    const safeEmail = escapeHtml(doc.email || 'N/A');

    return `
      <div class="doctor-card" data-name="${safeName}" data-specialty="${safeSpecialization}">
        <div class="doctor-card__name">${safeName}</div>
        <div class="doctor-card__details">
          <div class="detail-pill"><strong>Specialty:</strong> ${safeSpecialization}</div>
          <div class="detail-pill"><strong>Experience:</strong> ${safeExperience}</div>
          <div class="detail-pill"><strong>Fee:</strong> ${safeFee}</div>
          <div class="detail-pill"><strong>Available:</strong> ${safeAvailability}</div>
          <div class="detail-pill"><strong>Status:</strong> ${safeStatus}</div>
          <div class="detail-pill"><strong>Email:</strong> ${safeEmail}</div>
        </div>
        <div class="doctor-card__actions">
          <button
            class="btn book-appointment-btn"
            type="button"
            data-doctor-id="${Number(doc.id) || 0}"
            data-doctor-name="${encodeURIComponent(name)}"
            data-doctor-specialization="${encodeURIComponent(specialization)}"
            data-doctor-availability="${encodeURIComponent(availability)}"
            data-doctor-fee="${encodeURIComponent(String(fee))}"
          >Book Appointment</button>
        </div>
      </div>
    `;
  }).join('');

  const state = document.getElementById('doctorListState');
  if (state) state.remove();

  filterDoctors();
}

function openBookingModal(doctorId, doctorName, doctorSpecialization, availabilityText, feeText) {
  console.log(`[Patient] openBookingModal called - doctorId=${doctorId}, name=${doctorName}`);
  const modal = document.getElementById('bookAppointmentModal');
  const bookingForm = document.getElementById('bookingForm');
  if (!modal) {
    console.error('[Patient] bookAppointmentModal not found');
    return;
  }

  if (bookingForm) {
    bookingForm.reset();
  }

  document.getElementById('bookingDoctorId').value = doctorId;
  document.getElementById('bookingDoctorName').value = doctorName;
  document.getElementById('bookingDoctorSpecialization').value = doctorSpecialization;
  document.getElementById('bookingDoctorAvailability').value = `${availabilityText} | Fee: ${feeText}`;
  document.getElementById('bookingDoctorSummary').textContent = `Book an appointment with ${doctorName}`;

  console.log('[Patient] Modal class list before:', modal.className);
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '16px';
  document.body.style.overflow = 'hidden';
  modal.scrollTop = 0;
  const modalCard = modal.querySelector('.modal-card');
  if (modalCard) {
    modalCard.scrollTop = 0;
    modalCard.style.maxWidth = '480px';
    modalCard.style.width = '100%';
    modalCard.style.maxHeight = '90vh';
    modalCard.style.overflowY = 'auto';
  }
  const bookingDate = document.getElementById('bookingDate');
  if (bookingDate) {
    bookingDate.focus();
  }
  console.log('[Patient] Modal class list after:', modal.className);
}

function closeBookingModal() {
  const modal = document.getElementById('bookAppointmentModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  document.body.style.overflow = '';
}

function formatAppointmentDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Not set';
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderPatientAppointments(appointments) {
  const list = document.getElementById('patientAppointmentsList');
  const summary = document.getElementById('patientAppointmentsSummary');
  if (!list || !summary) return;

  const records = Array.isArray(appointments) ? appointments : [];
  const upcoming = records.filter(item => item.status === 'upcoming').length;
  const completed = records.filter(item => item.status === 'completed').length;
  const cancelled = records.filter(item => item.status === 'cancelled').length;

  summary.innerHTML = `
    <div class="summary-pill"><strong>Total:</strong> ${records.length}</div>
    <div class="summary-pill"><strong>Upcoming:</strong> ${upcoming}</div>
    <div class="summary-pill"><strong>Completed:</strong> ${completed}</div>
    <div class="summary-pill"><strong>Cancelled:</strong> ${cancelled}</div>
  `;

  if (records.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p style="color: var(--text-muted);">You have not booked any appointments yet.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = records.map((appt) => {
    const doctorName = appt.doctor_name || 'Doctor';
    const doctorSpec = appt.doctor_specialization || 'Specialist';
    const appointmentDate = formatAppointmentDate(appt.appointment_date);
    const reason = appt.reason || 'No reason provided';
    return `
      <article class="appointment-card">
        <div class="appointment-card__top">
          <div>
            <h3>${doctorName}</h3>
            <p>${doctorSpec}</p>
          </div>
          <span class="appointment-status appointment-status--${appt.status}">${appt.status}</span>
        </div>
        <div class="appointment-card__body">
          <div class="appointment-meta"><strong>Date:</strong> ${appointmentDate}</div>
          <div class="appointment-meta"><strong>Hospital:</strong> ${appt.hospital || 'N/A'}</div>
          <div class="appointment-meta"><strong>Fee:</strong> ${formatMoney(appt.consultation_fee)}</div>
          <div class="appointment-meta"><strong>Doctor Email:</strong> ${appt.doctor_email || 'N/A'}</div>
          <div class="appointment-meta appointment-meta--full"><strong>Reason:</strong> ${reason}</div>
        </div>
      </article>
    `;
  }).join('');
}

async function loadPatientAppointments() {
  const user = checkAuth();
  if (!user) return;

  const list = document.getElementById('patientAppointmentsList');
  if (list) {
    list.innerHTML = '<div class="empty-state"><p style="color: var(--text-muted);">Loading appointments...</p></div>';
  }

  try {
    const res = await fetch(`${GET_APPOINTMENTS_URL}?patient_id=${user.id}`, { method: 'GET' });
    const data = await res.json();

    if (data.success) {
      renderPatientAppointments(data.data);
    } else if (list) {
      list.innerHTML = `<div class="empty-state"><p style="color: var(--text-muted);">${data.message || 'Failed to load appointments.'}</p></div>`;
    }
  } catch (err) {
    console.error('Error loading patient appointments:', err);
    if (list) {
      list.innerHTML = '<div class="empty-state"><p style="color: var(--text-muted);">Connection error loading appointments.</p></div>';
    }
  }
}

async function submitBooking(event) {
  if (event) event.preventDefault();

  const modal = document.getElementById('bookAppointmentModal');
  if (!modal || modal.classList.contains('hidden')) {
    console.warn('[Patient] Booking blocked because modal is not open');
    return;
  }

  const user = checkAuth();
  if (!user) return;

  const doctorId = document.getElementById('bookingDoctorId').value;
  const doctorName = document.getElementById('bookingDoctorName').value || 'Selected doctor';
  const date = document.getElementById('bookingDate').value;
  const time = document.getElementById('bookingTime').value;
  const reason = document.getElementById('bookingReason').value.trim();

  if (!doctorId || !date || !time || !reason) {
    alert('Please fill in all booking details.');
    return;
  }

  const proceed = window.confirm(
    `Confirm appointment with ${doctorName} on ${date} at ${time}?`
  );
  if (!proceed) {
    return;
  }

  const confirmBtn = document.getElementById('confirmBookingBtn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Booking...';
  }

  console.log(`[Patient] Booking appointment - doctor_id=${doctorId}, date=${date}, time=${time}`);

  try {
    const res = await fetch(BOOK_APPOINTMENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: user.id,
        doctor_id: Number(doctorId),
        appointment_date: `${date}T${time}`,
        reason
      })
    });

    const data = await res.json();
    console.log(`[Patient] Booking response:`, data);
    if (data.success) {
      if (data.refresh_token) {
        console.log(`[Patient] Setting refresh_token=${data.refresh_token}`);
        localStorage.setItem('appointments_refresh_token', String(data.refresh_token));
      }
      alert(data.message);
      closeBookingModal();
      loadPatientAppointments();
      showSection(null, 'appointments');
    } else {
      alert(data.message || 'Failed to book appointment');
    }
  } catch (err) {
    console.error('Booking error:', err);
    alert('Error booking appointment');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Booking';
    }
  }
}

async function loadDoctors() {
  const list = document.getElementById('doctorList');
  if (list) {
    list.innerHTML = '<div class="empty-state" id="doctorListState"><p style="color: var(--text-muted);">Loading doctors...</p></div>';
  }

  console.log('[Patient] Fetching doctors from:', GET_DOCTORS_URL);

  try {
    const res = await fetch(GET_DOCTORS_URL, { method: 'GET' });
    const data = await res.json();
    console.log('[Patient] Doctors response:', data);
    if (data.success) {
      console.log(`[Patient] Successfully fetched ${data.data?.length || 0} doctors`);
      renderDoctors(data.data);
    } else {
      console.error('[Patient] Fetch failed:', data.message);
      if (list) list.innerHTML = '<div class="empty-state" id="doctorListState"><p style="color: var(--text-muted);">Failed to load doctors.</p></div>';
    }
  } catch (err) {
    console.error('Error loading doctors:', err);
    if (list) list.innerHTML = '<div class="empty-state" id="doctorListState"><p style="color: var(--text-muted);">Connection error loading doctors.</p></div>';
  }
}

// ── Profile Validation Logic ────────────────────────────────────────────────
const profileForm = document.getElementById('profileForm');
const saveBtn = document.getElementById('saveProfileBtn');
const editBtn = document.getElementById('editProfileBtn');

const validators = {
  fullName: (v) => v.length >= 3 && /^[a-zA-Z\s]+$/.test(v),
  age: (v) => v !== '' && v >= 1 && v <= 120,
  phone: (v) => /^\d{10}$/.test(v),
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
};

function validateField(input) {
  const id = input.id;
  const validator = validators[id];
  if (!validator) return true;

  const isValid = validator(input.value.trim());
  const errorSpan = document.getElementById(`${id}-error`);
  const formGroup = input.closest('.form-group');

  if (isValid) {
    if (errorSpan) errorSpan.classList.remove('visible');
    if (formGroup) {
      formGroup.classList.remove('invalid');
      formGroup.classList.add('valid');
    }
    return true;
  } else {
    if (errorSpan) errorSpan.classList.add('visible');
    if (formGroup) {
      formGroup.classList.add('invalid');
      formGroup.classList.remove('valid');
    }
    return false;
  }
}

function checkFormValidity() {
  if (!profileForm) return;
  const inputs = [...profileForm.querySelectorAll('input[required]')];
  const allValid = inputs.every(input => {
    // Skip disabled fields for validation check if needed, but here email is disabled
    if (input.disabled) return true;
    return validators[input.id](input.value.trim());
  });
  if (saveBtn) saveBtn.disabled = !allValid;
}

/**
 * DOM Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  // Check auth first
  const user = checkAuth();
  if (!user) return;

  // Sync view with URL hash or default to 'doctors'
  const currentHash = window.location.hash.replace('#', '');
  const validSections = ['profile', 'doctors', 'appointments', 'notifications', 'records', 'payments'];
  const initialSection = validSections.includes(currentHash) ? currentHash : 'doctors';

  showSection(null, initialSection);

  // Load profile data
  loadProfile();
  loadDoctors();
  setEditMode(false);

  // Attach validation listeners
  if (profileForm) {
    const inputs = profileForm.querySelectorAll('input[required]');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        validateField(input);
        checkFormValidity();
      });
      input.addEventListener('blur', () => validateField(input));
    });

    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProfile();
    });
  }

  if (editBtn) {
    editBtn.addEventListener('click', () => setEditMode(true));
  }

  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  }

  const confirmBookingBtn = document.getElementById('confirmBookingBtn');
  if (confirmBookingBtn) {
    confirmBookingBtn.addEventListener('click', submitBooking);
  }

  const doctorList = document.getElementById('doctorList');
  if (doctorList) {
    doctorList.addEventListener('click', (event) => {
      const button = event.target.closest('.book-appointment-btn');
      if (!button) return;

      const doctorId = Number(button.dataset.doctorId || 0);
      const doctorName = decodeURIComponent(button.dataset.doctorName || 'Doctor');
      const doctorSpecialization = decodeURIComponent(button.dataset.doctorSpecialization || 'General Physician');
      const availabilityText = decodeURIComponent(button.dataset.doctorAvailability || 'Not set');
      const feeText = decodeURIComponent(button.dataset.doctorFee || 'N/A');

      openBookingModal(doctorId, doctorName, doctorSpecialization, availabilityText, feeText);
    });
  }

  const bookingModal = document.getElementById('bookAppointmentModal');
  if (bookingModal) {
    bookingModal.addEventListener('click', (event) => {
      if (event.target === bookingModal) closeBookingModal();
    });
  }

  const refreshAppointmentsBtn = document.getElementById('refreshAppointmentsBtn');
  if (refreshAppointmentsBtn) {
    refreshAppointmentsBtn.addEventListener('click', loadPatientAppointments);
  }

  window.addEventListener('storage', (event) => {
    if (event.key === 'appointments_refresh_token') {
      loadDoctors();
      if (window.location.hash.replace('#', '') === 'appointments') {
        loadPatientAppointments();
      }
      if (document.getElementById('profile').classList.contains('hidden') === false) {
        // no-op; patient dashboard doesn't show appointments list yet
      }
    }
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('medicare_user');
  window.location.href = '../../login page/frontend/index.html';
}

// Expose functions to global scope for HTML event handlers
window.showSection = showSection;
window.filterDoctors = filterDoctors;
window.logout = logout;
window.openBookingModal = openBookingModal;
window.closeBookingModal = closeBookingModal;
window.loadPatientAppointments = loadPatientAppointments;

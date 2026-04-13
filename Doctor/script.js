// ═══════════════════════════════════════════════════════════
// Doctor Dashboard — MediCare Pro
// ═══════════════════════════════════════════════════════════

// ── Config ──────────────────────────────────────────────────
function resolveApiBase() {
    const isDefaultPort = window.location.port === '' || window.location.port === '80' || window.location.port === '443';
    if (!isDefaultPort) {
        return 'http://localhost/Online-Doctor-Appointment/Doctor/backend';
    }
    return 'backend';
}

const API_BASE = resolveApiBase();
let currentUser = null;
let allAppointments = [];
let currentFilter = 'all';

// ── Auth Check ──────────────────────────────────────────────
function checkAuth() {
    const stored = localStorage.getItem('medicare_user');
    if (!stored) {
        // No user stored — allow demo mode with doctor_id = 2 (from seed data)
        currentUser = { id: 2, email: 'doctor@gmail.com', role: 'doctor', status: 'active' };
    } else {
        currentUser = JSON.parse(stored);
        if (currentUser.role !== 'doctor') {
            window.location.href = '../login page/frontend/index.html';
            return;
        }
    }

    // Populate UI
    document.getElementById('sidebarDoctorName').textContent = currentUser.email.split('@')[0].replace(/\./g, ' ');
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profileStatus').value = currentUser.status;
}

// ── Clock ──────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    document.getElementById('topbarClock').textContent = `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    document.getElementById('topbarDate').textContent = now.toLocaleDateString('en-US', options);
}

// ── Section Switching ──────────────────────────────────────
function switchSection(section) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Update sections
    document.querySelectorAll('.dashboard-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `section-${section}`);
    });

    // Update topbar
    const titles = {
        appointments: { title: 'Appointments', sub: 'Manage your patient appointments and prescriptions' },
        prescriptions: { title: 'Prescriptions', sub: 'View all prescriptions you have written' },
        profile: { title: 'My Profile', sub: 'View and manage your account details' }
    };
    const t = titles[section] || titles.appointments;
    document.getElementById('topbarTitle').textContent = t.title;
    document.getElementById('topbarSubtitle').textContent = t.sub;
}

// ── Data Fetching ──────────────────────────────────────────
async function fetchAppointments() {
    try {
        const res = await fetch(`${API_BASE}/get_appointments.php?doctor_id=${currentUser.id}`);
        const result = await res.json();
        if (result.success) {
            allAppointments = result.data;
            updateStats();
            renderAppointments();
        } else {
            console.error('Failed to fetch:', result.message);
            showToast('Failed to load appointments', 'error');
        }
    } catch (err) {
        console.error('Fetch error:', err);
        showToast('Connection error loading appointments', 'error');
    }
}

async function loadDoctorProfile() {
    try {
        const res = await fetch(`${API_BASE}/get_profile.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });

        const result = await res.json();
        if (!result.success || !result.profile) {
            showToast(result.message || 'Failed to load profile', 'error');
            return;
        }

        const profile = result.profile;
        document.getElementById('profileEmail').value = profile.email || currentUser.email || '';
        document.getElementById('profileStatus').value = profile.status || currentUser.status || '';
        document.getElementById('profileFullName').value = profile.full_name || '';
        document.getElementById('profileSpecialization').value = profile.specialization || '';
        document.getElementById('profileLicense').value = profile.license_number || '';
        document.getElementById('profileExperience').value = profile.experience ?? '';
        document.getElementById('profileHospital').value = profile.hospital || '';
        document.getElementById('profileAvailableFrom').value = profile.available_from || '';
        document.getElementById('profileAvailableTo').value = profile.available_to || '';
        document.getElementById('profileBio').value = profile.bio || '';

        if (profile.full_name) {
            document.getElementById('sidebarDoctorName').textContent = profile.full_name;
        }
        if (profile.specialization) {
            document.getElementById('sidebarDoctorSpec').textContent = profile.specialization;
        }
    } catch (err) {
        console.error('Profile fetch error:', err);
        showToast('Connection error loading profile', 'error');
    }
}

async function saveDoctorProfile() {
    const fullName = document.getElementById('profileFullName').value.trim();
    const specialization = document.getElementById('profileSpecialization').value.trim();
    const experience = Number(document.getElementById('profileExperience').value || 0);
    const hospital = document.getElementById('profileHospital').value.trim();
    const availableFrom = document.getElementById('profileAvailableFrom').value;
    const availableTo = document.getElementById('profileAvailableTo').value;
    const bio = document.getElementById('profileBio').value.trim();

    if (!fullName || !specialization) {
        showToast('Full name and specialization are required', 'error');
        return;
    }

    if (availableFrom && availableTo && availableFrom >= availableTo) {
        showToast('Available From must be earlier than Available To', 'error');
        return;
    }

    const saveBtn = document.getElementById('profileSaveBtn');
    saveBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/update_profile.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                full_name: fullName,
                specialization,
                experience,
                hospital,
                available_from: availableFrom,
                available_to: availableTo,
                bio
            })
        });

        const result = await res.json();
        if (result.success) {
            showToast('Profile updated successfully!', 'success');
            document.getElementById('sidebarDoctorName').textContent = fullName;
            document.getElementById('sidebarDoctorSpec').textContent = specialization;
        } else {
            showToast(result.message || 'Failed to update profile', 'error');
        }
    } catch (err) {
        console.error('Profile save error:', err);
        showToast('Connection error saving profile', 'error');
    } finally {
        saveBtn.disabled = false;
    }
}

function updateStats() {
    const total = allAppointments.length;
    const upcoming = allAppointments.filter(a => a.status === 'upcoming').length;
    const completed = allAppointments.filter(a => a.status === 'completed').length;

    animateCount('statTotal', total);
    animateCount('statUpcoming', upcoming);
    animateCount('statCompleted', completed);
    animateCount('statPrescriptions', completed); // prescriptions = completed appointments

    // Update nav badge
    const badge = document.getElementById('navBadgeUpcoming');
    badge.textContent = upcoming;
    badge.style.display = upcoming > 0 ? 'inline' : 'none';
}

function animateCount(elementId, endValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const duration = 400;
    const frameRate = 16;
    const totalFrames = Math.ceil(duration / frameRate);
    let frame = 0;

    const counter = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        el.textContent = Math.round(start + (endValue - start) * progress);
        if (frame >= totalFrames) {
            clearInterval(counter);
            el.textContent = endValue;
        }
    }, frameRate);
}

// ── Filter & Search ─────────────────────────────────────────
function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderAppointments();
}

function handleSearch() {
    renderAppointments();
}

// ── Render Appointments ─────────────────────────────────────
function renderAppointments() {
    const tableBody = document.getElementById('tableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    let filtered = allAppointments;

    // Apply status filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(a => a.status === currentFilter);
    }

    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(a =>
            (a.patient_name || '').toLowerCase().includes(searchTerm) ||
            (a.patient_email || '').toLowerCase().includes(searchTerm) ||
            (a.reason || '').toLowerCase().includes(searchTerm)
        );
    }

    // Update count
    document.getElementById('tableCount').textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <div class="empty-state">
                <i data-lucide="calendar-x-2"></i>
                <div class="empty-state-title">No appointments found</div>
                <div class="empty-state-text">There are no appointments matching your current filter.</div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    let html = `
        <table class="appointments-table">
            <thead>
                <tr>
                    <th>Patient</th>
                    <th>Date & Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtered.forEach(appt => {
        const name = appt.patient_name || 'Unknown';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const date = new Date(appt.appointment_date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const reason = appt.reason || 'No reason provided';
        const truncatedReason = reason.length > 45 ? reason.substring(0, 45) + '…' : reason;

        const actionBtn = appt.status === 'upcoming'
            ? `<button class="action-btn action-btn-primary" onclick="openPrescriptionModal(${appt.appointment_id}, '${name.replace(/'/g, "\\'")}', '${appt.patient_age || "N/A"}', '${reason.replace(/'/g, "\\'")}', ${appt.patient_id})">
                   <i data-lucide="pen-line"></i> Prescribe
               </button>`
            : `<button class="action-btn action-btn-outline" disabled>
                   <i data-lucide="check"></i> Done
               </button>`;

        html += `
            <tr>
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar">${initials}</div>
                        <div>
                            <div class="patient-info-name">${name}</div>
                            <div class="patient-info-email">${appt.patient_email || ''}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 600; color: var(--text-dark);">${dateStr}</div>
                    <div style="font-size: 11px; color: var(--text-soft); margin-top: 2px;">${timeStr}</div>
                </td>
                <td>
                    <span title="${reason}">${truncatedReason}</span>
                </td>
                <td>
                    <span class="status-badge status-${appt.status}">${appt.status}</span>
                </td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    tableBody.innerHTML = html;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Prescription Modal ────────────────────────────────────
function openPrescriptionModal(appointmentId, patientName, patientAge, reason, patientId) {
    document.getElementById('rxAppointmentId').value = appointmentId;
    document.getElementById('rxPatientId').value = patientId;
    document.getElementById('modalPatientName').textContent = patientName;
    document.getElementById('modalPatientAge').textContent = patientAge ? `${patientAge} years` : 'N/A';
    document.getElementById('modalPatientReason').textContent = reason;

    // Clear form
    document.getElementById('rxDiagnosis').value = '';
    document.getElementById('rxMedicines').value = '';
    document.getElementById('rxInstructions').value = '';
    document.getElementById('rxFollowUp').value = '';

    document.getElementById('prescriptionModal').classList.add('active');
}

function closeModal() {
    document.getElementById('prescriptionModal').classList.remove('active');
}

// ── Save Prescription ──────────────────────────────────────
document.getElementById('prescriptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('rxSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Saving...';

    const payload = {
        appointment_id: document.getElementById('rxAppointmentId').value,
        doctor_id: currentUser.id,
        patient_id: document.getElementById('rxPatientId').value,
        diagnosis: document.getElementById('rxDiagnosis').value.trim(),
        medicines: document.getElementById('rxMedicines').value.trim(),
        instructions: document.getElementById('rxInstructions').value.trim(),
        follow_up_date: document.getElementById('rxFollowUp').value || null
    };

    try {
        const res = await fetch(`${API_BASE}/save_prescription.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (result.success) {
            showToast('Prescription saved successfully!', 'success');
            closeModal();
            fetchAppointments(); // Refresh the list
        } else {
            showToast(result.message || 'Failed to save prescription', 'error');
        }
    } catch (err) {
        console.error('Save error:', err);
        showToast('Connection error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = 'Save Prescription';
    }
});

// Close modal on overlay click
document.getElementById('prescriptionModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ── Toast Notification ─────────────────────────────────────
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

// ── Sign Out ───────────────────────────────────────────────
document.getElementById('signOutBtn').addEventListener('click', (e) => {
    localStorage.removeItem('medicare_user');
});

// ── Boot ────────────────────────────────────────────────────
checkAuth();
updateClock();
setInterval(updateClock, 10000);
fetchAppointments();
loadDoctorProfile();

const profileSaveBtn = document.getElementById('profileSaveBtn');
if (profileSaveBtn) {
    profileSaveBtn.addEventListener('click', saveDoctorProfile);
}

if (typeof lucide !== 'undefined') lucide.createIcons();

// Expose functions for inline handlers
window.switchSection = switchSection;
window.setFilter = setFilter;
window.handleSearch = handleSearch;
window.openPrescriptionModal = openPrescriptionModal;
window.closeModal = closeModal;
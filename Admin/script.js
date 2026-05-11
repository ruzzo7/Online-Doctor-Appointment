// ── Fetch Operations ──────────────────────────────────────────────────────────

let currentAdminView = 'pending';

async function fetchData(url) {
    console.log(`[Admin] Fetching: ${url}`);
    try {
        const res = await fetch(url);
        console.log(`[Admin] Response status: ${res.status}`);
        const result = await res.json();
        console.log(`[Admin] JSON result:`, result);
        return result.success ? result.data : null;
    } catch (err) {
        console.error(`[Admin] Error fetching ${url}:`, err);
        return null;
    }
}

async function postData(url, payload) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (err) {
        console.error(`[Admin] Error posting to ${url}:`, err);
        return { success: false, message: 'Network error. Please try again.' };
    }
}

async function updateStatus(userId, status) {
    try {
        const res = await fetch('backend/update_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, status: status })
        });
        const result = await res.json();
        if (result.success) {
            refreshDashboard();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error('Error updating status:', err);
    }
}

// ── Render Operations ──────────────────────────────────────────────────────────

function animateCount(elementId, endValue) {
    const element = document.getElementById(elementId);
    console.log(`[Admin] animateCount: ${elementId}, current: "${element?.textContent}", target: ${endValue}`);
    if (!element) {
        console.error(`[Admin] Element not found: ${elementId}`);
        return;
    }
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 500;
    const frameRate = 16;
    const totalFrames = Math.ceil(duration / frameRate);
    let frame = 0;

    const counter = setInterval(() => {
        frame += 1;
        const progress = frame / totalFrames;
        const current = Math.round(startValue + (endValue - startValue) * progress);
        element.textContent = current;

        if (frame >= totalFrames) {
            clearInterval(counter);
            element.textContent = endValue;
        }
    }, frameRate);
}

async function renderStats() {
    const stats = await fetchData('backend/get_stats.php');
    console.log('[Admin] Stats response:', stats);
    if (!stats) {
        document.getElementById('summaryText').textContent = 'Error loading stats';
        return;
    }

    animateCount('totalDoctors', stats.totalDoctors);
    animateCount('totalPatients', stats.totalPatients);
    animateCount('pendingRequests', stats.pendingRequests);
    animateCount('inactiveDoctors', stats.inactiveDoctors);

    const summaryText = `${stats.totalDoctors} doctors, ${stats.totalPatients} patients, ${stats.pendingRequests} pending requests.`;
    document.getElementById('summaryText').textContent = summaryText;
}

async function renderPendingRequests() {
    const doctors = await fetchData('backend/get_pending_doctors.php');
    console.log('[Admin] Pending doctors response:', doctors);
    const requestList = document.getElementById('requestList');
    if (!requestList) return;
    
    requestList.innerHTML = '';

    if (!doctors || doctors.length === 0) {
        requestList.innerHTML = '<li class="request-item"><p>No pending signup requests.</p></li>';
        return;
    }

    doctors.forEach((doc) => {
        const item = document.createElement('li');
        item.className = 'request-item';
        item.innerHTML = `
            <div>
                <h4>${doc.full_name}</h4>
                <p>${doc.specialization} | License: ${doc.license_number} | Exp: ${doc.experience}y</p>
                <small style="color: #64748b;">Requested on: ${new Date(doc.created_at).toLocaleDateString()}</small>
            </div>
            <span class="badge">Pending</span>
            <div class="request-actions">
                <button type="button" class="btn btn-secondary" onclick="updateStatus(${doc.id}, 'active')">Approve</button>
                <button type="button" class="btn btn-danger" onclick="updateStatus(${doc.id}, 'rejected')">Reject</button>
            </div>
        `;
        requestList.appendChild(item);
    });
}

async function renderAllDoctors() {
    console.log('[Admin] renderAllDoctors called');
    const doctors = await fetchData('backend/get_all_doctors.php');
    console.log('[Admin] renderAllDoctors - doctors received:', doctors);
    const doctorList = document.getElementById('allDoctorList');
    const summary = document.getElementById('doctorListSummary');
    console.log('[Admin] doctorList element:', doctorList);
    console.log('[Admin] summary element:', summary);
    if (!doctorList || !summary) {
        console.error('[Admin] Required elements not found!');
        return;
    }

    doctorList.innerHTML = '';

    if (!doctors || doctors.length === 0) {
        console.log('[Admin] No doctors found - showing empty state');
        summary.textContent = 'No doctors found.';
        doctorList.innerHTML = '<li class="request-item"><p>No doctors registered yet.</p></li>';
        return;
    }

    const counts = doctors.reduce((acc, doc) => {
        acc[doc.status] = (acc[doc.status] || 0) + 1;
        return acc;
    }, {});

    summary.textContent = `${doctors.length} doctors total | Active: ${counts.active || 0} | Pending: ${counts.pending || 0} | Rejected: ${counts.rejected || 0}`;

    doctors.forEach((doc) => {
        const item = document.createElement('li');
        item.className = 'request-item';
        item.innerHTML = `
            <div>
                <h4>${doc.full_name}</h4>
                <p>${doc.email} | ${doc.specialization} | License: ${doc.license_number} | Exp: ${doc.experience}y</p>
                <small style="color: #64748b;">Status: ${doc.status} | Joined: ${new Date(doc.created_at).toLocaleDateString()}</small>
            </div>
            <span class="badge badge-${doc.status}">${doc.status}</span>
            <div class="request-actions">
                ${doc.status !== 'active' ? `<button type="button" class="btn btn-secondary" onclick="updateStatus(${doc.id}, 'active')">Approve</button>` : ''}
                ${doc.status !== 'rejected' ? `<button type="button" class="btn btn-danger" onclick="updateStatus(${doc.id}, 'rejected')">Reject</button>` : ''}
            </div>
        `;
        doctorList.appendChild(item);
    });
}

async function renderAllPatients() {
    const patients = await fetchData('backend/get_all_patients.php');
    const patientList = document.getElementById('allPatientList');
    const summary = document.getElementById('patientListSummary');
    if (!patientList || !summary) return;

    patientList.innerHTML = '';

    if (!patients || patients.length === 0) {
        summary.textContent = 'No patients found.';
        patientList.innerHTML = '<li class="request-item"><p>No patients registered yet.</p></li>';
        return;
    }

    const counts = patients.reduce((acc, patient) => {
        acc[patient.status] = (acc[patient.status] || 0) + 1;
        return acc;
    }, {});

    summary.textContent = `${patients.length} patients total | Active: ${counts.active || 0} | Pending: ${counts.pending || 0} | Rejected: ${counts.rejected || 0}`;

    patients.forEach((patient) => {
        const item = document.createElement('li');
        item.className = 'request-item';
        item.innerHTML = `
            <div>
                <h4>${patient.full_name}</h4>
                <p>${patient.email} | Phone: ${patient.phone || 'N/A'} | Age: ${patient.age || 'N/A'}</p>
                <small style="color: #64748b;">Status: ${patient.status} | Joined: ${new Date(patient.created_at).toLocaleDateString()}</small>
            </div>
            <span class="badge badge-${patient.status}">${patient.status}</span>
        `;
        patientList.appendChild(item);
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function populateAppointmentFilterOptions() {
    const doctorSelect = document.getElementById('filterAppointmentDoctor');
    const patientSelect = document.getElementById('filterAppointmentPatient');
    if (!doctorSelect || !patientSelect) return;

    const [doctors, patients] = await Promise.all([
        fetchData('backend/get_all_doctors.php'),
        fetchData('backend/get_all_patients.php')
    ]);

    doctorSelect.innerHTML = '<option value="">All doctors</option>';
    patientSelect.innerHTML = '<option value="">All patients</option>';

    (doctors || []).forEach((doc) => {
        const option = document.createElement('option');
        option.value = String(doc.id);
        option.textContent = doc.full_name ? `${doc.full_name} (${doc.specialization || 'General'})` : doc.email;
        doctorSelect.appendChild(option);
    });

    (patients || []).forEach((patient) => {
        const option = document.createElement('option');
        option.value = String(patient.id);
        option.textContent = patient.full_name ? patient.full_name : patient.email;
        patientSelect.appendChild(option);
    });
}

async function renderAllAppointments() {
    const list = document.getElementById('allAppointmentList');
    const summary = document.getElementById('appointmentListSummary');
    const dateFilter = document.getElementById('filterAppointmentDate');
    const doctorFilter = document.getElementById('filterAppointmentDoctor');
    const patientFilter = document.getElementById('filterAppointmentPatient');
    if (!list || !summary || !dateFilter || !doctorFilter || !patientFilter) return;

    const params = new URLSearchParams();
    if (dateFilter.value) params.set('date', dateFilter.value);
    if (doctorFilter.value) params.set('doctor_id', doctorFilter.value);
    if (patientFilter.value) params.set('patient_id', patientFilter.value);

    const query = params.toString();
    const appointments = await fetchData(`backend/get_all_appointments.php${query ? `?${query}` : ''}`);

    list.innerHTML = '';

    if (!appointments || appointments.length === 0) {
        summary.textContent = 'No appointments found for selected filters.';
        list.innerHTML = '<li class="request-item"><p>No appointments found.</p></li>';
        return;
    }

    const statusCounts = appointments.reduce((acc, appt) => {
        acc[appt.status] = (acc[appt.status] || 0) + 1;
        return acc;
    }, {});

    summary.textContent = `${appointments.length} appointments | Upcoming: ${statusCounts.upcoming || 0} | Completed: ${statusCounts.completed || 0} | Cancelled: ${statusCounts.cancelled || 0}`;

    appointments.forEach((appt) => {
        const canCancel = appt.status === 'upcoming';
        const item = document.createElement('li');
        item.className = 'request-item';
        item.innerHTML = `
            <div>
                <h4>${escapeHtml(appt.patient_name)} with ${escapeHtml(appt.doctor_name)}</h4>
                <p>${new Date(appt.appointment_date).toLocaleString()} | Reason: ${escapeHtml(appt.reason || 'N/A')}</p>
                <small style="color: #64748b;">Doctor: ${escapeHtml(appt.doctor_email)} | Patient: ${escapeHtml(appt.patient_email)}</small>
            </div>
            <span class="badge badge-${escapeHtml(appt.status)}">${escapeHtml(appt.status)}</span>
            <div class="request-actions">
                ${canCancel ? `<button type="button" class="btn btn-danger" onclick="cancelAppointment(${Number(appt.appointment_id)})">Cancel Appointment</button>` : ''}
            </div>
        `;
        list.appendChild(item);
    });
}

async function cancelAppointment(appointmentId) {
    if (!Number.isInteger(Number(appointmentId)) || Number(appointmentId) <= 0) {
        alert('Invalid appointment ID');
        return;
    }

    const shouldCancel = confirm('Are you sure you want to cancel this appointment?');
    if (!shouldCancel) return;

    const result = await postData('backend/cancel_appointment.php', { appointment_id: Number(appointmentId) });
    if (!result.success) {
        alert(result.message || 'Unable to cancel appointment');
        return;
    }

    await showAllAppointmentsView();
}

function showPendingView() {
    currentAdminView = 'pending';
    const requestList = document.getElementById('requestList');
    const allDoctorList = document.getElementById('allDoctorList');
    const allPatientList = document.getElementById('allPatientList');
    const summary = document.getElementById('doctorListSummary');
    const patientSummary = document.getElementById('patientListSummary');
    const title = document.getElementById('doctorPanelTitle');
    const subtitle = document.getElementById('doctorPanelSubtitle');
    const panel = document.getElementById('doctorPanel');
    const patientPanel = document.getElementById('patientPanel');
    const appointmentPanel = document.getElementById('appointmentPanel');

    if (requestList) requestList.classList.remove('hidden');
    if (allDoctorList) allDoctorList.classList.add('hidden');
    if (summary) summary.classList.add('hidden');
    if (allPatientList) allPatientList.classList.add('hidden');
    if (patientSummary) patientSummary.classList.add('hidden');
    if (title) title.textContent = 'Pending Signup Requests';
    if (subtitle) subtitle.textContent = 'Approve or reject new doctor signup requests.';
    if (panel) panel.classList.remove('is-active');
    if (patientPanel) patientPanel.classList.add('hidden');
    if (appointmentPanel) appointmentPanel.classList.add('hidden');
    renderPendingRequests();
}

async function showAllDoctorsView() {
    currentAdminView = 'doctors';
    console.log('[Admin] showAllDoctorsView called');
    const requestList = document.getElementById('requestList');
    const allDoctorList = document.getElementById('allDoctorList');
    const allPatientList = document.getElementById('allPatientList');
    const summary = document.getElementById('doctorListSummary');
    const patientSummary = document.getElementById('patientListSummary');
    const title = document.getElementById('doctorPanelTitle');
    const subtitle = document.getElementById('doctorPanelSubtitle');
    const panel = document.getElementById('doctorPanel');
    const patientPanel = document.getElementById('patientPanel');
    const appointmentPanel = document.getElementById('appointmentPanel');

    if (requestList) requestList.classList.add('hidden');
    if (allDoctorList) allDoctorList.classList.remove('hidden');
    if (summary) summary.classList.remove('hidden');
    if (allPatientList) allPatientList.classList.add('hidden');
    if (patientSummary) patientSummary.classList.add('hidden');
    if (title) title.textContent = 'All Doctors';
    if (subtitle) subtitle.textContent = 'See every registered doctor and manage their approval status.';
    if (panel) panel.classList.add('is-active');
    if (patientPanel) patientPanel.classList.add('hidden');
    if (appointmentPanel) appointmentPanel.classList.add('hidden');
    await renderAllDoctors();
}

async function showAllPatientsView() {
    currentAdminView = 'patients';
    const requestList = document.getElementById('requestList');
    const allDoctorList = document.getElementById('allDoctorList');
    const allPatientList = document.getElementById('allPatientList');
    const summary = document.getElementById('doctorListSummary');
    const patientSummary = document.getElementById('patientListSummary');
    const title = document.getElementById('patientPanelTitle');
    const subtitle = document.getElementById('patientPanelSubtitle');
    const panel = document.getElementById('doctorPanel');
    const patientPanel = document.getElementById('patientPanel');
    const appointmentPanel = document.getElementById('appointmentPanel');

    if (requestList) requestList.classList.add('hidden');
    if (allDoctorList) allDoctorList.classList.add('hidden');
    if (summary) summary.classList.add('hidden');
    if (allPatientList) allPatientList.classList.remove('hidden');
    if (patientSummary) patientSummary.classList.remove('hidden');
    if (title) title.textContent = 'All Patients';
    if (subtitle) subtitle.textContent = 'View every registered patient account and profile details.';
    if (panel) panel.classList.remove('is-active');
    if (patientPanel) patientPanel.classList.remove('hidden');
    if (appointmentPanel) appointmentPanel.classList.add('hidden');
    await renderAllPatients();
}

async function showAllAppointmentsView() {
    currentAdminView = 'appointments';
    const requestList = document.getElementById('requestList');
    const allDoctorList = document.getElementById('allDoctorList');
    const allPatientList = document.getElementById('allPatientList');
    const summary = document.getElementById('doctorListSummary');
    const patientSummary = document.getElementById('patientListSummary');
    const panel = document.getElementById('doctorPanel');
    const patientPanel = document.getElementById('patientPanel');
    const appointmentPanel = document.getElementById('appointmentPanel');

    if (requestList) requestList.classList.add('hidden');
    if (allDoctorList) allDoctorList.classList.add('hidden');
    if (summary) summary.classList.add('hidden');
    if (allPatientList) allPatientList.classList.add('hidden');
    if (patientSummary) patientSummary.classList.add('hidden');
    if (panel) panel.classList.remove('is-active');
    if (patientPanel) patientPanel.classList.add('hidden');
    if (appointmentPanel) appointmentPanel.classList.remove('hidden');

    await populateAppointmentFilterOptions();
    await renderAllAppointments();
}

function refreshDashboard() {
    renderStats();

    if (currentAdminView === 'doctors') {
        showAllDoctorsView();
        return;
    }

    if (currentAdminView === 'patients') {
        showAllPatientsView();
        return;
    }

    if (currentAdminView === 'appointments') {
        showAllAppointmentsView();
        return;
    }

    showPendingView();
}

// ── Admin Settings Validation ──────────────────────────────────────────────────

function initValidation() {
    const form = document.getElementById('adminSettingsForm');
    const saveBtn = document.getElementById('saveAdminBtn');
    if (!form || !saveBtn) return;

    const validators = {
        adminEmail: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        adminPhone: v => /^\d{10}$/.test(v)
    };

    function validateField(input) {
        const id = input.id;
        const isValid = validators[id] ? validators[id](input.value.trim()) : true;
        const error = document.getElementById(id + '-error');
        
        input.classList.toggle('invalid', !isValid);
        input.classList.toggle('valid', isValid);
        if (error) error.classList.toggle('visible', !isValid);
        
        return isValid;
    }

    form.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            validateField(input);
            const allValid = Array.from(form.querySelectorAll('input')).every(i => {
                return validators[i.id] ? validators[i.id](i.value.trim()) : true;
            });
            saveBtn.disabled = !allValid;
        });
        input.addEventListener('blur', () => validateField(input));
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Admin settings saved successfully!');
    });
}

// ── Init ─────────────────────────────────────────────────────────────────────────

function attachInteractions() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshDashboard);
    }

    const openDoctorsBtn = document.getElementById('openDoctorsBtn');
    if (openDoctorsBtn) {
        openDoctorsBtn.addEventListener('click', () => {
            showAllDoctorsView();
            document.getElementById('doctorPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    const refreshDoctorsBtn = document.getElementById('refreshDoctorsBtn');
    if (refreshDoctorsBtn) {
        refreshDoctorsBtn.addEventListener('click', showAllDoctorsView);
    }

    const openPatientsBtn = document.getElementById('openPatientsBtn');
    if (openPatientsBtn) {
        openPatientsBtn.addEventListener('click', () => {
            showAllPatientsView();
            document.getElementById('patientPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    const refreshPatientsBtn = document.getElementById('refreshPatientsBtn');
    if (refreshPatientsBtn) {
        refreshPatientsBtn.addEventListener('click', showAllPatientsView);
    }

    const openAppointmentsBtn = document.getElementById('openAppointmentsBtn');
    if (openAppointmentsBtn) {
        openAppointmentsBtn.addEventListener('click', () => {
            showAllAppointmentsView();
            document.getElementById('appointmentPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    const refreshAppointmentsBtn = document.getElementById('refreshAppointmentsBtn');
    if (refreshAppointmentsBtn) {
        refreshAppointmentsBtn.addEventListener('click', showAllAppointmentsView);
    }

    const applyAppointmentFiltersBtn = document.getElementById('applyAppointmentFiltersBtn');
    if (applyAppointmentFiltersBtn) {
        applyAppointmentFiltersBtn.addEventListener('click', renderAllAppointments);
    }

    const clearAppointmentFiltersBtn = document.getElementById('clearAppointmentFiltersBtn');
    if (clearAppointmentFiltersBtn) {
        clearAppointmentFiltersBtn.addEventListener('click', async () => {
            const dateFilter = document.getElementById('filterAppointmentDate');
            const doctorFilter = document.getElementById('filterAppointmentDoctor');
            const patientFilter = document.getElementById('filterAppointmentPatient');
            if (dateFilter) dateFilter.value = '';
            if (doctorFilter) doctorFilter.value = '';
            if (patientFilter) patientFilter.value = '';
            await renderAllAppointments();
        });
    }
}

// Initial load
attachInteractions();
initValidation();
refreshDashboard();

// Create icons using Lucide if available
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

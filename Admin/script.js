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
                <button type="button" class="btn btn-secondary view-doctor-profile-btn">View Profile</button>
                ${doc.status !== 'active' ? '<button type="button" class="btn btn-secondary approve-doctor-btn">Approve</button>' : ''}
                ${doc.status !== 'rejected' ? '<button type="button" class="btn btn-danger reject-doctor-btn">Reject</button>' : ''}
            </div>
        `;

        const viewBtn = item.querySelector('.view-doctor-profile-btn');
        const approveBtn = item.querySelector('.approve-doctor-btn');
        const rejectBtn = item.querySelector('.reject-doctor-btn');

        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                openDoctorProfile(doc.id);
            });
        }

        if (approveBtn) {
            approveBtn.addEventListener('click', () => {
                updateStatus(doc.id, 'active');
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => {
                updateStatus(doc.id, 'rejected');
            });
        }

        doctorList.appendChild(item);
    });
}

async function populateDoctorSpecializationOptions(selectedSpecialization = '') {
    const specializationSelect = document.getElementById('doctorSpecialization');
    if (!specializationSelect) return;

    const specialties = await fetchData('backend/get_specialties.php');
    specializationSelect.innerHTML = '<option value="">Select specialty</option>';

    (specialties || []).forEach((specialty) => {
        const option = document.createElement('option');
        option.value = specialty.name;
        option.textContent = specialty.name;
        specializationSelect.appendChild(option);
    });

    const hasSelected = selectedSpecialization && (specialties || []).some(s => s.name === selectedSpecialization);
    if (selectedSpecialization && !hasSelected) {
        const option = document.createElement('option');
        option.value = selectedSpecialization;
        option.textContent = `${selectedSpecialization} (custom)`;
        specializationSelect.appendChild(option);
    }

    specializationSelect.value = selectedSpecialization || '';
}

function hideDoctorProfileEditor() {
    const editor = document.getElementById('doctorProfileEditor');
    const form = document.getElementById('doctorProfileForm');
    const selectedDoctorId = document.getElementById('selectedDoctorId');
    if (editor) editor.classList.add('hidden');
    if (form) form.reset();
    if (selectedDoctorId) selectedDoctorId.value = '';
}

function showDoctorProfileEditor() {
    const editor = document.getElementById('doctorProfileEditor');
    if (editor) editor.classList.remove('hidden');
}

async function openDoctorProfile(doctorId) {
    const result = await postData('backend/get_doctor_profile.php', { user_id: Number(doctorId) });
    if (!result.success || !result.data) {
        alert(result.message || 'Unable to load doctor profile');
        return;
    }

    const profile = result.data;
    const selectedDoctorId = document.getElementById('selectedDoctorId');
    const doctorEmail = document.getElementById('doctorEmail');
    const doctorLicense = document.getElementById('doctorLicense');
    const doctorFullName = document.getElementById('doctorFullName');
    const doctorExperience = document.getElementById('doctorExperience');
    const doctorFee = document.getElementById('doctorFee');
    const doctorHospital = document.getElementById('doctorHospital');
    const doctorAvailableFrom = document.getElementById('doctorAvailableFrom');
    const doctorAvailableTo = document.getElementById('doctorAvailableTo');
    const doctorBio = document.getElementById('doctorBio');

    if (selectedDoctorId) selectedDoctorId.value = String(profile.id || doctorId);
    if (doctorEmail) doctorEmail.value = profile.email || '';
    if (doctorLicense) doctorLicense.value = profile.license_number || '';
    if (doctorFullName) doctorFullName.value = profile.full_name || '';
    if (doctorExperience) doctorExperience.value = String(profile.experience ?? 0);
    if (doctorFee) doctorFee.value = profile.consultation_fee ?? '';
    if (doctorHospital) doctorHospital.value = profile.hospital || '';
    if (doctorAvailableFrom) doctorAvailableFrom.value = (profile.available_from || '').slice(0, 5);
    if (doctorAvailableTo) doctorAvailableTo.value = (profile.available_to || '').slice(0, 5);
    if (doctorBio) doctorBio.value = profile.bio || '';

    await populateDoctorSpecializationOptions(profile.specialization || '');
    showDoctorProfileEditor();
    document.getElementById('doctorProfileEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveDoctorProfileFromAdmin() {
    const selectedDoctorId = document.getElementById('selectedDoctorId');
    const doctorFullName = document.getElementById('doctorFullName');
    const doctorSpecialization = document.getElementById('doctorSpecialization');
    const doctorExperience = document.getElementById('doctorExperience');
    const doctorFee = document.getElementById('doctorFee');
    const doctorHospital = document.getElementById('doctorHospital');
    const doctorAvailableFrom = document.getElementById('doctorAvailableFrom');
    const doctorAvailableTo = document.getElementById('doctorAvailableTo');
    const doctorBio = document.getElementById('doctorBio');

    const doctorId = Number(selectedDoctorId?.value || 0);
    if (!doctorId) {
        alert('Select a doctor profile first');
        return;
    }

    const payload = {
        user_id: doctorId,
        full_name: doctorFullName?.value.trim() || '',
        specialization: doctorSpecialization?.value.trim() || '',
        experience: Number(doctorExperience?.value || 0),
        consultation_fee: doctorFee?.value ?? '',
        hospital: doctorHospital?.value.trim() || '',
        available_from: doctorAvailableFrom?.value || '',
        available_to: doctorAvailableTo?.value || '',
        bio: doctorBio?.value.trim() || ''
    };

    const result = await postData('backend/update_doctor_profile.php', payload);
    if (!result.success) {
        alert(result.message || 'Failed to update doctor profile');
        return;
    }

    alert('Doctor profile updated successfully');
    await renderAllDoctors();
    await openDoctorProfile(doctorId);
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

function resetSpecialtyForm() {
    const idInput = document.getElementById('specialtyId');
    const nameInput = document.getElementById('specialtyName');
    const descInput = document.getElementById('specialtyDescription');
    const saveBtn = document.getElementById('saveSpecialtyBtn');

    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (saveBtn) saveBtn.textContent = 'Add Specialty';
}

function startEditSpecialty(id, name, description) {
    const idInput = document.getElementById('specialtyId');
    const nameInput = document.getElementById('specialtyName');
    const descInput = document.getElementById('specialtyDescription');
    const saveBtn = document.getElementById('saveSpecialtyBtn');

    if (idInput) idInput.value = String(id);
    if (nameInput) nameInput.value = String(name || '');
    if (descInput) descInput.value = String(description || '');
    if (saveBtn) saveBtn.textContent = 'Update Specialty';
    nameInput?.focus();
}

async function renderSpecialties() {
    const list = document.getElementById('allSpecialtyList');
    const summary = document.getElementById('specialtyListSummary');
    if (!list || !summary) return;

    const specialties = await fetchData('backend/get_specialties.php');
    list.innerHTML = '';

    if (!specialties || specialties.length === 0) {
        summary.textContent = 'No specialties available yet.';
        list.innerHTML = '<li class="request-item"><p>No specialties found.</p></li>';
        return;
    }

    summary.textContent = `${specialties.length} specialties available`;

    specialties.forEach((specialty) => {
        const item = document.createElement('li');
        item.className = 'request-item';
        item.innerHTML = `
            <div>
                <h4>${escapeHtml(specialty.name)}</h4>
                <p>${escapeHtml(specialty.description || 'No description')}</p>
                <small style="color: #64748b;">Created: ${new Date(specialty.created_at).toLocaleDateString()}</small>
            </div>
            <div class="request-actions">
                <button type="button" class="btn btn-secondary edit-specialty-btn">Edit</button>
                <button type="button" class="btn btn-danger delete-specialty-btn">Delete</button>
            </div>
        `;

        const editBtn = item.querySelector('.edit-specialty-btn');
        const deleteBtn = item.querySelector('.delete-specialty-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                startEditSpecialty(specialty.id, specialty.name, specialty.description || '');
            });
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                deleteSpecialty(specialty.id);
            });
        }

        list.appendChild(item);
    });

    // Also show pending specialties (doctor-submitted) for admin approval
    try {
        const pending = await fetchData('backend/get_pending_specialties.php');
        if (pending && pending.length > 0) {
            const pendingHeader = document.createElement('li');
            pendingHeader.className = 'request-item';
            pendingHeader.innerHTML = `<div><h4>Pending Specialties</h4><p style="color:#64748b;">Submitted by doctors — approve to add to master list.</p></div>`;
            list.insertBefore(pendingHeader, list.firstChild);

            pending.forEach(p => {
                const item = document.createElement('li');
                item.className = 'request-item pending-specialty';
                item.innerHTML = `
                    <div>
                        <h4>${escapeHtml(p.name)}</h4>
                        <p style="color:#64748b;">Requested by user: ${escapeHtml(String(p.requested_by_user_id || 'N/A'))}</p>
                        <small style="color: #64748b;">Requested: ${new Date(p.created_at).toLocaleDateString()}</small>
                    </div>
                    <div class="request-actions">
                        <button type="button" class="btn btn-secondary approve-pending-btn">Approve</button>
                        <button type="button" class="btn btn-danger delete-specialty-btn">Remove</button>
                    </div>
                `;

                const approveBtn = item.querySelector('.approve-pending-btn');
                const deleteBtn = item.querySelector('.delete-specialty-btn');
                if (approveBtn) {
                    approveBtn.addEventListener('click', async () => {
                        try {
                            const res = await postData('backend/approve_pending_specialty.php', { id: p.id });
                            if (!res.success) {
                                alert(res.message || 'Failed to approve');
                                return;
                            }
                            await renderSpecialties();
                        } catch (err) {
                            console.error('Approve error', err);
                        }
                    });
                }

                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        // admin can delete the pending entry (re-use delete_specialty endpoint won't work here)
                        if (!confirm('Remove this pending specialty?')) return;
                        fetch('backend/delete_pending_specialty.php', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id })
                        }).then(r => r.json()).then(res => {
                            if (res.success) renderSpecialties(); else alert(res.message || 'Failed');
                        }).catch(err => console.error(err));
                    });
                }

                list.insertBefore(item, list.firstChild.nextSibling);
            });
        }
    } catch (err) {
        console.error('Failed to load pending specialties', err);
    }
}

async function saveSpecialtyFromForm() {
    const idInput = document.getElementById('specialtyId');
    const nameInput = document.getElementById('specialtyName');
    const descInput = document.getElementById('specialtyDescription');
    if (!idInput || !nameInput || !descInput) return;

    const specialtyId = Number(idInput.value || 0);
    const name = nameInput.value.trim();
    const description = descInput.value.trim();

    if (!name) {
        alert('Specialty name is required');
        nameInput.focus();
        return;
    }

    const endpoint = specialtyId > 0 ? 'backend/update_specialty.php' : 'backend/add_specialty.php';
    const payload = specialtyId > 0
        ? { id: specialtyId, name, description }
        : { name, description };

    const result = await postData(endpoint, payload);
    if (!result.success) {
        alert(result.message || 'Failed to save specialty');
        return;
    }

    resetSpecialtyForm();
    await renderSpecialties();
}

async function deleteSpecialty(id) {
    const specialtyId = Number(id);
    if (!Number.isInteger(specialtyId) || specialtyId <= 0) {
        alert('Invalid specialty ID');
        return;
    }

    const shouldDelete = confirm('Delete this specialty? This cannot be undone.');
    if (!shouldDelete) return;

    const result = await postData('backend/delete_specialty.php', { id: specialtyId });
    if (!result.success) {
        alert(result.message || 'Failed to delete specialty');
        return;
    }

    resetSpecialtyForm();
    await renderSpecialties();
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
    const specialtyPanel = document.getElementById('specialtyPanel');

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
    if (specialtyPanel) specialtyPanel.classList.add('hidden');
    hideDoctorProfileEditor();
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
    const specialtyPanel = document.getElementById('specialtyPanel');

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
    if (specialtyPanel) specialtyPanel.classList.add('hidden');
    hideDoctorProfileEditor();
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
    const specialtyPanel = document.getElementById('specialtyPanel');

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
    if (specialtyPanel) specialtyPanel.classList.add('hidden');
    hideDoctorProfileEditor();
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
    const specialtyPanel = document.getElementById('specialtyPanel');

    if (requestList) requestList.classList.add('hidden');
    if (allDoctorList) allDoctorList.classList.add('hidden');
    if (summary) summary.classList.add('hidden');
    if (allPatientList) allPatientList.classList.add('hidden');
    if (patientSummary) patientSummary.classList.add('hidden');
    if (panel) panel.classList.remove('is-active');
    if (patientPanel) patientPanel.classList.add('hidden');
    if (appointmentPanel) appointmentPanel.classList.remove('hidden');
    if (specialtyPanel) specialtyPanel.classList.add('hidden');
    hideDoctorProfileEditor();

    await populateAppointmentFilterOptions();
    await renderAllAppointments();
}

async function showSpecialtiesView() {
    currentAdminView = 'specialties';
    const requestList = document.getElementById('requestList');
    const allDoctorList = document.getElementById('allDoctorList');
    const allPatientList = document.getElementById('allPatientList');
    const summary = document.getElementById('doctorListSummary');
    const patientSummary = document.getElementById('patientListSummary');
    const panel = document.getElementById('doctorPanel');
    const patientPanel = document.getElementById('patientPanel');
    const appointmentPanel = document.getElementById('appointmentPanel');
    const specialtyPanel = document.getElementById('specialtyPanel');

    if (requestList) requestList.classList.add('hidden');
    if (allDoctorList) allDoctorList.classList.add('hidden');
    if (summary) summary.classList.add('hidden');
    if (allPatientList) allPatientList.classList.add('hidden');
    if (patientSummary) patientSummary.classList.add('hidden');
    if (panel) panel.classList.remove('is-active');
    if (patientPanel) patientPanel.classList.add('hidden');
    if (appointmentPanel) appointmentPanel.classList.add('hidden');
    if (specialtyPanel) specialtyPanel.classList.remove('hidden');
    hideDoctorProfileEditor();

    resetSpecialtyForm();
    await renderSpecialties();
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

    if (currentAdminView === 'specialties') {
        showSpecialtiesView();
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

    const doctorProfileForm = document.getElementById('doctorProfileForm');
    if (doctorProfileForm) {
        doctorProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveDoctorProfileFromAdmin();
        });
    }

    const closeDoctorProfileBtn = document.getElementById('closeDoctorProfileBtn');
    if (closeDoctorProfileBtn) {
        closeDoctorProfileBtn.addEventListener('click', hideDoctorProfileEditor);
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

    const openSpecialtiesBtn = document.getElementById('openSpecialtiesBtn');
    if (openSpecialtiesBtn) {
        openSpecialtiesBtn.addEventListener('click', () => {
            showSpecialtiesView();
            document.getElementById('specialtyPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    const refreshSpecialtiesBtn = document.getElementById('refreshSpecialtiesBtn');
    if (refreshSpecialtiesBtn) {
        refreshSpecialtiesBtn.addEventListener('click', showSpecialtiesView);
    }

    const specialtyForm = document.getElementById('specialtyForm');
    if (specialtyForm) {
        specialtyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveSpecialtyFromForm();
        });
    }

    const cancelSpecialtyEditBtn = document.getElementById('cancelSpecialtyEditBtn');
    if (cancelSpecialtyEditBtn) {
        cancelSpecialtyEditBtn.addEventListener('click', resetSpecialtyForm);
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

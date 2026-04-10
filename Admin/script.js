// ── Fetch Operations ──────────────────────────────────────────────────────────

async function fetchData(url) {
    try {
        const res = await fetch(url);
        const result = await res.json();
        return result.success ? result.data : null;
    } catch (err) {
        console.error(`Error fetching ${url}:`, err);
        return null;
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
    if (!element) return;
    
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
    if (!stats) return;

    animateCount('totalDoctors', stats.totalDoctors);
    animateCount('totalPatients', stats.totalPatients);
    animateCount('pendingRequests', stats.pendingRequests);
    animateCount('inactiveDoctors', stats.inactiveDoctors);

    const summaryText = `${stats.totalDoctors} doctors, ${stats.totalPatients} patients, ${stats.pendingRequests} pending requests.`;
    document.getElementById('summaryText').textContent = summaryText;
}

async function renderPendingRequests() {
    const doctors = await fetchData('backend/get_pending_doctors.php');
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

function refreshDashboard() {
    renderStats();
    renderPendingRequests();
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
}

// Initial load
refreshDashboard();
attachInteractions();
initValidation();

// Create icons using Lucide if available
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

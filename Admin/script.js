const dashboardData = {
    doctors: [
        { id: 1, name: 'Dr. Sarah Khan', active: true },
        { id: 2, name: 'Dr. Ahmed Ali', active: true },
        { id: 3, name: 'Dr. Ruby George', active: false },
        { id: 4, name: 'Dr. Faisal Noor', active: true }
    ],
    patients: [
        { id: 1, name: 'Ayan Patel' },
        { id: 2, name: 'Mina Das' },
        { id: 3, name: 'Saira Fatima' },
        { id: 4, name: 'Rohan Nair' },
        { id: 5, name: 'Anita Roy' }
    ],
    pendingSignups: [
        { name: 'Dr. Omar Hassan', requestedOn: '2026-04-04', specialty: 'Cardiology' },
        { name: 'Dr. Emily Dsouza', requestedOn: '2026-04-05', specialty: 'Dermatology' }
    ]
};

function animateCount(elementId, endValue) {
    const element = document.getElementById(elementId);
    const duration = 500;
    const frameRate = 16;
    const totalFrames = Math.ceil(duration / frameRate);
    let frame = 0;

    const counter = setInterval(() => {
        frame += 1;
        const progress = frame / totalFrames;
        const current = Math.round(endValue * progress);
        element.textContent = current;

        if (frame >= totalFrames) {
            clearInterval(counter);
            element.textContent = endValue;
        }
    }, frameRate);
}

function renderStats() {
    const totalDoctors = dashboardData.doctors.length;
    const totalPatients = dashboardData.patients.length;
    const pendingRequests = dashboardData.pendingSignups.length;
    const inactiveDoctors = dashboardData.doctors.filter((doctor) => !doctor.active).length;

    animateCount('totalDoctors', totalDoctors);
    animateCount('totalPatients', totalPatients);
    animateCount('pendingRequests', pendingRequests);
    animateCount('inactiveDoctors', inactiveDoctors);

    const summaryText = `${totalDoctors} doctors, ${totalPatients} patients, ${pendingRequests} pending signup requests.`;
    document.getElementById('summaryText').textContent = summaryText;
}

function renderPendingRequests() {
    const requestList = document.getElementById('requestList');
    requestList.innerHTML = '';

    if (dashboardData.pendingSignups.length === 0) {
        requestList.innerHTML = '<li class="request-item"><p>No pending signup requests.</p></li>';
        return;
    }

    dashboardData.pendingSignups.forEach((request) => {
        const item = document.createElement('li');
        item.className = 'request-item';
        item.innerHTML = `
            <div>
                <h4>${request.name}</h4>
                <p>${request.specialty} | Requested on ${request.requestedOn}</p>
            </div>
            <span class="badge">Pending</span>
            <div class="request-actions">
                <button type="button" class="btn btn-secondary">Approve</button>
                <button type="button" class="btn btn-danger">Reject</button>
            </div>
        `;
        requestList.appendChild(item);
    });
}

function attachInteractions() {
    document.getElementById('refreshBtn').addEventListener('click', () => {
        renderStats();
        renderPendingRequests();
    });
}

renderStats();
renderPendingRequests();
attachInteractions();
lucide.createIcons();

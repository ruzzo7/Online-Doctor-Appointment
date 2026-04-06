/**
 * Patient Dashboard Main Script
 * Handles section navigation and doctor filtering.
 */

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

  // Performance-friendly filtering using requestAnimationFrame
  window.requestAnimationFrame(() => {
    doctorCards.forEach(doc => {
      const docName = (doc.getAttribute("data-name") || "").toLowerCase();
      const docSpecialty = (doc.getAttribute("data-specialty") || "").toLowerCase();
      
      const matchesSpecialty = specialty === "" || docSpecialty.includes(specialty);
      const matchesName = name === "" || docName.includes(name);

      doc.style.display = (matchesSpecialty && matchesName) ? "flex" : "none";
    });
  });
}

/**
 * DOM Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  // Sync view with URL hash or default to 'doctors'
  const currentHash = window.location.hash.replace('#', '');
  const validSections = ['profile', 'doctors', 'appointments', 'notifications', 'records', 'payments'];
  const initialSection = validSections.includes(currentHash) ? currentHash : 'doctors';

  showSection(null, initialSection);
});

// Expose functions to global scope for HTML event handlers
window.showSection = showSection;
window.filterDoctors = filterDoctors;

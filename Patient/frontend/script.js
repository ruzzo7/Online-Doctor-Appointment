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

// ── Profile Validation Logic ────────────────────────────────────────────────
const profileForm = document.getElementById('profileForm');
const saveBtn = document.getElementById('saveProfileBtn');

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
  // Sync view with URL hash or default to 'doctors'
  const currentHash = window.location.hash.replace('#', '');
  const validSections = ['profile', 'doctors', 'appointments', 'notifications', 'records', 'payments'];
  const initialSection = validSections.includes(currentHash) ? currentHash : 'doctors';

  showSection(null, initialSection);

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

    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Profile updated successfully!');
    });
  }
});

// Expose functions to global scope for HTML event handlers
window.showSection = showSection;
window.filterDoctors = filterDoctors;

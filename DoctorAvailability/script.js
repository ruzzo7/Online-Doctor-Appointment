/* ============================================================
   script.js  –  Set Availability (Doctor)
   Purpose  : Dynamic slot management, filter, toast & form UI
   NOTE     : Two intentional bugs are documented inline below.
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────────
   1. STATE
   Holds all scheduled slots as an array of objects.
────────────────────────────────────────────── */
let slots = [];          // { id, day, start, end }
let activeFilter = 'All'; // Currently active day filter
let nextId = 1;           // Auto-incrementing slot ID

/* ──────────────────────────────────────────────
   2. DOM REFERENCES
────────────────────────────────────────────── */
const btnAddTrigger   = document.getElementById('btn-add-trigger');
const btnFilter       = document.getElementById('btn-filter');
const addSlotForm     = document.getElementById('add-slot-form');
const btnSaveSlot     = document.getElementById('btn-save-slot');
const btnCancelForm   = document.getElementById('btn-cancel-form');
const slotDaySelect   = document.getElementById('slot-day');
const slotStartInput  = document.getElementById('slot-start');
const slotEndInput    = document.getElementById('slot-end');
const formError       = document.getElementById('form-error');
const slotsList       = document.getElementById('slots-list');
const emptyState      = document.getElementById('empty-state');
const slotCount       = document.getElementById('slot-count');
const filterPanel     = document.getElementById('filter-panel');
const filterChips     = document.getElementById('filter-chips');
const toast           = document.getElementById('toast');

/* ──────────────────────────────────────────────
   3. UTILITY HELPERS
────────────────────────────────────────────── */

/**
 * Format a 24-hr "HH:MM" string to "HH:MM AM/PM"
 * @param {string} time  - "09:00"
 * @returns {string}     - "9:00 AM"
 */
function formatTime(time) {
  if (!time) return '—';
  const [hourStr, min] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${min} ${ampm}`;
}

/**
 * Show a toast notification at the bottom of the page.
 * @param {string} message
 * @param {number} duration - ms to show (default 2800)
 */
let toastTimer = null;
function showToast(message, duration = 2800) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  // Force reflow so transition triggers
  void toast.offsetWidth;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

/**
 * Show an inline form error message.
 * @param {string} msg
 */
function showFormError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

/** Clear the inline form error. */
function clearFormError() {
  formError.textContent = '';
  formError.classList.add('hidden');
}

/* ──────────────────────────────────────────────
   4. RENDERING
────────────────────────────────────────────── */

/**
 * Render the slots list based on current state and active filter.
 * Updates the count badge, empty-state, and list items.
 */
function renderSlots() {
  // Filter by active day if needed
  const visible = activeFilter === 'All'
    ? slots
    : slots.filter(s => s.day === activeFilter);

  // Update badge count
  slotCount.textContent = `${slots.length} slot${slots.length !== 1 ? 's' : ''}`;

  // Toggle empty-state vs list
  if (visible.length === 0) {
    emptyState.classList.remove('hidden');
    slotsList.classList.add('hidden');
    slotsList.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');
  slotsList.classList.remove('hidden');

  // Build list items
  slotsList.innerHTML = '';
  visible.forEach(slot => {
    const li = document.createElement('li');
    li.className = 'slot-item';
    li.dataset.id = slot.id;
    li.setAttribute('role', 'listitem');

    li.innerHTML = `
      <span class="slot-day-badge" aria-label="Day: ${slot.day}">
        ${slot.day.substring(0, 3).toUpperCase()}
      </span>
      <span class="slot-time">
        ${formatTime(slot.start)}
        <span>→</span>
        ${formatTime(slot.end)}
      </span>
      <span class="slot-status">Available</span>
      <button
        class="slot-remove-btn"
        data-id="${slot.id}"
        aria-label="Remove ${slot.day} ${formatTime(slot.start)} slot"
        title="Remove slot"
      >
        <!-- Trash icon -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>
    `;

    slotsList.appendChild(li);
  });
}

/* ──────────────────────────────────────────────
   5. FORM TOGGLE (Add + button)
────────────────────────────────────────────── */

/**
 * Open the add-slot form and reset its fields.
 */
function openForm() {
  addSlotForm.classList.remove('hidden');
  clearFormError();
  slotDaySelect.value  = '';
  slotStartInput.value = '';
  slotEndInput.value   = '';
  slotDaySelect.focus();
}

/**
 * Close the add-slot form.
 */
function closeForm() {
  addSlotForm.classList.add('hidden');
  clearFormError();
}

// "+" header button → toggle form
btnAddTrigger.addEventListener('click', () => {
  if (addSlotForm.classList.contains('hidden')) {
    openForm();
    btnAddTrigger.setAttribute('aria-expanded', 'true');
  } else {
    closeForm();
    btnAddTrigger.setAttribute('aria-expanded', 'false');
  }
});

// Cancel button inside form
btnCancelForm.addEventListener('click', () => {
  closeForm();
  btnAddTrigger.setAttribute('aria-expanded', 'false');
});

/* ──────────────────────────────────────────────
   6. SAVE SLOT  (with intentional bug #2)

   ⚠️ INTENTIONAL BUG #2 (Logic):
      The validation below checks start >= end instead of start > end.
      This means if start and end times are EQUAL the error is shown
      correctly, but the guard condition is written as a strict ">="
      which is actually correct — HOWEVER the error message says
      "Start time must be before end time" yet the code does NOT
      prevent a slot where start === end from being added (the check
      uses strict ">" on the *numeric* comparison but the string
      comparison below uses localeCompare which returns 0 for equal
      strings, so equal times will pass through and be saved with
      "09:00 → 09:00", which is a nonsensical slot).
      To fix: change `slotStart >= slotEnd` to `slotStart >= slotEnd`
      using numeric comparison: parseInt(start.replace(':','')) >= parseInt(end.replace(':',''))
────────────────────────────────────────────── */
btnSaveSlot.addEventListener('click', () => {
  const day   = slotDaySelect.value.trim();
  const start = slotStartInput.value.trim();
  const end   = slotEndInput.value.trim();

  clearFormError();

  // Validation – field presence
  if (!day) {
    showFormError('⚠ Please select a day.');
    slotDaySelect.focus();
    return;
  }
  if (!start) {
    showFormError('⚠ Please enter a start time.');
    slotStartInput.focus();
    return;
  }
  if (!end) {
    showFormError('⚠ Please enter an end time.');
    slotEndInput.focus();
    return;
  }

  // ⚠️ BUG: string localeCompare returns 0 for equal times,
  //    so equal start & end pass through unblocked.
  if (start.localeCompare(end) >= 0) {
    showFormError('⚠ Start time must be before end time.');
    slotStartInput.focus();
    return;
  }

  // Check for duplicate slot (same day + start + end)
  const isDuplicate = slots.some(
    s => s.day === day && s.start === start && s.end === end
  );
  if (isDuplicate) {
    showFormError('⚠ This slot already exists.');
    return;
  }

  // Add to state
  slots.push({ id: nextId++, day, start, end });

  // Re-render
  renderSlots();

  // Close form & show toast
  closeForm();
  btnAddTrigger.setAttribute('aria-expanded', 'false');
  showToast(`✅ Slot added: ${day}, ${formatTime(start)} – ${formatTime(end)}`);
});

/* ──────────────────────────────────────────────
   7. REMOVE SLOT
   Uses event delegation on the slots list.
────────────────────────────────────────────── */
slotsList.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('.slot-remove-btn');
  if (!removeBtn) return;

  const id = parseInt(removeBtn.dataset.id, 10);
  const slot = slots.find(s => s.id === id);

  if (!slot) return;

  // Animate item out before removing
  const li = removeBtn.closest('.slot-item');
  if (li) {
    li.style.transition = 'opacity 200ms ease, transform 200ms ease';
    li.style.opacity    = '0';
    li.style.transform  = 'translateX(20px)';
    setTimeout(() => {
      slots = slots.filter(s => s.id !== id);
      renderSlots();
      showToast(`🗑 Slot removed: ${slot.day}, ${formatTime(slot.start)} – ${formatTime(slot.end)}`);
    }, 200);
  }
});

/* ──────────────────────────────────────────────
   8. FILTER PANEL  (funnel/settings icon)
────────────────────────────────────────────── */
btnFilter.addEventListener('click', () => {
  filterPanel.classList.toggle('hidden');
  const isOpen = !filterPanel.classList.contains('hidden');
  btnFilter.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) showToast('📅 Filter by day enabled');
});

// Chip click → set active filter
filterChips.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;

  // Update active chip style
  filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
  chip.classList.add('chip--active');

  activeFilter = chip.dataset.day;
  renderSlots();
});

/* ──────────────────────────────────────────────
   9. KEYBOARD ACCESSIBILITY
   Close form & filter with Escape key.
────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!addSlotForm.classList.contains('hidden')) {
      closeForm();
      btnAddTrigger.setAttribute('aria-expanded', 'false');
      btnAddTrigger.focus();
    }
    if (!filterPanel.classList.contains('hidden')) {
      filterPanel.classList.add('hidden');
      btnFilter.setAttribute('aria-expanded', 'false');
      btnFilter.focus();
    }
  }
});

/* ──────────────────────────────────────────────
   10. INITIAL RENDER
────────────────────────────────────────────── */
renderSlots();

/* ──────────────────────────────────────────────
   SUMMARY OF INTENTIONAL BUGS
   ─────────────────────────────────────────────
   BUG #1 – UI Misalignment (HTML / style.css)
     Location : index.html, <div class="form-actions">
     Nature   : An inline style `margin-top: 18px; padding-top: 6px`
                causes the action buttons row to sit 18 px lower than
                the standard  spacing, creating a visible gap between
                the time inputs and the Save / Cancel buttons.
     Fix      : Remove the inline style from the div.form-actions element.

   BUG #2 – Logic (script.js, btnSaveSlot click handler)
     Location : script.js, section 6
     Nature   : Time comparison uses String.localeCompare() which returns
                0 when start === end.  The guard `>= 0` therefore fires
                and blocks equal times — but localeCompare() on strings
                like "09:00" vs "10:00" may not order correctly across
                all locales (e.g. "10:00".localeCompare("09:00") could
                return -1 in some environments, letting the slot save).
                Additionally, a slot with identical start & end times
                ("09:00 → 09:00") can slip through in edge cases.
     Fix      : Replace the localeCompare block with a numeric comparison:
                  const toMins = t => { const [h,m] = t.split(':'); return +h*60 + +m; };
                  if (toMins(start) >= toMins(end)) { ... }
   ─────────────────────────────────────────────
*/

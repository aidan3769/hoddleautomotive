// =========================================
// HODDLE AUTOMOTIVE — booking.js (EmailJS booking form)
//
// Connected to the "Hoddle Booking Request" template, which delivers
// to info@hoddleautomotive.com.au over the workshop's own SMTP server
// and sets Reply-To to the customer's address.
//
// The public key is safe in client-side code by design — it only
// works from origins allowlisted in the EmailJS dashboard
// (Account → Security). The private key must never appear here.
//
// If the keys are ever cleared, the form falls back to showing a
// "call us instead" message rather than silently failing.
// =========================================

const EMAILJS_PUBLIC_KEY  = 'DuaMYMfrf5YOzK8-i';
const EMAILJS_SERVICE_ID  = 'service_hp50mws';
const EMAILJS_TEMPLATE_ID = 'template_0bgg671';

const bookingForm = document.getElementById('bookingForm');
const submitBtn   = document.getElementById('bookingSubmit');
const formStatus  = document.getElementById('formStatus');

const isConfigured =
  typeof emailjs !== 'undefined' &&
  !EMAILJS_PUBLIC_KEY.startsWith('YOUR_') &&
  !EMAILJS_SERVICE_ID.startsWith('YOUR_') &&
  !EMAILJS_TEMPLATE_ID.startsWith('YOUR_');

if (isConfigured) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

function showStatus(type, message) {
  formStatus.textContent = message;
  formStatus.className = 'form-status visible ' + type;
}

if (bookingForm) {
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!isConfigured) {
      showStatus('error', 'The online booking form isn’t connected yet. Please call us on 03 8383 4139 or email info@hoddleautomotive.com.au to book.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.firstChild.textContent = 'Sending… ';
    formStatus.className = 'form-status';

    emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, bookingForm)
      .then(() => {
        bookingForm.reset();
        showStatus('success', 'Thanks! Your booking request has been sent. We’ll contact you shortly to confirm a time.');
      })
      .catch(() => {
        showStatus('error', 'Sorry, something went wrong sending your request. Please try again, or call us on 03 8383 4139.');
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.firstChild.textContent = 'Send Booking Request ';
      });
  });
}

// =========================================
// PREFERRED DATE HINT
//
// The field stays a real <input type="date"> — native picker, validation and
// an unambiguous YYYY-MM-DD value. All this does is swap the browser's own
// locale-dependent hint text for the words "day/month/year" while the field
// is empty and unfocused. See .date-field in style.css.
// =========================================

const dateField = document.getElementById('bf-date');
const dateWrap  = dateField && dateField.closest('.date-field');

if (dateField && dateWrap) {
  const syncDateHint = () => {
    const showHint = !dateField.value && document.activeElement !== dateField;
    dateWrap.classList.toggle('hint-on', showHint);
  };

  syncDateHint();
  ['input', 'change', 'focus', 'blur'].forEach((evt) =>
    dateField.addEventListener(evt, syncDateHint)
  );

  // The form reset after a successful send empties the field again.
  if (bookingForm) {
    bookingForm.addEventListener('reset', () => setTimeout(syncDateHint, 0));
  }
}

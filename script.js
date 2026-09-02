// =========================================
// HODDLE AUTOMOTIVE — script.js (shared across all pages)
// =========================================

const navbar    = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
const openIcon  = document.getElementById('hamburger-open');
const closeIcon = document.getElementById('hamburger-close');

// --- Navbar: compacts to a slim bar once scrolled ---
if (navbar) {
  let ticking = false;

  const updateNav = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateNav);
      ticking = true;
    }
  }, { passive: true });

  updateNav(); // page may load already scrolled (refresh, or a #hash link)
}

// --- Mobile menu toggle ---
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    openIcon.style.display  = isOpen ? 'none'  : 'block';
    closeIcon.style.display = isOpen ? 'block' : 'none';
  });

  // Close mobile menu when any link inside it is clicked
  document.querySelectorAll('.mobile-nav-link, .mobile-nav .btn').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      openIcon.style.display  = 'block';
      closeIcon.style.display = 'none';
    });
  });
}

// --- FAQ accordion ---
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item   = btn.closest('.faq-item');
    const answer = item.querySelector('.faq-a');
    const isOpen = item.classList.contains('open');

    // Close every panel first (single-open accordion)
    document.querySelectorAll('.faq-item').forEach(other => {
      other.classList.remove('open');
      other.querySelector('.faq-a').style.maxHeight = null;
      other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      item.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// Keep an open answer correctly sized when the viewport reflows
window.addEventListener('resize', () => {
  const open = document.querySelector('.faq-item.open .faq-a');
  if (open) open.style.maxHeight = open.scrollHeight + 'px';
});

// --- Footer copyright year ---
const copyrightEl = document.getElementById('copyright');
if (copyrightEl) {
  copyrightEl.textContent = '© ' + new Date().getFullYear() + ' Hoddle Automotive. All rights reserved.';
}

// --- Fade-in on scroll ---
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll(
  '.service-card, .value-card, .contact-card, .location-card, .about-images, .about-text, ' +
  '.hours-card, .location-map, .featured-tile, .step-card, .mv-card, .faq-item, .transport-card, .repair-text'
).forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const sections = Array.from(document.querySelectorAll('main .section'));

if (mobileMenuButton && mobileMenu) {
  mobileMenuButton.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('show');
    mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
  });
}

const closeMobileMenu = () => {
  if (mobileMenu && mobileMenuButton) {
    mobileMenu.classList.remove('show');
    mobileMenuButton.setAttribute('aria-expanded', 'false');
  }
};

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    closeMobileMenu();
  });
});

const setActiveLink = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
  });
};

if ('IntersectionObserver' in window && sections.length > 0) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id);
        }
      });
    },
    { rootMargin: '-35% 0px -50% 0px', threshold: 0.01 }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

const revealItems = Array.from(document.querySelectorAll('.reveal'));

if ('IntersectionObserver' in window && revealItems.length > 0) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const year = document.getElementById('year');
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const contactForm = document.getElementById('contact-form');
const status = document.getElementById('form-status');

if (contactForm && status) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('name')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim() || '';
    const message = document.getElementById('message')?.value.trim() || '';

    if (!name || !email || !message) {
      status.textContent = 'Please fill out name, email, and message.';
      return;
    }

    const subject = encodeURIComponent(`Portfolio contact from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:gabrielgouvea@poli.ufrj.br?subject=${subject}&body=${body}`;

    status.textContent = 'Your email app should now open with your draft message.';
    contactForm.reset();
  });
}

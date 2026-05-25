const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const sections = Array.from(document.querySelectorAll('main .section'));

const blogPosts = [
  {
    id: 'vision-design-and-tech-choices',
    title: 'Our Vision for This Portfolio: Design, HTML, and JavaScript',
    date: 'May 2026',
    readTime: '6 min read',
    summary:
      'Why this portfolio was designed like a technical editorial, why it is intentionally built with plain HTML/CSS/JavaScript, and how this keeps the site fast, accessible, and maintainable.',
    paragraphs: [
      'The core goal of this website is simple: help someone understand who we are, what we build, and how to contact us in under a minute. That guided the information architecture and every design tradeoff.',
      'The visual direction is intentionally technical and editorial. We combined bold typography, a dark atmospheric background, and warm/cool accents to make the experience distinctive while still prioritizing readability and scanning speed.',
      'We chose plain HTML, CSS, and JavaScript on purpose. This is a mostly static site, so a framework would add complexity without clear product value. Vanilla web tech keeps load times low, mental overhead small, and long-term maintenance straightforward.',
      'Accessibility and clarity were baseline requirements, not afterthoughts. Semantic sections, predictable anchors, keyboard-friendly navigation, and readable contrast ensure that the portfolio remains usable across devices and user needs.',
      'This same philosophy applies to interactions: subtle reveal animations, sticky navigation, and active section highlighting support comprehension without distracting from the content. The system is intentionally simple to evolve as new projects and ideas are added.'
    ],
    source: 'Based on notes from docs/DESIGN_CHOICES.md'
  }
];

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

const blogList = document.getElementById('blog-list');
if (blogList) {
  blogList.innerHTML = blogPosts
    .map(
      (post) => `
        <article class="blog-card">
          <p class="blog-meta">${post.date} · ${post.readTime}</p>
          <h3>${post.title}</h3>
          <p>${post.summary}</p>
          <details class="blog-details">
            <summary>Read full post</summary>
            ${post.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}
            <p class="blog-source">${post.source}</p>
          </details>
        </article>
      `
    )
    .join('');
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

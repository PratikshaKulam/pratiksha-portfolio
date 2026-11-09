// Shared behaviour for story-style case studies: reveal on scroll + active chapter in the sticky nav.
(() => {
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('visible'); reveal.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el));

  const links = [...document.querySelectorAll('.chapter-nav a')];
  const chapters = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const setActive = () => {
    let current = chapters[0];
    chapters.forEach((c) => { if (window.scrollY >= c.offsetTop - 160) current = c; });
    links.forEach((a) => a.classList.toggle('active', current && a.getAttribute('href') === '#' + current.id));
  };
  window.addEventListener('scroll', setActive, { passive: true });
  setActive();
})();

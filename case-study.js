/* case-study.js — shared behaviour for story-style case studies:
   nav that hides on scroll-down, chapter progress, scrollytelling, tabs, timeline line. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* nav: solid after hero, hides while scrolling down */
  const nav = document.querySelector('nav.topnav');
  let lastY = scrollY;
  const navTick = () => {
    if (!nav) return;
    nav.classList.toggle('solid', scrollY > 40);
    const hidden = scrollY > 400 && scrollY > lastY;
    nav.classList.toggle('hide', hidden);
    document.body.classList.toggle('nav-shown', !hidden);
    lastY = scrollY;
  };

  /* chapter nav progress + active */
  const links = [...document.querySelectorAll('.chapter-nav a')];
  const chapters = links.map((a) => document.querySelector(a.getAttribute('href')));
  const chapterTick = () => {
    const mid = scrollY + innerHeight * 0.35;
    chapters.forEach((c, i) => {
      if (!c) return;
      const top = c.offsetTop, h = c.offsetHeight;
      const p = Math.max(0, Math.min(1, (mid - top) / h));
      links[i].style.setProperty('--p', p.toFixed(3));
      links[i].classList.toggle('active', mid >= top && mid < top + h);
    });
  };

  /* timeline line draws with scroll */
  const lines = [...document.querySelectorAll('.timeline')].map((t) => {
    const l = document.createElement('span'); l.className = 'tl-line'; l.style.transformOrigin = '0 50%'; l.style.transform = 'scaleX(0)';
    t.prepend(l); return { t, l };
  });
  const lineTick = () => lines.forEach(({ t, l }) => {
    const r = t.getBoundingClientRect();
    const p = reduce ? 1 : Math.max(0, Math.min(1, (innerHeight * 0.85 - r.top) / (innerHeight * 0.5)));
    l.style.transform = `scaleX(${p.toFixed(3)})`;
  });

  let raf = false;
  const onScroll = () => { if (raf) return; raf = true; requestAnimationFrame(() => { navTick(); chapterTick(); lineTick(); raf = false; }); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* scrollytelling: .story with .story-frames children and .story-step[data-frame] */
  document.querySelectorAll('.story').forEach((story) => {
    const frames = [...story.querySelectorAll('.story-frames > *')];
    const steps = [...story.querySelectorAll('.story-step')];
    const show = (i) => {
      frames.forEach((f, j) => f.classList.toggle('on', j === i));
      steps.forEach((s) => s.classList.toggle('on', +s.dataset.frame === i));
    };
    show(0);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) show(+e.target.dataset.frame); }), { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => io.observe(s));
  });

  /* tabs with sliding pill: <div class="tabs" data-tabs="groupName"> + panels [data-panel="groupName:key"] */
  document.querySelectorAll('.tabs').forEach((tabs) => {
    const pill = document.createElement('span'); pill.className = 'pill'; tabs.prepend(pill);
    const btns = [...tabs.querySelectorAll('button')];
    const group = tabs.dataset.tabs;
    const select = (btn, focus) => {
      btns.forEach((b) => { b.setAttribute('aria-selected', b === btn); b.tabIndex = b === btn ? 0 : -1; });
      pill.style.left = btn.offsetLeft + 'px'; pill.style.width = btn.offsetWidth + 'px';
      document.querySelectorAll(`[data-panel^="${group}:"]`).forEach((p) => { p.hidden = p.dataset.panel !== `${group}:${btn.dataset.key}`; });
      if (focus) btn.focus();
      tabs.dispatchEvent(new CustomEvent('tabchange', { detail: btn.dataset.key }));
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') select(btns[(i + 1) % btns.length], true);
        if (e.key === 'ArrowLeft') select(btns[(i - 1 + btns.length) % btns.length], true);
      });
    });
    const init = () => select(btns.find((b) => b.getAttribute('aria-selected') === 'true') || btns[0]);
    init(); addEventListener('resize', init); document.fonts && document.fonts.ready.then(init);
  });
})();

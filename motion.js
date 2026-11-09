/* motion.js — shared interaction layer. Opt-in via data attributes:
   data-reveal[="fade|left|scale|clip"]  data-split  data-count="65" (data-decimals, data-prefix, data-suffix)
   data-tilt  data-magnetic  data-parallax="0.15"  data-cursor="Label"  .m-bar / .m-bar-y (style="--v:.5")
   mark.sweep  — and [data-inview] for any element that just needs the .in class. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('m-js');

  /* ── split headings into words ── */
  document.querySelectorAll('[data-split]').forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span'); w.className = 'm-word';
            const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  });

  /* ── count-up numbers ── */
  const fmt = (el, v) => {
    const d = +(el.dataset.decimals || 0);
    let s = Math.abs(v).toFixed(d);
    if (el.dataset.sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const sign = v < 0 ? '−' : '';
    return (el.dataset.prefix || '') + sign + s + (el.dataset.suffix || '');
  };
  const runCount = (el) => {
    const target = parseFloat(el.dataset.count);
    if (reduce) { el.textContent = fmt(el, target); return; }
    const from = parseFloat(el.dataset.from || 0), dur = +(el.dataset.duration || 1600), t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(el, from + (target - from) * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = fmt(el, parseFloat(el.dataset.from || 0)); });

  /* ── one observer for everything that animates on view ── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      if (el.hasAttribute('data-count')) runCount(el);
      el.dispatchEvent(new CustomEvent('m:in'));
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('[data-reveal],[data-split],[data-count],[data-inview],mark.sweep,.m-bar,.m-bar-y').forEach((el) => io.observe(el));

  /* ── scroll progress bar ── */
  const bar = document.createElement('div'); bar.className = 'm-progress'; bar.innerHTML = '<span></span>';
  document.body.appendChild(bar);
  const barFill = bar.firstChild;

  /* ── parallax ── */
  const parallax = reduce ? [] : [...document.querySelectorAll('[data-parallax]')];

  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const max = root.scrollHeight - innerHeight;
      barFill.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        const off = (r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${(-off).toFixed(1)}px, 0)`;
      });
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  if (reduce || !finePointer) return;

  /* ── tilt ── */
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const max = parseFloat(el.dataset.tilt) || 6;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add('is-tilting');
      el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateZ(0)`;
    });
    el.addEventListener('pointerleave', () => { el.classList.remove('is-tilting'); el.style.transform = ''; });
  });

  /* ── magnetic ── */
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const s = parseFloat(el.dataset.magnetic) || 0.3;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.classList.add('is-pulling');
      el.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * s).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * s).toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => { el.classList.remove('is-pulling'); el.style.transform = ''; });
  });

  /* ── cursor ── */
  const ring = document.createElement('div'); ring.className = 'm-cursor is-hidden'; ring.innerHTML = '<b></b>';
  const dot = document.createElement('div'); dot.className = 'm-cursor-dot is-hidden';
  document.body.append(ring, dot);
  root.classList.add('m-has-cursor');
  const label = ring.firstChild;
  let mx = -100, my = -100, rx = -100, ry = -100;
  addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    ring.classList.remove('is-hidden'); dot.classList.remove('is-hidden');
    const t = e.target.closest && e.target.closest('[data-cursor], a, button, label, [role="button"], input[type="range"]');
    const text = t && t.dataset ? t.dataset.cursor : '';
    ring.classList.toggle('is-label', !!text);
    ring.classList.toggle('is-link', !!t && !text);
    if (text) label.textContent = text;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { ring.classList.add('is-hidden'); dot.classList.add('is-hidden'); });
  const follow = () => {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    requestAnimationFrame(follow);
  };
  follow();
})();

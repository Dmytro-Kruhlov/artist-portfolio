(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;

  /* ---------- i18n ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const detectLang = () => {
    const saved = store.get("lang");
    if (saved && I18N[saved]) return saved;
    const nav = (navigator.language || "en").slice(0, 2);
    if (nav === "ru" || nav === "uk") return "ru";
    if (nav === "de") return "de";
    return "en";
  };
  let lang = detectLang();

  function applyLang(l) {
    lang = l;
    const d = I18N[l];
    document.documentElement.lang = l;
    $$("[data-i18n]").forEach(el => { const v = d[el.dataset.i18n]; if (v != null) el.textContent = v; });
    $$("[data-i18n-html]").forEach(el => { const v = d[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
    $$(".lang button").forEach(b => b.classList.toggle("is-active", b.dataset.lang === l));
    document.title = `${d["name.full"]} — ${d["cat.illustration"]}`;
    $$(".tile").forEach(t => {
      const w = WORKS[t.dataset.i];
      $(".tile__title", t).textContent = w.t[l];
      $(".tile__cat", t).textContent = d["cat." + w.cat];
      $("img", t).alt = w.t[l];
    });
    store.set("lang", l);
    fitTitle();
  }
  $$(".lang button").forEach(b => b.addEventListener("click", () => applyLang(b.dataset.lang)));

  /* ---------- hero name: fit to column whatever its length ---------- */
  const title = $(".hero__title");
  function fitTitle() {
    title.style.setProperty("--fit", "100px");
    const widest = Math.max(...$$(".line > span", title).map(s => s.offsetWidth));
    const avail = title.clientWidth;
    const size = Math.min(150, 100 * avail / widest * 0.98);
    title.style.setProperty("--fit", `${Math.max(34, size)}px`);
  }
  addEventListener("resize", fitTitle);
  // refit whenever the name's rendered width changes (web font swap, language switch)
  if ("ResizeObserver" in window) {
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fitTitle); });
    $$(".line > span", title).forEach(s => ro.observe(s));
  }
  document.fonts?.ready.then(fitTitle);

  /* ---------- bunting flags ---------- */
  const colors = ["coral", "teal", "sun"];
  $$(".flags").forEach(box => {
    const n = innerWidth < 700 ? 9 : 18;
    for (let i = 0; i < n; i++) {
      const f = document.createElement("span");
      f.className = "flag flag--" + colors[i % 3];
      const x = (i + 0.5) / n;
      // follow the sag of the string: y = 4 * sag * x * (1 - x)
      f.style.left = `${x * 100}%`;
      f.style.top = `${4 * 44 * x * (1 - x) + 4}px`;
      f.style.animationDelay = `${-i * 0.23}s`;
      box.appendChild(f);
    }
  });

  /* ---------- works grid ---------- */
  const grid = $("#grid");
  WORKS.forEach((w, i) => {
    const a = document.createElement("a");
    a.className = "tile";
    a.href = `assets/img/${w.id}.webp`;
    a.dataset.i = i;
    a.dataset.cat = w.cat;
    a.innerHTML = `
      <div class="tile__img" style="aspect-ratio:${w.w}/${w.h}">
        <img src="assets/img/${w.id}-sm.webp" width="${w.w}" height="${w.h}" loading="lazy" decoding="async" alt="">
      </div>
      <div class="tile__meta"><span class="tile__title"></span><span class="tile__cat"></span></div>`;
    grid.appendChild(a);
  });

  // filter counts
  $$(".chip").forEach(c => {
    const f = c.dataset.filter;
    $("sup", c).textContent = f === "all" ? WORKS.length : WORKS.filter(w => w.cat === f).length;
  });
  $$(".chip").forEach(c => c.addEventListener("click", () => {
    $$(".chip").forEach(x => x.classList.toggle("is-active", x === c));
    const f = c.dataset.filter;
    grid.classList.add("is-switching");
    setTimeout(() => {
      $$(".tile").forEach(t => { t.hidden = !(f === "all" || t.dataset.cat === f); });
      grid.classList.remove("is-switching");
    }, reduced ? 0 : 220);
  }));

  // tilt on hover
  if (finePointer && !reduced) {
    grid.addEventListener("pointermove", e => {
      const t = e.target.closest(".tile"); if (!t) return;
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      t.style.setProperty("--rx", `${-y * 6}deg`);
      t.style.setProperty("--ry", `${x * 6}deg`);
    });
    grid.addEventListener("pointerout", e => {
      const t = e.target.closest(".tile");
      if (t && !t.contains(e.relatedTarget)) { t.style.removeProperty("--rx"); t.style.removeProperty("--ry"); }
    });
  }

  /* ---------- lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("img", lb), lbCap = $("figcaption", lb);
  let current = 0;
  const visible = () => $$(".tile").filter(t => !t.hidden);
  function openLb(i) {
    current = i;
    const w = WORKS[i];
    lbImg.classList.remove("is-loaded");
    lbImg.src = `assets/img/${w.id}.webp`;
    lbImg.alt = w.t[lang];
    lbCap.innerHTML = `<b>${w.t[lang]}</b><span>${I18N[lang]["cat." + w.cat]}</span>`;
    if (lb.hidden) { lb.hidden = false; requestAnimationFrame(() => lb.classList.add("is-open")); document.body.style.overflow = "hidden"; }
  }
  lbImg.addEventListener("load", () => lbImg.classList.add("is-loaded"));
  function closeLb() {
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => { lb.hidden = true; }, reduced ? 0 : 300);
  }
  function step(d) {
    const v = visible().map(t => +t.dataset.i);
    const k = v.indexOf(current);
    openLb(v[(k + d + v.length) % v.length]);
  }
  grid.addEventListener("click", e => {
    const t = e.target.closest(".tile"); if (!t) return;
    e.preventDefault(); openLb(+t.dataset.i);
  });
  $(".lb__close").addEventListener("click", closeLb);
  $(".lb__prev").addEventListener("click", () => step(-1));
  $(".lb__next").addEventListener("click", () => step(1));
  lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb__fig")) closeLb(); });
  addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  let sx = null;
  lb.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    sx = null;
  });

  /* ---------- hero stickers: drag + parallax ---------- */
  const art = $(".hero__art");
  let z = 10;
  $$(".sticker").forEach(s => {
    let start = null;
    s.addEventListener("pointerdown", e => {
      e.preventDefault();
      s.setPointerCapture(e.pointerId);
      const dx = parseFloat(s.style.getPropertyValue("--dx")) || 0;
      const dy = parseFloat(s.style.getPropertyValue("--dy")) || 0;
      start = { x: e.clientX - dx, y: e.clientY - dy };
      s.style.zIndex = ++z;
      s.classList.add("is-dragging");
      art.classList.add("was-touched");
    });
    s.addEventListener("pointermove", e => {
      if (!start) return;
      s.style.setProperty("--dx", `${e.clientX - start.x}px`);
      s.style.setProperty("--dy", `${e.clientY - start.y}px`);
    });
    const end = () => { start = null; s.classList.remove("is-dragging"); };
    s.addEventListener("pointerup", end);
    s.addEventListener("pointercancel", end);
  });
  if (finePointer && !reduced) {
    $(".hero").addEventListener("pointermove", e => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      art.style.setProperty("--px", x.toFixed(3));
      art.style.setProperty("--py", y.toFixed(3));
    });
  }

  /* ---------- before / after ---------- */
  $$(".compare").forEach(c => {
    const input = $("input", c);
    const set = () => c.style.setProperty("--pos", input.value + "%");
    input.addEventListener("input", set); set();
    // gentle hint animation the first time it scrolls into view
    if (!reduced) {
      const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        let t0 = null;
        const anim = ts => {
          if (c.dataset.touched) return;
          t0 ??= ts;
          const p = (ts - t0) / 1600;
          if (p > 1) { input.value = 50; set(); return; }
          input.value = 50 + Math.sin(p * Math.PI * 2) * 22; set();
          requestAnimationFrame(anim);
        };
        setTimeout(() => requestAnimationFrame(anim), 500);
      }, { threshold: 0.6 });
      io.observe(c);
      input.addEventListener("pointerdown", () => { c.dataset.touched = 1; }, { once: true });
    }
  });

  /* ---------- reveal + counters ---------- */
  const countUp = el => {
    const to = +el.dataset.count;
    if (reduced) { el.textContent = to; return; }
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / 1200);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  $$("[data-count]").forEach(el => { if (el.dataset.count === "auto") el.dataset.count = WORKS.length; });
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add("is-in");
    $$("[data-count]", en.target).forEach(countUp);
    io.unobserve(en.target);
  }), { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal, .tile").forEach(el => io.observe(el));

  /* ---------- nav ---------- */
  const nav = $(".nav");
  let lastY = 0;
  addEventListener("scroll", () => {
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > lastY && y > 400 && lb.hidden);
    lastY = y;
  }, { passive: true });

  /* ---------- cursor ---------- */
  if (finePointer && !reduced) {
    const cur = $(".cursor");
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; cur.classList.add("is-on"); });
    document.addEventListener("pointerleave", () => cur.classList.remove("is-on"));
    const loop = () => {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cur.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener("pointerover", e => {
      const tile = e.target.closest(".tile"), stick = e.target.closest(".sticker");
      const link = e.target.closest("a, button, input");
      cur.classList.toggle("is-view", !!tile);
      cur.classList.toggle("is-grab", !!stick);
      cur.classList.toggle("is-link", !!link && !tile);
      $("span", cur).textContent = tile ? "✦" : "";
    });
  } else {
    $(".cursor").remove();
  }

  $("#year").textContent = new Date().getFullYear();
  applyLang(lang);
  requestAnimationFrame(() => document.body.classList.add("is-ready"));
})();

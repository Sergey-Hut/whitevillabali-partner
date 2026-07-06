/* ===== White Villa Bali — motion system ===== */
(function () {
  "use strict";
  var SHOT = location.search.indexOf("shot") > -1;
  if (SHOT) {
    document.documentElement.classList.add("is-shot");
    document.querySelectorAll("[data-count]").forEach(function (n) { n.textContent = n.getAttribute("data-count"); });
  }
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

  /* ---- intro loader ---- */
  (function () {
    var loader = document.getElementById("loader");
    if (!loader) return;
    function remove() { if (loader.parentNode) loader.parentNode.removeChild(loader); }
    if (reduce || SHOT) { remove(); return; }
    setTimeout(function () {
      loader.classList.add("is-done");
      setTimeout(remove, 900);
    }, 1500);
  })();

  /* ---- custom cursor (desktop) ---- */
  (function () {
    if (reduce || SHOT || !window.matchMedia("(pointer:fine)").matches) return;
    var cur = document.getElementById("cursor");
    if (!cur) return;
    var x = 0, y = 0, cx = 0, cy = 0, shown = false;
    document.addEventListener("mousemove", function (e) {
      x = e.clientX; y = e.clientY;
      if (!shown) { cur.style.opacity = "1"; shown = true; }
    });
    function loop() {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cur.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    }
    loop();
    document.querySelectorAll("a, button, .gal__item, .faq__q, [data-magnetic]").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cur.classList.add("is-active"); });
      el.addEventListener("mouseleave", function () { cur.classList.remove("is-active"); });
    });
  })();

  /* ---- top progress bar ---- */
  var bar = document.querySelector(".progress");
  function setProgress() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop || window.scrollY) / max : 0;
    if (bar) bar.style.width = (p * 100).toFixed(2) + "%";
  }

  /* ---- nav stuck ---- */
  var nav = document.querySelector("[data-nav]");
  var burgerEl = document.getElementById("navBurger");
  function setNav() {
    var stuck = (window.scrollY || 0) > window.innerHeight * 0.7;
    if (nav) nav.classList.toggle("is-stuck", stuck);
    if (burgerEl) burgerEl.classList.toggle("is-dark", stuck);
  }

  /* ---- smooth scroll (Lenis) ---- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: !lowPower });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    lenis.on("scroll", function () { setProgress(); setNav(); });
  }
  window.addEventListener("scroll", function () { setProgress(); setNav(); }, { passive: true });

  /* anchor smooth scroll */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -10 }); else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ---- count-up ---- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target)) return;
    if (reduce || SHOT) { el.textContent = target; return; }
    var dur = 1400, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---- reveals (GSAP ScrollTrigger if present, else IO) ---- */
  var revealEls = document.querySelectorAll("[data-reveal], .hero__title .line");
  var counted = {};

  function reveal(el) {
    el.classList.add("is-in");
    el.querySelectorAll && el.querySelectorAll("[data-count]").forEach(function (n) {
      var key = n.getAttribute("data-count") + n.className;
      if (!counted[key]) { counted[key] = 1; countUp(n); }
    });
    if (el.hasAttribute && el.hasAttribute("data-count") && !counted[el.className]) { counted[el.className] = 1; countUp(el); }
  }

  // hero reveals on load (so it's visible immediately, even for screenshots)
  function revealHero() {
    document.querySelectorAll(".hero [data-reveal], .hero__title .line").forEach(function (el, i) {
      setTimeout(function () { reveal(el); }, reduce ? 0 : 120 + i * 110);
    });
  }

  if (window.gsap && window.ScrollTrigger && !reduce) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll(".section [data-reveal]").forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: "top 86%", once: true, onEnter: function () { reveal(el); } });
    });
    // hero scroll-linked zoom-in (variant B)
    gsap.fromTo(".hero__media img", { scale: 1.03 }, { scale: 1.16, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    // clip-mask reveal for image blocks (skip in screenshot mode)
    if (!SHOT) {
      gsap.utils.toArray(".gal__item, .sld, .loc__map, .vid__media").forEach(function (el) {
        gsap.from(el, { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 86%", once: true } });
      });
    }
  } else {
    // fallback: IntersectionObserver
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.18 });
      document.querySelectorAll(".section [data-reveal]").forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(reveal);
    }
  }

  /* ---- magnetic CTA ---- */
  if (!reduce && !lowPower && window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.18 + "px," + (e.clientY - r.top - r.height / 2) * 0.3 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---- video tour (YouTube facade: poster -> iframe on click) ---- */
  (function () {
    var media = document.getElementById("tourMedia"), play = document.getElementById("tourPlay");
    if (!media || !play) return;
    play.addEventListener("click", function () {
      var id = media.getAttribute("data-yt");
      if (!id) return;
      var ifr = document.createElement("iframe");
      ifr.className = "vid__iframe";
      ifr.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1&playsinline=1&color=white";
      ifr.title = "Видеотур White Villa Bali";
      ifr.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
      ifr.setAttribute("allowfullscreen", "");
      media.innerHTML = "";
      media.appendChild(ifr);
    });
  })();

  /* ---- interior sliders ---- */
  document.querySelectorAll("[data-slider]").forEach(function (sld) {
    var track = sld.querySelector(".sld__track");
    if (!track) return;
    var slides = [].slice.call(track.children);
    var n = slides.length;
    var dotsWrap = sld.querySelector(".sld__dots");
    var counter = sld.querySelector(".sld__count");
    var cur = 0, dots = [];
    if (dotsWrap) {
      slides.forEach(function (_, i) {
        var b = document.createElement("button");
        b.setAttribute("aria-label", "Слайд " + (i + 1));
        b.addEventListener("click", function () { go(i); });
        dotsWrap.appendChild(b); dots.push(b);
      });
    }
    function setActive(i) {
      cur = i;
      dots.forEach(function (d, j) { d.classList.toggle("is-active", j === i); });
      if (counter) counter.textContent = (i + 1) + " / " + n;
    }
    function go(i) {
      i = Math.max(0, Math.min(n - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? "auto" : "smooth" });
      setActive(i);
    }
    var prev = sld.querySelector(".sld__prev"), next = sld.querySelector(".sld__next");
    // looped navigation: wrap around at both ends
    if (prev) prev.addEventListener("click", function () { go((cur - 1 + n) % n); });
    if (next) next.addEventListener("click", function () { go((cur + 1) % n); });
    var tmr;
    track.addEventListener("scroll", function () {
      clearTimeout(tmr);
      tmr = setTimeout(function () { setActive(Math.round(track.scrollLeft / track.clientWidth)); }, 90);
    }, { passive: true });
    setActive(0);
  });

  /* ---- mobile burger menu ---- */
  (function () {
    var burger = document.getElementById("navBurger"), panel = document.getElementById("navPanel");
    if (!burger || !panel) return;
    function setMenu(open) {
      burger.classList.toggle("is-open", open);
      panel.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.style.overflow = open ? "hidden" : "";
    }
    burger.addEventListener("click", function () { setMenu(!panel.classList.contains("is-open")); });
    panel.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  })();

  /* ---- contact form: clear field errors on input; SUBMIT handled in i18n.js (popup + relay + language) ---- */
  (function () {
    var f = document.getElementById("bookForm");
    if (!f) return;
    f.querySelectorAll("input,textarea").forEach(function (el) {
      el.addEventListener("input", function () { var w = el.closest(".field"); if (w) w.classList.remove("is-err"); });
    });
  })();

  /* ---- faq accordion ---- */
  document.querySelectorAll(".faq__q").forEach(function (q) {
    q.addEventListener("click", function () {
      var item = q.parentNode, a = item.querySelector(".faq__a");
      var open = item.classList.toggle("is-open");
      q.setAttribute("aria-expanded", open ? "true" : "false");
      a.style.maxHeight = open ? a.scrollHeight + "px" : "0";
    });
  });
  document.querySelectorAll(".faq__item.is-open .faq__a").forEach(function (a) {
    a.style.maxHeight = a.scrollHeight + "px";
  });

  /* ---- invest calculator ---- */
  (function () {
    var rate = document.getElementById("invRate"), occ = document.getElementById("invOcc");
    if (!rate || !occ) return;
    var rv = document.getElementById("invRateV"), ov = document.getElementById("invOccV");
    var g = document.getElementById("invGross"), nt = document.getElementById("invNet"),
        yl = document.getElementById("invYield"), pay = document.getElementById("invPay");
    var PRICE = 850000, NETF = 0.45;
    function ru(n) { return n.toLocaleString("ru-RU"); }
    function calc() {
      var r = +rate.value, o = +occ.value / 100;
      var gross = Math.round(r * 365 * o), net = Math.round(gross * NETF);
      rv.textContent = "$" + ru(r);
      ov.textContent = occ.value + "%";
      g.textContent = "$" + ru(gross);
      nt.textContent = "$" + ru(net);
      yl.textContent = (net / PRICE * 100).toFixed(1).replace(".", ",") + "%";
      pay.textContent = (PRICE / net).toFixed(1).replace(".", ",") + " года";
    }
    rate.addEventListener("input", calc);
    occ.addEventListener("input", calc);
    calc();
  })();

  /* ---- gallery lightbox ---- */
  (function () {
    var lb = document.getElementById("lightbox");
    if (!lb) return;
    var imgs = [].slice.call(document.querySelectorAll(".gal__item img"));
    if (!imgs.length) return;
    var view = lb.querySelector(".lb__img");
    var count = lb.querySelector(".lb__count");
    var idx = 0;
    function show(i) {
      idx = (i + imgs.length) % imgs.length;
      view.src = imgs[idx].getAttribute("src");
      view.alt = imgs[idx].alt || "";
      count.textContent = (idx + 1) + " / " + imgs.length;
    }
    function open(i) { show(i); lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
    function close() { lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
    imgs.forEach(function (im, i) { im.parentNode.addEventListener("click", function () { open(i); }); });
    lb.querySelector(".lb__close").addEventListener("click", close);
    lb.querySelector(".lb__prev").addEventListener("click", function (e) { e.stopPropagation(); show(idx - 1); });
    lb.querySelector(".lb__next").addEventListener("click", function (e) { e.stopPropagation(); show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
    });
  })();

  /* ---- init ---- */
  window.addEventListener("load", revealHero);
  if (document.readyState === "complete") revealHero();
  setProgress(); setNav();
})();

/* ---- floor plans: book of original scans, page-flip between floors + zoom ---- */
(function () {
  var book = document.getElementById("plnBook");
  if (!book) return;
  var pages = Array.prototype.slice.call(book.querySelectorAll(".pln__page"));
  var levels = document.querySelectorAll("#plnLevels .pln__level");
  var prevB = document.getElementById("plnPrev"), nextB = document.getElementById("plnNext");
  var capEl = document.getElementById("plnCap"), numEl = document.getElementById("plnNum");
  var total = pages.length, cur = 0;
  var caps = [
    "<b>Уровень&nbsp;01</b>&nbsp;— въезд, гараж на&nbsp;2&nbsp;авто, блок персонала, входная галерея, сад и&nbsp;бассейн.",
    "<b>Уровень&nbsp;02</b>&nbsp;— гостиная с&nbsp;кинотеатром, кухня-столовая и&nbsp;мастер-спальня; выход на&nbsp;террасу к&nbsp;бассейну.",
    "<b>Уровень&nbsp;03</b>&nbsp;— спальни-сьюты с&nbsp;гардеробными и&nbsp;ванными; кабинет, тёплый камень и&nbsp;дерево.",
    "<b>Уровень&nbsp;04</b>&nbsp;— панорамная крыша 360°: террасы, gazebo, виды на&nbsp;океан, GWK и&nbsp;гору&nbsp;Агунг."
  ];
  pages.forEach(function (p, i) { p.style.zIndex = total - i; });
  function render() {
    pages.forEach(function (p, i) { p.classList.toggle("flipped", i < cur); p.classList.toggle("is-current", i === cur); });
    levels.forEach(function (b, i) { b.classList.toggle("is-active", i === cur); });
    if (capEl && caps[cur]) capEl.innerHTML = caps[cur];
    if (numEl) numEl.textContent = "0" + (cur + 1);
    if (prevB) prevB.disabled = cur === 0;
    if (nextB) nextB.disabled = cur === total - 1;
  }
  function go(i) { cur = Math.max(0, Math.min(total - 1, i)); render(); }
  if (nextB) nextB.addEventListener("click", function () { go(cur + 1); });
  if (prevB) prevB.addEventListener("click", function () { go(cur - 1); });
  levels.forEach(function (b, i) { b.addEventListener("click", function () { go(i); }); });
  render();

  var zoom = document.getElementById("plnZoom");
  if (zoom) {
    var zImg = zoom.querySelector("img");
    function openZoom(src, alt) {
      zImg.src = src; zImg.alt = alt || "Чертёж этажа";
      zoom.classList.add("is-open"); zoom.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function closeZoom() {
      zoom.classList.remove("is-open"); zoom.setAttribute("aria-hidden", "true");
      document.body.style.overflow = ""; zImg.src = "";
    }
    document.querySelectorAll(".pln__planimg").forEach(function (img) {
      img.addEventListener("click", function () { openZoom(img.getAttribute("src"), img.getAttribute("alt")); });
    });
    zoom.addEventListener("click", closeZoom);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && zoom.classList.contains("is-open")) closeZoom();
    });
  }
})();

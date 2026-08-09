"use strict";

(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- always enter at the top (keep hash links working) ---------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!window.location.hash) {
    window.scrollTo(0, 0);
    window.addEventListener("load", () => {
      if (!window.location.hash) window.scrollTo(0, 0);
    });
  }

  /* ---------- year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- header scroll state ---------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- reveal on scroll (enhances visible baseline) ---------- */
  const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));
  const revealAll = () => revealEls.forEach((el) => el.classList.add("is-in"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    // Stagger items that share a parent for a more orchestrated feel.
    const byParent = new Map();
    revealEls.forEach((el) => {
      const key = el.parentElement;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(el);
    });
    byParent.forEach((group) => {
      group.forEach((el, i) => {
        el.style.transitionDelay = Math.min(i * 70, 420) + "ms";
      });
    });

    revealEls.forEach((el) => io.observe(el));

    // Failsafe: never ship blank if something prevents the observer firing.
    window.setTimeout(revealAll, 1800);
    window.addEventListener("load", () => window.setTimeout(revealAll, 200));
  }

  /* ---------- cursor glow on hero ---------- */
  const hero = document.querySelector(".hero");
  const glow = document.getElementById("glow");
  if (hero && glow && finePointer && !reduceMotion) {
    hero.addEventListener(
      "pointermove",
      (e) => {
        const r = hero.getBoundingClientRect();
        glow.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        glow.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      },
      { passive: true }
    );
  }

  /* ---------- animated dot field ---------- */
  const canvas = document.getElementById("field");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const COLOR = [95, 233, 170]; // jade, approx of --signal
    const SPACING = 36;
    const DOT = 1.15;
    const INFLUENCE = 170;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / SPACING) + 1;
      rows = Math.ceil(h / SPACING) + 1;
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      // ease pointer toward target
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      const time = t * 0.0011;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * SPACING;
          const baseY = j * SPACING;
          const y = baseY + Math.sin(time + i * 0.35 + j * 0.22) * 3;

          let alpha = 0.06;
          let radius = DOT;

          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < INFLUENCE) {
            const f = 1 - dist / INFLUENCE;
            alpha += f * 0.85;
            radius += f * 1.4;
          }

          ctx.beginPath();
          ctx.fillStyle = "rgba(" + COLOR[0] + "," + COLOR[1] + "," + COLOR[2] + "," + alpha.toFixed(3) + ")";
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = window.requestAnimationFrame(draw);
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(" + COLOR[0] + "," + COLOR[1] + "," + COLOR[2] + ",0.07)";
          ctx.arc(i * SPACING, j * SPACING, DOT, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const start = () => {
      window.cancelAnimationFrame(raf);
      if (reduceMotion) {
        drawStatic();
      } else {
        raf = window.requestAnimationFrame(draw);
      }
    };

    if (hero && finePointer && !reduceMotion) {
      hero.addEventListener(
        "pointermove",
        (e) => {
          const r = canvas.getBoundingClientRect();
          pointer.tx = e.clientX - r.left;
          pointer.ty = e.clientY - r.top;
        },
        { passive: true }
      );
      hero.addEventListener("pointerleave", () => {
        pointer.tx = -9999;
        pointer.ty = -9999;
      });
    }

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        if (reduceMotion) drawStatic();
      }, 160);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        window.cancelAnimationFrame(raf);
      } else {
        start();
      }
    });

    resize();
    start();
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".btn").forEach((btn) => {
      const strength = 0.28;
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        btn.style.transform = "translate(" + mx * strength + "px," + my * strength + "px)";
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.transform = "";
      });
    });

    /* ---------- subtle tilt on featured card ---------- */
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      const max = 4;
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          "perspective(1000px) rotateX(" + (-py * max).toFixed(2) + "deg) rotateY(" + (px * max).toFixed(2) + "deg)";
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ---------- copy email ---------- */
  const toast = document.getElementById("toast");
  let toastTimer = 0;
  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-shown");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-shown"), 2200);
  };

  const copyText = async (value, okMsg) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(okMsg);
    } catch (err) {
      showToast(value);
    }
  };

  const copyBtn = document.getElementById("copyEmail");
  if (copyBtn) {
    copyBtn.addEventListener("click", () =>
      copyText(copyBtn.getAttribute("data-email") || "", "已复制邮箱 " + copyBtn.getAttribute("data-email"))
    );
  }

  const copyWechat = document.getElementById("copyWechat");
  if (copyWechat) {
    copyWechat.addEventListener("click", () =>
      copyText(copyWechat.getAttribute("data-wechat") || "", "已复制微信号 " + copyWechat.getAttribute("data-wechat"))
    );
  }
})();

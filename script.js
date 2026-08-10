"use strict";

(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;

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

  /* ---------- mobile navigation ---------- */
  const navToggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");
  const navScrim = document.getElementById("navScrim");
  if (header && navToggle && mobileNav && navScrim) {
    const inertTargets = Array.from(document.querySelectorAll("main, .site-footer"));
    const setMenuOpen = (open, restoreFocus = false) => {
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
      mobileNav.hidden = !open;
      navScrim.hidden = !open;
      header.classList.toggle("is-menu-open", open);
      document.body.classList.toggle("is-nav-open", open);
      inertTargets.forEach((target) => {
        target.inert = open;
      });
      if (!open && restoreFocus) navToggle.focus();
    };

    navToggle.addEventListener("click", () => {
      setMenuOpen(navToggle.getAttribute("aria-expanded") !== "true");
    });
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false, true));
    });
    navScrim.addEventListener("click", () => setMenuOpen(false, true));
    const brand = header.querySelector(".brand");
    if (brand) brand.addEventListener("click", () => setMenuOpen(false));
    document.addEventListener("keydown", (event) => {
      if (navToggle.getAttribute("aria-expanded") !== "true") return;
      if (event.key === "Escape") {
        setMenuOpen(false, true);
        return;
      }
      if (event.key !== "Tab") return;
      const menuLinks = Array.from(mobileNav.querySelectorAll("a"));
      const lastLink = menuLinks[menuLinks.length - 1];
      if (event.shiftKey && document.activeElement === navToggle) {
        event.preventDefault();
        lastLink.focus();
      } else if (!event.shiftKey && document.activeElement === lastLink) {
        event.preventDefault();
        navToggle.focus();
      }
    });
    window.matchMedia("(min-width: 561px)").addEventListener("change", (event) => {
      if (event.matches) setMenuOpen(false);
    });
  }

  /* ---------- nav scrollspy ---------- */
  const navLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"], .mobile-nav a[href^="#"]'));
  const spyTargets = Array.from(
    new Set(
      navLinks
        .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
        .filter(Boolean)
    )
  );
  if (spyTargets.length && "IntersectionObserver" in window) {
    const setActive = (id) => {
      navLinks.forEach((a) =>
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + id)
      );
    };
    const spyOpts = { rootMargin: "-35% 0px -60% 0px", threshold: 0 };
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, spyOpts);
    spyTargets.forEach((t) => spy.observe(t));

    const heroEl = document.querySelector(".hero");
    if (heroEl) {
      const clearSpy = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive("");
        });
      }, spyOpts);
      clearSpy.observe(heroEl);
    }
  }

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

    // Failsafe: never ship blank content near the viewport if the observer
    // misses, while leaving below-fold items to reveal on scroll.
    const revealInView = () => {
      revealEls.forEach((el) => {
        if (el.classList.contains("is-in")) return;
        if (el.getBoundingClientRect().top < window.innerHeight * 1.08) {
          el.classList.add("is-in");
          io.unobserve(el);
        }
      });
    };
    window.setTimeout(revealInView, 1800);
    window.addEventListener("load", () => window.setTimeout(revealInView, 200));
  }

  /* ---------- full-page pointer field (page-space lattice) ---------- */
  const glow = document.getElementById("glow");
  const canvas = document.getElementById("field");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const animateField = !reduceMotion && finePointer && !saveData;
    const COLOR = [95, 233, 170]; // jade, approx of --signal
    const SPACING = 36;
    const DOT = 1.15;
    const INFLUENCE = 170;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    /** Smoothed pointer in document/page space */
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    let lastClientX = -9999;
    let lastClientY = -9999;
    let hasPointer = false;
    let raf = 0;
    let resizeTimer = 0;
    let scrollRedrawTimer = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / SPACING) + 3;
      rows = Math.ceil(h / SPACING) + 3;
    };

    const syncPointerFromClient = () => {
      if (!hasPointer) {
        pointer.tx = -9999;
        pointer.ty = -9999;
        return;
      }
      const sx = window.scrollX || window.pageXOffset || 0;
      const sy = window.scrollY || window.pageYOffset || 0;
      pointer.tx = lastClientX + sx;
      pointer.ty = lastClientY + sy;
      if (glow && finePointer && !reduceMotion) {
        glow.style.setProperty("--mx", (lastClientX / window.innerWidth) * 100 + "%");
        glow.style.setProperty("--my", (lastClientY / window.innerHeight) * 100 + "%");
      }
    };

    /**
     * Lattice is laid out in page space, then projected into the viewport so
     * dots ride with the document on scroll (not a sticky HUD).
     */
    const paint = (t, animated) => {
      const sx = window.scrollX || window.pageXOffset || 0;
      const sy = window.scrollY || window.pageYOffset || 0;

      syncPointerFromClient();
      if (animated) {
        pointer.x += (pointer.tx - pointer.x) * 0.08;
        pointer.y += (pointer.ty - pointer.y) * 0.08;
      } else {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }

      ctx.clearRect(0, 0, w, h);

      const baseCol = Math.floor(sx / SPACING) - 1;
      const baseRow = Math.floor(sy / SPACING) - 1;
      const time = animated ? t * 0.0011 : 0;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const pageX = (baseCol + i) * SPACING;
          const pageY = (baseRow + j) * SPACING;
          const wave = animated
            ? Math.sin(time + (baseCol + i) * 0.35 + (baseRow + j) * 0.22) * 3
            : 0;
          const x = pageX - sx;
          const y = pageY - sy + wave;

          let alpha = 0.06;
          let radius = DOT;

          if (animated && hasPointer) {
            const dist = Math.hypot(pageX - pointer.x, pageY - pointer.y);
            if (dist < INFLUENCE) {
              const f = 1 - dist / INFLUENCE;
              alpha += f * 0.85;
              radius += f * 1.4;
            }
          } else if (!animated) {
            alpha = 0.07;
          }

          ctx.beginPath();
          ctx.fillStyle =
            "rgba(" + COLOR[0] + "," + COLOR[1] + "," + COLOR[2] + "," + alpha.toFixed(3) + ")";
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const draw = (t) => {
      paint(t, true);
      raf = window.requestAnimationFrame(draw);
    };

    const drawStatic = () => {
      paint(0, false);
    };

    const start = () => {
      window.cancelAnimationFrame(raf);
      raf = 0;
      if (!animateField) {
        drawStatic();
      } else if (!document.hidden) {
        raf = window.requestAnimationFrame(draw);
      }
    };

    const onPointerMove = (e) => {
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      hasPointer = true;
      syncPointerFromClient();
    };

    const onPointerLeave = () => {
      hasPointer = false;
      lastClientX = -9999;
      lastClientY = -9999;
      pointer.tx = -9999;
      pointer.ty = -9999;
    };

    if (animateField) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", onPointerLeave);
    } else {
      window.addEventListener(
        "scroll",
        () => {
          window.clearTimeout(scrollRedrawTimer);
          scrollRedrawTimer = window.setTimeout(drawStatic, 16);
        },
        { passive: true }
      );
    }

    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        if (!animateField) drawStatic();
      }, 160);
    });

    document.addEventListener("visibilitychange", () => {
      start();
    });

    resize();
    start();
  }

  /* ---------- mqlt canvas preview ---------- */
  const mqltCanvas = document.getElementById("mqltCanvas");
  if (mqltCanvas && mqltCanvas.getContext) {
    const ctx = mqltCanvas.getContext("2d");
    const animatePreview = !reduceMotion && finePointer && !saveData;
    const baseWidth = 430;
    const baseHeight = 272;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let visible = true;
    let raf = 0;

    const roundedRect = (x, y, w, h, radius) => {
      const r = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const label = (text, x, y, size, color, weight = 500, align = "left", mono = false) => {
      ctx.fillStyle = color;
      ctx.font =
        weight + " " + size + "px " +
        (mono ? '"JetBrains Mono", monospace' : '"Noto Sans SC Subset", sans-serif');
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(text, x, y);
    };

    const draw = (time) => {
      if (!width || !height) return;
      const phase = time * 0.001;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.scale(width / baseWidth, height / baseHeight);

      const background = ctx.createLinearGradient(0, 0, baseWidth, baseHeight);
      background.addColorStop(0, "#101b18");
      background.addColorStop(0.58, "#101412");
      background.addColorStop(1, "#08100d");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, baseWidth, baseHeight);

      ctx.strokeStyle = "rgba(95, 233, 170, 0.055)";
      ctx.lineWidth = 1;
      for (let x = 18; x < baseWidth; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 32);
        ctx.lineTo(x, baseHeight);
        ctx.stroke();
      }
      for (let y = 48; y < baseHeight; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(baseWidth, y);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255,255,255,0.035)";
      ctx.fillRect(0, 0, baseWidth, 32);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.moveTo(0, 31.5);
      ctx.lineTo(baseWidth, 31.5);
      ctx.stroke();
      ["#ff6b6b", "#ffd166", "#5fe9aa"].forEach((color, index) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.72;
        ctx.arc(15 + index * 12, 16, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      label("0nyx.cn/mqlt / console", 58, 20, 7.5, "rgba(255,255,255,0.46)", 400, "left", true);

      label("研学运营总览", 20, 56, 13, "#f2f5f3", 700);
      ctx.beginPath();
      ctx.fillStyle = "#5fe9aa";
      ctx.arc(362, 52, 3 + Math.sin(phase * 2.2) * 0.7, 0, Math.PI * 2);
      ctx.fill();
      label("LIVE", 372, 55, 7.5, "#5fe9aa", 500, "left", true);

      const metrics = [
        ["研学项目", "24", "+3"],
        ["本月预约", "1,286", "+18%"],
        ["成果档案", "846", "+12%"]
      ];
      metrics.forEach((metric, index) => {
        const x = 20 + index * 134;
        roundedRect(x, 68, 122, 48, 8);
        ctx.fillStyle = "rgba(255,255,255,0.035)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.stroke();
        label(metric[0], x + 10, 83, 7.5, "rgba(255,255,255,0.46)", 500);
        label(metric[1], x + 10, 105, 15, "#f2f5f3", 700, "left", true);
        label(metric[2], x + 112, 104, 7, "#5fe9aa", 500, "right", true);
      });

      roundedRect(20, 128, 252, 124, 9);
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.stroke();
      label("预约趋势", 32, 146, 8, "rgba(255,255,255,0.6)", 600);
      label("近 7 日", 258, 146, 6.8, "rgba(255,255,255,0.35)", 400, "right");

      const values = [0.38, 0.58, 0.46, 0.72, 0.62, 0.86, 0.78];
      values.forEach((value, index) => {
        const x = 34 + index * 31;
        const pulse = animatePreview ? Math.sin(phase * 1.6 + index * 0.55) * 0.025 : 0;
        const barHeight = (value + pulse) * 72;
        const gradient = ctx.createLinearGradient(0, 235 - barHeight, 0, 235);
        gradient.addColorStop(0, "rgba(95,233,170,0.9)");
        gradient.addColorStop(1, "rgba(95,233,170,0.18)");
        roundedRect(x, 235 - barHeight, 18, barHeight, 4);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      roundedRect(284, 128, 126, 124, 9);
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.stroke();
      label("实时动态", 296, 146, 8, "rgba(255,255,255,0.6)", 600);

      const activity = [
        ["企业研学", "已签到"],
        ["成果提交", "待审核"],
        ["积分兑换", "已完成"]
      ];
      activity.forEach((item, index) => {
        const y = 166 + index * 27;
        ctx.beginPath();
        ctx.fillStyle = index === 1 ? "#ffd166" : "#5fe9aa";
        ctx.arc(300, y, 3, 0, Math.PI * 2);
        ctx.fill();
        label(item[0], 310, y + 3, 7.2, "rgba(255,255,255,0.72)", 500);
        label(item[1], 398, y + 3, 6.5, "rgba(255,255,255,0.34)", 400, "right");
        if (index < activity.length - 1) {
          ctx.strokeStyle = "rgba(255,255,255,0.055)";
          ctx.beginPath();
          ctx.moveTo(296, y + 13);
          ctx.lineTo(398, y + 13);
          ctx.stroke();
        }
      });

      ctx.restore();
    };

    const resize = () => {
      const rect = mqltCanvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      mqltCanvas.width = Math.floor(width * dpr);
      mqltCanvas.height = Math.floor(height * dpr);
      draw(performance.now());
    };

    const frame = (time) => {
      draw(time);
      raf = window.requestAnimationFrame(frame);
    };

    const start = () => {
      window.cancelAnimationFrame(raf);
      if (animatePreview && visible && !document.hidden) {
        raf = window.requestAnimationFrame(frame);
      } else {
        draw(1000);
      }
    };

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        resize();
        start();
      }).observe(mqltCanvas);
    } else {
      window.addEventListener("resize", () => {
        resize();
        start();
      });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        start();
      }).observe(mqltCanvas);
    }

    document.addEventListener("visibilitychange", start);
    document.fonts.ready.then(() => {
      resize();
      start();
    });
    resize();
    start();
  }

  /* ---------- equamotion canvas preview (projectile simulation) ---------- */
  const eqCanvas = document.getElementById("eqCanvas");
  if (eqCanvas && eqCanvas.getContext) {
    const ctx = eqCanvas.getContext("2d");
    const animateEq = !reduceMotion && !saveData;
    const baseWidth = 430;
    const baseHeight = 272;
    const PERIOD = 4200; // ms per throw
    let width = 0;
    let height = 0;
    let dpr = 1;
    let visible = true;
    let raf = 0;

    // Trajectory in base coordinates: launch at (46, 226), apex y depends on vy.
    const X0 = 46;
    const Y0 = 226;
    const RANGE = 340;
    const APEX = 150;
    const posAt = (u) => {
      // u in [0,1]; x linear, y parabolic (vertex at u=0.5)
      const x = X0 + RANGE * u;
      const y = Y0 - APEX * (1 - Math.pow(2 * u - 1, 2));
      return [x, y];
    };
    const velAt = (u) => {
      const vx = RANGE / 1; // du-based, scaled later
      const vy = APEX * 8 * (0.5 - u);
      return [vx, vy];
    };

    const label = (text, x, y, size, color, align = "left") => {
      ctx.fillStyle = color;
      ctx.font = "500 " + size + 'px "JetBrains Mono", monospace';
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(text, x, y);
    };

    const draw = (time) => {
      if (!width || !height) return;
      const u = animateEq ? (time % PERIOD) / PERIOD : 0.62;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.scale(width / baseWidth, height / baseHeight);

      const background = ctx.createLinearGradient(0, 0, baseWidth, baseHeight);
      background.addColorStop(0, "#0f1815");
      background.addColorStop(1, "#0a0f0d");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, baseWidth, baseHeight);

      // window bar
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      ctx.fillRect(0, 0, baseWidth, 30);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.moveTo(0, 29.5);
      ctx.lineTo(baseWidth, 29.5);
      ctx.stroke();
      ["#ff6b6b", "#ffd166", "#5fe9aa"].forEach((color, index) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.72;
        ctx.arc(15 + index * 12, 15, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      label("equamotion / projectile.sim", 58, 19, 7.5, "rgba(255,255,255,0.46)");

      // axes
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X0 - 14, 48);
      ctx.lineTo(X0 - 14, Y0 + 14);
      ctx.lineTo(X0 + RANGE + 26, Y0 + 14);
      ctx.stroke();
      // grid
      ctx.strokeStyle = "rgba(95, 233, 170, 0.05)";
      for (let x = X0 + 26; x < X0 + RANGE + 26; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 48);
        ctx.lineTo(x, Y0 + 14);
        ctx.stroke();
      }
      for (let y = Y0 - 26; y > 48; y -= 40) {
        ctx.beginPath();
        ctx.moveTo(X0 - 14, y);
        ctx.lineTo(X0 + RANGE + 26, y);
        ctx.stroke();
      }

      // trajectory (dashed)
      ctx.strokeStyle = "rgba(95, 233, 170, 0.35)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const [px, py] = posAt(i / 60);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // apex event marker
      const [ax, ay] = posAt(0.5);
      ctx.strokeStyle = "rgba(255, 209, 102, 0.5)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(ax, ay - 4);
      ctx.lineTo(ax, 56);
      ctx.stroke();
      ctx.setLineDash([]);
      label("v_y = 0", ax, 50, 7.5, "#ffd166", "center");

      // trail
      for (let i = 1; i <= 7; i++) {
        const tu = u - i * 0.028;
        if (tu <= 0) break;
        const [tx, ty] = posAt(tu);
        ctx.beginPath();
        ctx.fillStyle = "rgba(95, 233, 170, " + (0.34 - i * 0.04).toFixed(2) + ")";
        ctx.arc(tx, ty, Math.max(1.2, 4.4 - i * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }

      // ball
      const [bx, by] = posAt(u);
      ctx.beginPath();
      ctx.fillStyle = "#5fe9aa";
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = "rgba(95, 233, 170, 0.35)";
      ctx.arc(bx, by, 10, 0, Math.PI * 2);
      ctx.stroke();

      // velocity vector
      const [, vy] = velAt(u);
      const vxDraw = 34;
      const vyDraw = vy * 0.32;
      ctx.strokeStyle = "#7fb5ff";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + vxDraw, by - vyDraw);
      ctx.stroke();
      const angle = Math.atan2(-vyDraw, vxDraw);
      ctx.beginPath();
      ctx.fillStyle = "#7fb5ff";
      ctx.moveTo(bx + vxDraw, by - vyDraw);
      ctx.lineTo(bx + vxDraw - 7 * Math.cos(angle - 0.42), by - vyDraw + 7 * Math.sin(angle - 0.42));
      ctx.lineTo(bx + vxDraw - 7 * Math.cos(angle + 0.42), by - vyDraw + 7 * Math.sin(angle + 0.42));
      ctx.closePath();
      ctx.fill();
      label("v", bx + vxDraw + 8, by - vyDraw + 3, 8, "#7fb5ff");

      // formula panel
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.strokeStyle = "rgba(255,255,255,0.09)";
      const fx = baseWidth - 190;
      const fy = 42;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(fx, fy, 168, 54, 8);
      else ctx.rect(fx, fy, 168, 54);
      ctx.fill();
      ctx.stroke();
      label("y = v0·sinθ·t - ½gt²", fx + 12, fy + 22, 8.4, "rgba(242,245,243,0.9)");
      label("t = " + (u * 3.2).toFixed(2) + " s", fx + 12, fy + 40, 8, "rgba(95,233,170,0.85)");

      ctx.restore();
    };

    const resize = () => {
      const rect = eqCanvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      eqCanvas.width = Math.floor(width * dpr);
      eqCanvas.height = Math.floor(height * dpr);
      draw(performance.now());
    };

    const frame = (time) => {
      draw(time);
      raf = window.requestAnimationFrame(frame);
    };

    const start = () => {
      window.cancelAnimationFrame(raf);
      if (animateEq && visible && !document.hidden) {
        raf = window.requestAnimationFrame(frame);
      } else {
        draw(1000);
      }
    };

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        resize();
        start();
      }).observe(eqCanvas);
    } else {
      window.addEventListener("resize", () => {
        resize();
        start();
      });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        start();
      }).observe(eqCanvas);
    }

    document.addEventListener("visibilitychange", start);
    document.fonts.ready.then(() => {
      resize();
      start();
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

  const copyText = async (value, okMsg, trigger) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(okMsg);
      if (trigger) {
        const originalLabel = trigger.textContent;
        trigger.textContent = "已复制";
        trigger.classList.add("is-copied");
        window.setTimeout(() => {
          trigger.textContent = originalLabel;
          trigger.classList.remove("is-copied");
        }, 1800);
      }
    } catch (err) {
      showToast("复制失败，请手动复制");
    }
  };

  const copyBtn = document.getElementById("copyEmail");
  if (copyBtn) {
    copyBtn.addEventListener("click", () =>
      copyText(copyBtn.getAttribute("data-email") || "", "邮箱已复制", copyBtn)
    );
  }

  const copyWechat = document.getElementById("copyWechat");
  if (copyWechat) {
    copyWechat.addEventListener("click", () =>
      copyText(copyWechat.getAttribute("data-wechat") || "", "微信号已复制")
    );
  }

  /* ---------- work gallery (album carousel) ---------- */
  const gallery = document.getElementById("workGallery");
  if (gallery) {
    const viewport = document.getElementById("galleryViewport");
    const slides = Array.from(viewport.querySelectorAll(".gallery__slide"));
    const prevBtn = document.getElementById("galleryPrev");
    const nextBtn = document.getElementById("galleryNext");
    const dotsWrap = document.getElementById("galleryDots");
    let active = 0;

    const goTo = (i) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, i));
      viewport.scrollTo({
        left: slides[clamped].offsetLeft - slides[0].offsetLeft,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    };

    const dots = slides.map((slide, i) => {
      const dot = document.createElement("button");
      dot.className = "gallery__dot";
      dot.type = "button";
      dot.setAttribute("aria-label", "第 " + (i + 1) + " 页，共 " + slides.length + " 页");
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    const update = () => {
      const pos = viewport.scrollLeft;
      let nearest = 0;
      let bestDist = Infinity;
      slides.forEach((slide, i) => {
        const dist = Math.abs(slide.offsetLeft - slides[0].offsetLeft - pos);
        if (dist < bestDist) {
          bestDist = dist;
          nearest = i;
        }
      });
      active = nearest;
      dots.forEach((dot, i) => {
        dot.classList.toggle("is-active", i === active);
        if (i === active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      prevBtn.disabled = active === 0;
      nextBtn.disabled = active === slides.length - 1;
    };

    let scrollRaf = 0;
    viewport.addEventListener(
      "scroll",
      () => {
        window.cancelAnimationFrame(scrollRaf);
        scrollRaf = window.requestAnimationFrame(update);
      },
      { passive: true }
    );

    prevBtn.addEventListener("click", () => goTo(active - 1));
    nextBtn.addEventListener("click", () => goTo(active + 1));
    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(active - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(active + 1);
      }
    });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- interactive hero terminal ---------- */
  const term = document.getElementById("term");
  const termBody = document.getElementById("termBody");
  const termOut = document.getElementById("termOut");
  const termCaretLine = document.getElementById("termCaretLine");
  if (term && termBody && termOut && termCaretLine) {
    const MAX_LINES = 300;
    const SITES = {
      github: "https://github.com/0nyx06",
      listene: "https://github.com/0nyx06/listene",
      mqlt: "https://0nyx.cn/mqlt/",
      meow: "/meow/",
    };
    const history = [];
    let histIdx = -1;
    let draft = "";
    let input = null;
    let activated = false;

    const scrollDown = () => {
      termBody.scrollTop = termBody.scrollHeight;
    };

    const trimLines = () => {
      while (termOut.children.length > MAX_LINES) termOut.firstElementChild.remove();
    };

    const makeLine = (cls) => {
      const p = document.createElement("p");
      p.className = "term__line term__line--wrap" + (cls ? " " + cls : "");
      return p;
    };

    // print("text") | print(["text", "term__line--out"]) | print(node)
    const print = (content, cls) => {
      const p = makeLine(cls);
      if (content instanceof Node) p.appendChild(content);
      else p.textContent = content;
      termOut.appendChild(p);
      trimLines();
      scrollDown();
      return p;
    };
    const out = (text) => print(text, "term__line--out");
    const err = (text) => print(text, "term__line--err");

    const printEcho = (cmdText) => {
      const p = makeLine();
      const prompt = document.createElement("span");
      prompt.className = "term__prompt";
      prompt.textContent = "$";
      p.appendChild(prompt);
      p.appendChild(document.createTextNode(" " + cmdText));
      termOut.appendChild(p);
      trimLines();
      scrollDown();
    };

    const printLink = (label, url) => {
      const p = makeLine("term__line--out");
      p.appendChild(document.createTextNode(label));
      const a = document.createElement("a");
      a.className = "term__link";
      a.href = url;
      if (!url.startsWith("/")) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      a.textContent = url;
      p.appendChild(a);
      termOut.appendChild(p);
      trimLines();
      scrollDown();
    };

    const commands = {
      help: {
        desc: "查看可用命令",
        run() {
          out("可用命令：");
          [
            ["help", "查看可用命令"],
            ["about", "关于我"],
            ["skills", "技术栈"],
            ["projects", "在做的东西"],
            ["status", "服务状态"],
            ["contact", "联系方式"],
            ["open <site>", "打开站点（open 查看列表）"],
            ["meow", "一只像素小猫"],
            ["clear", "清屏（Ctrl+L）"],
          ].forEach(([name, desc]) => out("  " + name.padEnd(14, " ") + desc));
          out("还有一些经典命令也能用：ls / cat / echo / pwd / date …");
          out("Tab 补全 · ↑↓ 历史");
        },
      },
      whoami: {
        desc: "我是谁",
        run() {
          out("0Nyx · full-stack developer");
        },
      },
      about: {
        desc: "关于我",
        run() {
          out("我是 0Nyx，一名独立全栈开发者。");
          out("习惯一个人把产品从想法做到上线：设计后端与数据库、");
          out("写 Android / 小程序 / Web 客户端、接入 AI 能力，再自己部署运维。");
          out("做能跑起来、也经得起细看的东西。");
        },
      },
      skills: {
        desc: "技术栈",
        run() {
          out("移动端    Kotlin · Jetpack Compose · Material 3 · UniApp X · 微信小程序");
          out("后端      NestJS · Node.js · TypeScript · Fastify · Prisma · PostgreSQL · Redis");
          out("前端      Vue 3 · Vite · HTML / CSS · Canvas");
          out("AI        LLM 集成 · TTS / ASR · Agent 编排");
          out("部署      Git · Docker · Nginx · PM2");
        },
      },
      projects: {
        desc: "在做的东西",
        run() {
          printLink("ListenE       Android AI Agent 英语听力应用 → ", "https://github.com/0nyx06/listene");
          printLink("蒙企链探      产业研学服务平台 → ", "https://0nyx.cn/mqlt/");
          out("方程剧场      鸿蒙 AI 理化仿真 App（HarmonyOS · ArkTS · 开发中）");
          printLink("更多项目      ", "https://github.com/0nyx06");
          out("（彩蛋藏在头像里，试试 meow）");
        },
      },
      status: {
        desc: "服务状态",
        run() {
          const p = makeLine("term__line--out");
          const ok = document.createElement("span");
          ok.className = "term__ok";
          ok.textContent = "●";
          p.appendChild(ok);
          p.appendChild(document.createTextNode(" 2 services online · shipping"));
          termOut.appendChild(p);
          scrollDown();
        },
      },
      contact: {
        desc: "联系方式",
        run() {
          out("email   gaoxingyu2006@icloud.com");
          out("wechat  ITGao06");
          printLink("github  ", "https://github.com/0nyx06");
          out("合作、招聘、或者只是想聊聊技术，都欢迎。");
        },
      },
      open: {
        desc: "打开站点",
        run(args) {
          const target = (args[0] || "").toLowerCase().replace(/\/$/, "");
          if (!target) {
            out("用法：open <site>");
            out("可用站点：" + Object.keys(SITES).join(" · "));
            return;
          }
          if (!SITES[target]) {
            err("open: 不认识 “" + target + "”，可用：" + Object.keys(SITES).join(" · "));
            return;
          }
          printLink("正在打开 ", SITES[target]);
          window.open(SITES[target], "_blank", "noopener");
        },
      },
      meow: {
        desc: "像素小猫",
        run() {
          out("  /\\_/\\");
          out(" ( o.o )  喵～");
          out("  > ^ <");
          printLink("完整版在这里 → ", "/meow/");
        },
      },
      clear: {
        desc: "清屏",
        run() {
          termOut.textContent = "";
        },
      },
      ls: {
        desc: "列目录",
        run(args) {
          const dir = (args[0] || "").replace(/\/$/, "");
          if (!dir || dir === ".") out("skills/  projects/  about.txt  contact.txt");
          else if (dir === "skills") out("android/  web/  backend/  ai/");
          else if (dir === "projects") out("listene/  mqlt/");
          else err("ls: 无法访问 '" + dir + "': 没有那个文件或目录");
        },
      },
      cat: {
        desc: "查看文件",
        run(args) {
          const file = args[0] || "";
          if (file === "about.txt") commands.about.run([]);
          else if (file === "contact.txt") commands.contact.run([]);
          else if (!file) err("cat: 缺少文件名，试试 cat about.txt");
          else err("cat: " + file + ": 没有那个文件或目录");
        },
      },
      echo: {
        desc: "回显",
        run(args, raw) {
          out(raw.length ? raw : "");
        },
      },
      pwd: {
        desc: "当前目录",
        run() {
          out("/home/0nyx");
        },
      },
      date: {
        desc: "当前时间",
        run() {
          out(new Date().toString());
        },
      },
      uname: {
        desc: "系统信息",
        run(args) {
          out(args[0] === "-a" ? "0Nyx-Cloud 1.0.0 static-nginx x86_64 · uptime: 一直在线" : "0Nyx-Cloud");
        },
      },
      history: {
        desc: "命令历史",
        run() {
          history.forEach((cmd, i) => out(String(i + 1).padStart(3, " ") + "  " + cmd));
        },
      },
    };
    const aliases = {
      work: "projects",
      hi: "about",
      hello: "about",
    };

    const respond = (raw) => {
      const parts = raw.split(/\s+/);
      let name = parts[0].toLowerCase();
      if (aliases[name]) name = aliases[name];
      const args = parts.slice(1);

      if (name === "sudo") {
        err("sudo: 权限不足。这里只有一个 root，而你正在看他的主页 :)");
        return;
      }
      if (name === "rm") {
        err("rm: 只读文件系统。想得美 :)");
        return;
      }
      if (name === "cd") {
        out("这是个静态站，哪儿也去不了。试试 open <site>。");
        return;
      }
      if (name === "exit" || name === "logout") {
        out("你可以关掉标签页，但为什么要走呢 :)");
        return;
      }
      if (name === "vim" || name === "vi" || name === "nano" || name === "emacs") {
        out(name + ": 在别人的终端里写代码可不礼貌 :)");
        return;
      }
      if (commands[name]) {
        commands[name].run(args, raw.slice(parts[0].length).trim());
        return;
      }
      err("zsh: command not found: " + name);
      out("输入 help 查看可用命令");
    };

    const completions = () => Object.keys(commands).concat(["sudo", "cd", "exit", "work"]);

    const onKeydown = (event) => {
      if (event.key === "ArrowUp") {
        if (!history.length) return;
        event.preventDefault();
        if (histIdx === -1) {
          draft = input.value;
          histIdx = history.length - 1;
        } else if (histIdx > 0) {
          histIdx -= 1;
        }
        input.value = history[histIdx];
        window.requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
        return;
      }
      if (event.key === "ArrowDown") {
        if (histIdx === -1) return;
        event.preventDefault();
        if (histIdx < history.length - 1) {
          histIdx += 1;
          input.value = history[histIdx];
        } else {
          histIdx = -1;
          input.value = draft;
        }
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        const value = input.value;
        if (!value) return;
        if (/^open\s+\S*$/i.test(value)) {
          const prefix = value.replace(/^open\s+/i, "").toLowerCase();
          const hits = Object.keys(SITES).filter((site) => site.startsWith(prefix));
          if (hits.length === 1) input.value = "open " + hits[0];
          else if (hits.length > 1) out(hits.join("  "));
          return;
        }
        if (!value.includes(" ")) {
          const hits = completions().filter((c) => c.startsWith(value.toLowerCase()));
          if (hits.length === 1) input.value = hits[0] + " ";
          else if (hits.length > 1) out(hits.join("  "));
        }
        return;
      }
      if (event.key === "l" && event.ctrlKey) {
        event.preventDefault();
        commands.clear.run([]);
        return;
      }
      if (event.key === "c" && event.ctrlKey && !window.getSelection().toString()) {
        event.preventDefault();
        printEcho(input.value + "^C");
        input.value = "";
        histIdx = -1;
        return;
      }
    };

    const activate = () => {
      if (activated) return;
      activated = true;

      const form = document.createElement("form");
      form.className = "term__form";
      form.autocomplete = "off";
      const label = document.createElement("label");
      label.className = "term__prompt";
      label.htmlFor = "termInput";
      label.textContent = "$";
      input = document.createElement("input");
      input.id = "termInput";
      input.className = "term__input";
      input.type = "text";
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("spellcheck", "false");
      input.setAttribute("enterkeyhint", "send");
      input.setAttribute("aria-label", "终端命令输入，输入 help 查看命令，Tab 补全，上下方向键翻历史");
      form.appendChild(label);
      form.appendChild(input);
      termCaretLine.replaceWith(form);

      out("tip: 输入 help 查看命令");

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const raw = input.value.trim();
        printEcho(input.value);
        input.value = "";
        histIdx = -1;
        draft = "";
        if (!raw) return;
        if (history[history.length - 1] !== raw) history.push(raw);
        if (history.length > 100) history.shift();
        respond(raw);
      });
      input.addEventListener("keydown", onKeydown);
    };

    // Activate once the boot animation has played (or immediately without motion).
    if (reduceMotion) {
      window.setTimeout(activate, 400);
    } else {
      termBody.addEventListener("animationend", (event) => {
        if (event.target === termCaretLine) activate();
      });
      window.setTimeout(activate, 4200); // fallback if the reveal never fires
    }

    // Click-to-focus without breaking text selection.
    termBody.addEventListener("click", () => {
      activate();
      if (input && !window.getSelection().toString()) {
        input.focus({ preventScroll: true });
      }
    });
  }
})();

/*
 * Drawings — shlif-inserts / a-close
 * Geometry for our own SVG technical drawings (traced from media/source photos).
 * No motion here: these functions draw a *state*. motion.js tweens states; without motion
 * (reduced motion, mobile cards) the same functions draw the final states once.
 */
(function () {
  const SVGNS = "http://www.w3.org/2000/svg";
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (y, a, b) => { const t = clamp((y - a) / (b - a)); return t * t * (3 - 2 * t); };
  const part = (name, root) => root.querySelector(`[data-part="${name}"]`);

  /* ── Coil (the insert), drawn as a section: wire cross-sections + front/back strands ── */
  // width(y) returns the outer half-width at height y, so the coil can be narrow in one place and wide in another.
  function coilPaths({ cx, top, turns, pitch, width }) {
    let front = "", back = "", wire = "", d = 2.6;
    for (let i = 0; i < turns; i++) {
      const yl = top + i * pitch, yr = yl + pitch / 2, yn = yl + pitch;
      const xl = cx - width(yl), xr = cx + width(yr);
      front += `M${xl} ${yl}L${xr} ${yr}`;
      if (i < turns - 1) back += `M${xr} ${yr}L${cx - width(yn)} ${yn}`;
      wire += `M${xl - d} ${yl}l${d} ${-d}l${d} ${d}l${-d} ${d}zM${xr - d} ${yr}l${d} ${-d}l${d} ${d}l${-d} ${d}z`;
    }
    const yb = top + turns * pitch - pitch / 2;
    const tang = `M${cx - width(yb) + 2} ${yb}H${cx + width(yb) - 2}`;
    return { front, back, wire, tang };
  }
  function drawCoil(g, opts) {
    const p = coilPaths(opts);
    for (const k of ["front", "back", "wire", "tang"]) g.querySelector(`.coil-${k}`).setAttribute("d", p[k]);
  }
  function coilGroup() {
    const g = document.createElementNS(SVGNS, "g");
    g.innerHTML = '<path class="coil-back"/><path class="coil-front"/><path class="coil-wire"/><path class="coil-tang"/>';
    return g;
  }

  /* ── Elevation (hero, anatomy, two-in-one): coil seen through the nest window ── */
  function elevationCoil(svg) {
    const g = part("coil", svg);
    if (!g) return;
    let front = "", back = "";
    for (let i = 0; i < 10; i++) {
      const x = 180 + i * 11;
      front += `M${x} 122L${x + 5.5} 158`;
      back += `M${x + 5.5} 158L${x + 11} 122`;
    }
    g.innerHTML = `<path class="coil-back" d="${back}"/><path class="coil-front" d="${front}"/>`;
  }

  // Knurling as fine parallel hairlines (data-knurl="x0 x1 y0 y1"), no crosshatch.
  function knurl(svg) {
    svg.querySelectorAll("[data-knurl]").forEach((el) => {
      const [x0, x1, y0, y1] = el.dataset.knurl.split(" ").map(Number);
      const slant = 9;
      let d = "";
      for (let x = x0; x + slant <= x1; x += 3) d += `M${x} ${y0}L${x + slant} ${y1}`;
      el.setAttribute("d", d);
    });
  }

  // Clone the hero's elevation into another slot (anatomy, two-in-one) with its own viewBox.
  function cloneElevation(target, viewBox) {
    const src = document.querySelector("[data-elevation-source]");
    if (!src || !target) return null;
    const svg = src.cloneNode(true);
    svg.removeAttribute("data-elevation-source");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("aria-hidden", "true");
    svg.removeAttribute("role");
    svg.removeAttribute("aria-label");
    target.prepend(svg);
    return svg;
  }

  /* ── Cutaway "Восемь движений": world coordinates in a 400 × 1010 viewBox ── */
  const CUT = { cx: 200, partTop: 668, bushing: [590, 660], turns: 7, pitch: 10, free: 21, squeezed: 15, hole: 17 };

  // One state per moment of the procedure. rod = rod end (tool coords), tool = tool offset,
  // coilTop = first turn (world), part = part offset below its working position, turn = crank turns.
  // vb = what the camera frames on the desktop stage [x y w h]; vbc = the closer frame for phones and cards.
  // Steps 4–7 zoom onto the bushing and the part so the coil's 21 → 15 → 17 change is big on screen.
  const STATES = [
    { rod: 600, tool: 0, coilOn: 0, coilX: 140, coilTop: 500, part: 220, partOn: 0, turn: 0, guide: 0, vb: [0, -160, 400, 1020], vbc: [60, 300, 280, 420] }, // start
    { rod: 455, tool: 0, coilOn: 0, coilX: 140, coilTop: 500, part: 220, partOn: 0, turn: 0, guide: 0, vb: [0, -160, 400, 1020], vbc: [60, 300, 280, 420] }, // 1 rod back
    { rod: 455, tool: 0, coilOn: 1, coilX: 0, coilTop: 500, part: 220, partOn: 0, turn: 0, guide: 0, vb: [70, 380, 260, 340], vbc: [90, 420, 220, 300] }, // 2 insert in nest
    { rod: 580, tool: 0, coilOn: 1, coilX: 0, coilTop: 500, part: 220, partOn: 0, turn: 0.5, guide: 0, vb: [70, 380, 260, 340], vbc: [90, 420, 220, 300] }, // 3 slot takes tang
    { rod: 680, tool: 0, coilOn: 1, coilX: 0, coilTop: 590, part: 220, partOn: 0, turn: 3.5, guide: 0, vb: [123, 500, 154, 200], vbc: [110, 500, 180, 200] }, // 4 screwed in, squeezed
    { rod: 680, tool: 0, coilOn: 1, coilX: 0, coilTop: 590, part: 0, partOn: 1, turn: 3.5, guide: 0, vb: [123, 530, 154, 200], vbc: [110, 530, 180, 200] }, // 5 tip in the hole
    { rod: 680, tool: 8, coilOn: 1, coilX: 0, coilTop: 598, part: 0, partOn: 1, turn: 3.5, guide: 1, vb: [123, 540, 154, 200], vbc: [110, 540, 180, 200] }, // 6 face pressed flat
    { rod: 744, tool: 8, coilOn: 1, coilX: 0, coilTop: 672, part: 0, partOn: 1, turn: 6.5, guide: 1, vb: [123, 560, 154, 200], vbc: [110, 560, 180, 200] }, // 7 into the part
    { rod: 744, tool: -190, coilOn: 1, coilX: 0, coilTop: 672, part: 0, partOn: 1, turn: 6.5, guide: 0, vb: [70, 380, 260, 440], vbc: [80, 380, 240, 440] }, // 8 tool lifts away
  ];
  // A state with its camera spelled out as numbers (vx vy vw vh), so GSAP can tween it like the rest.
  function withView(s, key = "vb") {
    const [vx, vy, vw, vh] = s[key];
    const { vb, vbc, ...rest } = s;
    return { ...rest, vx, vy, vw, vh };
  }

  function cutawayWidth(s) {
    const [b0, b1] = CUT.bushing;
    const top = CUT.partTop + s.part;
    return (y) => {
      const inBushing = smooth(y, b0 + s.tool - 6, b0 + s.tool + 2) * (1 - smooth(y, b1 + s.tool - 2, b1 + s.tool + 6));
      const inPart = s.partOn > 0.5 ? smooth(y, top - 4, top + 2) : 0;
      return lerp(lerp(CUT.free, CUT.squeezed, inBushing), CUT.hole, inPart);
    };
  }

  function renderCutaway(svg, s) {
    if (s.vw) svg.setAttribute("viewBox", `${s.vx} ${s.vy} ${s.vw} ${s.vh}`);
    part("tool", svg).setAttribute("transform", `translate(0 ${s.tool})`);
    part("rod", svg).setAttribute("transform", `translate(0 ${s.rod - 600})`);
    const c = Math.cos(s.turn * Math.PI * 2); // crank seen from the side: the arm shortens as it turns
    part("crank-arm", svg).setAttribute("d", `M200 40H${200 + 92 * c}V47H200Z`);
    part("crank-grip", svg).setAttribute("x", 200 + 92 * c - 6);
    const coil = part("coil", svg);
    coil.setAttribute("transform", `translate(${s.coilX} 0)`);
    coil.style.opacity = s.coilOn;
    drawCoil(coil, { cx: CUT.cx, top: s.coilTop, turns: CUT.turns, pitch: CUT.pitch, width: cutawayWidth(s) });
    const p = part("part", svg);
    p.setAttribute("transform", `translate(0 ${s.part})`);
    p.style.opacity = s.partOn;
    const guide = part("guide", svg);
    guide.style.opacity = s.guide;
    guide.querySelector("[data-part='guide-arc']").style.strokeDashoffset = 1 - s.guide;
  }

  // Threaded hole walls and bushing bore teeth are drawn once.
  function threadEdge(x, y0, y1, dir, step = 6, depth = 3) {
    let d = `M${x} ${y0}`;
    for (let y = y0; y < y1; y += step) d += `L${x + dir * depth} ${y + step / 2}L${x} ${y + step}`;
    return d;
  }
  function prepareCutaway(svg) {
    const top = CUT.partTop, h = 150, l = CUT.cx - CUT.hole, r = CUT.cx + CUT.hole;
    part("part-left", svg).setAttribute("d", `M40 ${top}H${l}` + threadEdge(l, top, top + h, -1).replace(/^M[^L]*/, "") + `L${l} ${top + h}H40Z`);
    part("part-right", svg).setAttribute("d", `M360 ${top}H${r}` + threadEdge(r, top, top + h, 1).replace(/^M[^L]*/, "") + `L${r} ${top + h}H360Z`);
    const [b0, b1] = CUT.bushing, bl = CUT.cx - CUT.squeezed, br = CUT.cx + CUT.squeezed;
    part("bore", svg).setAttribute("d", threadEdge(bl, b0, b1, -1, 5, 2.5) + threadEdge(br, b0, b1, 1, 5, 2.5));
    coilPartsInto(part("coil", svg));
  }
  function coilPartsInto(g) {
    if (!g.querySelector(".coil-front")) g.append(...coilGroup().childNodes);
  }

  function mountCutaway(target) {
    const tpl = document.getElementById("tpl-cutaway");
    if (!tpl || !target) return null;
    const svg = tpl.content.firstElementChild.cloneNode(true);
    target.prepend(svg);
    prepareCutaway(svg);
    return svg;
  }

  /* ── "Сначала сжать": free coil above the hole vs squeezed coil in the bushing ── */
  function renderCompress(root, t) {
    const squeezed = part("coil-squeezed", root);
    if (squeezed) drawCoil(squeezed, { cx: 200, top: 150, turns: 7, pitch: 10, width: () => lerp(CUT.free, CUT.squeezed, t) });
    root.querySelectorAll("[data-part='press']").forEach((a) => a.setAttribute("transform", `translate(${(1 - t) * Number(a.dataset.dir) * -22} 0)`));
  }
  // Static pieces: threaded hole walls (data-hole) and coils in a fixed state (data-coil-static="top turns width").
  function prepareStatic(root = document) {
    root.querySelectorAll("[data-hole]").forEach((el) => {
      const top = Number(el.dataset.top), bottom = Number(el.dataset.bottom);
      const left = el.dataset.hole === "left", x = left ? CUT.cx - CUT.hole : CUT.cx + CUT.hole, outer = left ? 40 : 360;
      el.setAttribute("d", `M${outer} ${top}H${x}` + threadEdge(x, top, bottom, left ? -1 : 1).replace(/^M[^L]*/, "") + `L${x} ${bottom}H${outer}Z`);
    });
    root.querySelectorAll("[data-coil-static]").forEach((g) => {
      const [top, turns, w] = g.dataset.coilStatic.split(" ").map(Number);
      coilPartsInto(g);
      drawCoil(g, { cx: CUT.cx, top, turns, pitch: 10, width: () => w });
    });
    root.querySelectorAll("[data-part='coil-squeezed']").forEach((g) => coilPartsInto(g));
  }

  // The pinned stage is built from the step cards, so the copy lives in one place (the cards).
  function buildStage() {
    const stage = document.querySelector("[data-stage]");
    if (!stage) return null;
    const cards = [...document.querySelectorAll(".step-card")];
    const texts = stage.querySelector("[data-stage-texts]"), photos = stage.querySelector("[data-stage-photos]"), nav = stage.querySelector("[data-stage-nav]");
    cards.forEach((card, i) => {
      const t = document.createElement("article");
      t.className = "stage__t";
      t.innerHTML = `<p class="stage__group">${card.dataset.group}</p><p class="stage__num tabular">${i + 1}<span>из ${cards.length}</span></p>` +
        `<h3 class="t-h3">${card.querySelector("h4").textContent}</h3><p>${card.querySelector("p:last-child").textContent}</p>`;
      texts.append(t);
      const ph = document.createElement("figure");
      ph.className = "stage__ph";
      const media = card.querySelector(".step-card__media");
      if (media) ph.append(media.cloneNode(true));
      photos.append(ph);
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = i + 1;
      b.setAttribute("aria-label", `Шаг ${i + 1}: ${card.querySelector("h4").textContent}`);
      nav.append(b);
    });
    const svg = mountCutaway(stage.querySelector("[data-stage-drawing]"));
    renderCutaway(svg, withView(STATES[0]));
    return { svg, drawing: stage.querySelector("[data-stage-drawing]"), texts: [...texts.children], photos: [...photos.children], buttons: [...nav.children] };
  }

  // Shows step n (0-based) in the stage: text, photo and the current button.
  function setStageStep(stage, n) {
    if (!stage || stage.current === n) return;
    stage.current = n;
    stage.texts.forEach((el, i) => el.classList.toggle("is-active", i === n));
    stage.photos.forEach((el, i) => el.classList.toggle("is-active", i === n));
    stage.buttons.forEach((el, i) => (i === n ? el.setAttribute("aria-current", "step") : el.removeAttribute("aria-current")));
  }

  window.Drawings = { STATES, CUT, withView, renderCutaway, mountCutaway, renderCompress, setStageStep, lerp, clamp };

  /* ── Static setup (runs with and without motion) ── */
  document.querySelectorAll("[data-elevation-source]").forEach((svg) => { elevationCoil(svg); knurl(svg); });
  prepareStatic();
  const compress = document.querySelector("[data-motion='compress']");
  if (compress) renderCompress(compress, 1); // final state; motion.js scrubs from 0 when motion is allowed
  cloneElevation(document.querySelector("[data-anatomy]"), "20 20 1120 300");
  cloneElevation(document.querySelector("[data-fork]"), "20 20 1120 300");
  cloneElevation(document.querySelector("[data-engraving]"), "380 86 264 120"); // close-up of the engraved size
  document.querySelectorAll("[data-cutaway-state]").forEach((el) => {
    const svg = mountCutaway(el);
    renderCutaway(svg, withView(STATES[Number(el.dataset.cutawayState)], "vbc"));
  });
  window.Drawings.stage = buildStage();
  setStageStep(window.Drawings.stage, 0);

  /* ── Page UI (no motion): floating contact panel, desktop only, once the hero is gone ── */
  const fab = document.querySelector("[data-fab]");
  if (fab) {
    const panel = document.getElementById(fab.getAttribute("aria-controls"));
    const setOpen = (open) => { panel.hidden = !open; fab.setAttribute("aria-expanded", String(open)); };
    fab.addEventListener("click", () => setOpen(panel.hidden));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { setOpen(false); fab.focus(); } });
    const hero = document.querySelector("[data-hero]");
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        fab.parentElement.classList.toggle("is-shown", !e.isIntersecting);
        if (e.isIntersecting) setOpen(false);
      }).observe(hero);
    } else fab.parentElement.classList.add("is-shown");
  }
})();

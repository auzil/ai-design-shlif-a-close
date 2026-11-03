/*
 * Motion — shlif-inserts / a-close
 *
 * moment          trigger                 what moves                                                   why
 * (kit.js)        load                    h1 lines rise (data-reveal="lines" data-reveal-load)          heroCallouts is timed to start after them
 * heroCallouts    load                    callout leaders draw from the part, labels appear             points at what makes the difference
 * compressScrub   scroll, scrubbed        squeezed coil narrows below the hole size, arrows press in    shows why a squeezed insert goes in without effort
 * eightMoves      scroll, pinned, scrub   the cutaway performs steps 1–8 and the camera zooms onto the  the whole procedure in one drawing; the zoom makes
 *                                         bushing for 4–7; text, photo and 1–8 row swap                 the coil's 21 → 15 → 17 change visible (desktop)
 * eightMovesTap   tap 1–8 / swipe         same drawing tweens to the chosen step, no pin                one short card instead of 8 tall ones (phones)
 * twoInOne        click                   rod slides out of the body, label changes                    shows the same rod is also a fork installer
 *
 * Reduced motion: no moments run; callouts, squeezed coil and the 8 static cards are in their final state.
 *                 twoInOne still switches, instantly (kit.css shortens transitions).
 *
 * Needs (in this order, all deferred): gsap, ScrollTrigger, SplitText (3.13.0), kit.js, drawings.js, motion.js.
 * In <head>: the js-motion snippet; CSS: html.js-motion [data-motion-hide] { visibility: hidden; }
 */

/* ── Tokens ─────────────────────────────────────────────────────────────── */

const MOTION = {
  dur: { fast: 0.3, base: 0.6, slow: 0.9 }, // seconds
  ease: { out: "power3.out", inOut: "power2.inOut", reveal: "expo.out", none: "none" },
  stagger: { tight: 0.06, callouts: 0.12 },
  scrub: 0.6, // seconds of catch-up: the drawing follows the wheel without feeling glued to it
  step: { move: 0.75, hold: 0.25 }, // share of one step's scroll spent moving vs. resting on the result
  pinScreens: 6, // scroll distance of the pinned sequence, in viewport heights (8 steps)
  heroDelay: 0.5, // callouts start after the headline's first lines are up
  swipe: 40, // px of horizontal travel that counts as a swipe on the phone stage
};

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.defaults({ duration: MOTION.dur.base, ease: MOTION.ease.out });

/* ── Helpers ────────────────────────────────────────────────────────────── */

const q = (name, root = document) => root.querySelector(`[data-motion="${name}"]`);
const qa = (name, root = document) => [...root.querySelectorAll(`[data-motion="${name}"]`)];
const show = (els) => gsap.set(els, { visibility: "visible" }); // undo [data-motion-hide]
const headerRow = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-row")) * 16 || 48;

/* ── Entry point ────────────────────────────────────────────────────────── */

const root = document.documentElement;
const mm = gsap.matchMedia();
mm.add(
  {
    motion: "(prefers-reduced-motion: no-preference)",
    desktop: "(min-width: 1024px) and (min-height: 640px)",
  },
  (ctx) => {
    if (!ctx.conditions.motion) return root.classList.remove("js-motion"); // reduced motion: final state, nothing to animate
    heroCallouts();
    const cleanups = [compressScrub()];
    cleanups.push(ctx.conditions.desktop ? eightMoves() : eightMovesTap()); // pin only where the drawing has room
    return () => cleanups.forEach((undo) => undo && undo()); // runs when a condition flips or on pageMotion.revert()
  }
);

window.pageMotion = {
  revert() {
    mm.revert();
    root.classList.remove("js-motion"); // nothing may stay hidden once motion is off
  },
};

/* ── Moments (in page order) ────────────────────────────────────────────── */

function heroCallouts() {
  const callouts = qa("callout").filter((el) => el.offsetParent); // only the ones shown at this width
  show(qa("callout"));
  const leads = callouts.map((el) => el.querySelector(".co__lead"));
  const labels = callouts.map((el) => el.querySelector(".co__label"));
  return gsap
    .timeline({ delay: MOTION.heroDelay })
    .addLabel("leads")
    .from(leads, { scaleY: 0, duration: MOTION.dur.base, ease: MOTION.ease.inOut, stagger: MOTION.stagger.callouts }, "leads")
    .addLabel("labels", "-=0.3")
    .from(labels, { autoAlpha: 0, duration: MOTION.dur.fast, stagger: MOTION.stagger.callouts }, "labels");
}

function compressScrub() {
  const panel = q("compress");
  if (!panel) return null;
  const state = { t: 0 }; // 0 = free coil, 1 = squeezed to the bushing bore
  const draw = () => Drawings.renderCompress(panel, state.t);
  draw();
  const tween = gsap.to(state, {
    t: 1,
    ease: MOTION.ease.none,
    onUpdate: draw,
    scrollTrigger: { trigger: panel, start: "top 75%", end: "center 45%", scrub: MOTION.scrub },
  });
  return () => { tween.kill(); Drawings.renderCompress(panel, 1); }; // leave the final state behind
}

function eightMoves() {
  const section = document.querySelector("[data-steps-section]");
  const stage = Drawings.stage;
  if (!section || !stage) return null;
  section.classList.add("is-staged");

  const states = Drawings.STATES.map((s) => Drawings.withView(s, "vb"));
  const proxy = { ...states[0] };
  const seg = MOTION.step.move + MOTION.step.hold;
  const tl = gsap.timeline({
    defaults: { duration: MOTION.step.move, ease: MOTION.ease.inOut },
    onUpdate: () => {
      Drawings.renderCutaway(stage.svg, proxy);
      Drawings.setStageStep(stage, Math.min(states.length - 2, Math.floor(tl.time() / seg)));
    },
    scrollTrigger: {
      trigger: section.querySelector("[data-stage]"),
      start: () => `top ${headerRow()}px`,
      end: () => `+=${innerHeight * MOTION.pinScreens}`,
      pin: true,
      scrub: MOTION.scrub,
      invalidateOnRefresh: true,
    },
  });
  states.slice(1).forEach((s, i) => {
    tl.addLabel(`step${i + 1}`).to(proxy, { ...s }).to({}, { duration: MOTION.step.hold });
  });
  Drawings.renderCutaway(stage.svg, proxy);

  // 1–8 row: jump to the moment each step has just finished moving
  const jump = (i) => {
    const st = tl.scrollTrigger;
    const at = (i * seg + MOTION.step.move) / tl.duration();
    window.scrollTo({ top: st.start + (st.end - st.start) * at, behavior: "smooth" });
  };
  const handlers = stage.buttons.map((b, i) => {
    const h = () => jump(i);
    b.addEventListener("click", h);
    return h;
  });

  return () => {
    stage.buttons.forEach((b, i) => b.removeEventListener("click", handlers[i]));
    section.classList.remove("is-staged");
    ScrollTrigger.refresh();
  };
}

function eightMovesTap() {
  const section = document.querySelector("[data-steps-section]");
  const stage = Drawings.stage;
  if (!section || !stage) return null;
  section.classList.add("is-staged");

  const states = Drawings.STATES.slice(1).map((s) => Drawings.withView(s, "vbc")); // steps 1–8
  const proxy = { ...states[0] };
  let current = 0;
  let tween = null;
  const render = () => Drawings.renderCutaway(stage.svg, proxy);
  render();
  Drawings.setStageStep(stage, 0);

  const go = (n) => {
    current = Math.max(0, Math.min(states.length - 1, n));
    Drawings.setStageStep(stage, current);
    if (tween) tween.kill();
    tween = gsap.to(proxy, { ...states[current], duration: MOTION.dur.slow, ease: MOTION.ease.inOut, onUpdate: render });
  };
  const handlers = stage.buttons.map((b, i) => {
    const h = () => go(i);
    b.addEventListener("click", h);
    return h;
  });

  // swipe left / right on the drawing = next / previous step
  let x0 = null;
  const down = (e) => { x0 = e.clientX; };
  const up = (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > MOTION.swipe) go(current + (dx < 0 ? 1 : -1));
  };
  stage.drawing.addEventListener("pointerdown", down);
  stage.drawing.addEventListener("pointerup", up);

  return () => {
    if (tween) tween.kill();
    stage.buttons.forEach((b, i) => b.removeEventListener("click", handlers[i]));
    stage.drawing.removeEventListener("pointerdown", down);
    stage.drawing.removeEventListener("pointerup", up);
    section.classList.remove("is-staged");
  };
}

/* ── Interactions that work with and without motion ────────────────────── */

twoInOne();

function twoInOne() {
  const buttons = [...document.querySelectorAll("[data-mode]")];
  const drawing = document.querySelector("[data-fork]");
  const label = document.querySelector("[data-fork-label]");
  if (!buttons.length || !drawing || !label) return;
  const LABELS = { press: "Установщик со сжатием", fork: "Установщик типа «вилка» — без предварительного сжатия" };
  buttons.forEach((b) =>
    b.addEventListener("click", () => {
      const mode = b.dataset.mode;
      buttons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      drawing.classList.toggle("is-fork", mode === "fork"); // CSS transition; instant under reduced motion
      label.textContent = LABELS[mode];
    })
  );
}

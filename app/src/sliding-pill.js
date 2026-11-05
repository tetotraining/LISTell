// Sliding pill is isolated from the original bottom navigation to make
// reverting easy: remove its import from view-preserve.js.
const style = document.createElement('style');
style.textContent = "\nnav.listell-sliding-nav > .listell-sliding-pill {\n  position: absolute;\n  top: 8px;\n  left: 0;\n  width: calc(20% - 8px);\n  max-width: 84px;\n  height: 76px;\n  border-radius: 22px;\n  transform: translateX(-50%);\n  pointer-events: none;\n  z-index: 0;\n  background: color-mix(in srgb, var(--accent) 20%, var(--surface));\n  border: 1px solid color-mix(in srgb, var(--accent) 38%, transparent);\n  box-shadow: 0 2px 12px color-mix(in srgb, var(--accent) 9%, transparent);\n}\nnav.listell-sliding-nav > button {\n  position: relative;\n  z-index: 1;\n}\nnav.listell-sliding-nav > button:not([data-tab=\"add\"]) {\n  touch-action: pan-y;\n  -webkit-user-select: none;\n  user-select: none;\n}\nnav.listell-sliding-nav > button.on:not([data-tab=\"add\"]) span {\n  font-weight: 700;\n}\nnav.listell-sliding-nav > button[data-tab=\"add\"] {\n  z-index: 2;\n}\n";
document.head.appendChild(style);

const app = document.getElementById('app');
const TABS = ['all', 'list', 'priority', 'menu'];
let previousTab = null;
let previousNav = null;
let pendingOrigin = null;
let drag = null;
let ignoreNativeClickUntil = 0;

function centerOf(button) {
  return button.offsetLeft + button.offsetWidth / 2;
}
function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function slide(pill, from, to, duration) {
  pill.style.left = to + 'px';
  if (!reducedMotion() && Math.abs(from - to) > 0.5) {
    pill.animate(
      [{ left: from + 'px' }, { left: to + 'px' }],
      { duration, easing: 'cubic-bezier(.22,.8,.25,1)' }
    );
  }
}
function syncSlidingPill() {
  const nav = app?.querySelector(':scope > nav');
  if (!nav || nav === previousNav) return;

  const active = nav.querySelector('button[data-tab].on:not([data-tab="add"])');
  if (!active) return;

  nav.classList.add('listell-sliding-nav');
  const pill = document.createElement('span');
  pill.className = 'listell-sliding-pill';
  pill.setAttribute('aria-hidden', 'true');
  nav.prepend(pill);

  const destination = centerOf(active);
  const previous = previousTab
    ? nav.querySelector('button[data-tab="' + previousTab + '"]')
    : null;
  const origin = pendingOrigin ?? (previous ? centerOf(previous) : destination);
  pendingOrigin = null;
  slide(pill, origin, destination, Math.min(480, 270 + Math.abs(destination - origin) * 0.32));

  previousTab = active.dataset.tab;
  previousNav = nav;
}
function onPointerDown(event) {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const button = event.target?.closest?.('nav.listell-sliding-nav button.on[data-tab]');
  if (!button || !TABS.includes(button.dataset.tab)) return;
  const nav = button.closest('nav');
  const pill = nav?.querySelector(':scope > .listell-sliding-pill');
  if (!pill) return;

  // If a tap transition is still running, start dragging where the pill
  // is currently drawn, not where its earlier animation began.
  const rendered = parseFloat(getComputedStyle(pill).left);
  const origin = Number.isFinite(rendered) ? rendered : centerOf(button);
  pill.getAnimations().forEach(animation => animation.cancel());
  pill.style.left = origin + 'px';
  const buttons = [...nav.querySelectorAll('button[data-tab]')]
    .filter(candidate => TABS.includes(candidate.dataset.tab));
  drag = {
    pointerId: event.pointerId, nav, pill, buttons,
    startX: event.clientX, startY: event.clientY,
    origin, current: origin, engaged: false
  };
}
function dragPosition(gesture, clientX) {
  const centers = gesture.buttons.map(centerOf);
  const min = Math.min(...centers);
  const max = Math.max(...centers);
  return Math.max(min, Math.min(max, gesture.origin + clientX - gesture.startX));
}
function onPointerMove(event) {
  const gesture = drag;
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  if (!gesture.nav.isConnected) { drag = null; return; }
  const dx = event.clientX - gesture.startX;
  const dy = event.clientY - gesture.startY;
  if (!gesture.engaged) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
      drag = null;
      return;
    }
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    gesture.engaged = true;
  }
  gesture.current = dragPosition(gesture, event.clientX);
  gesture.pill.style.left = gesture.current + 'px';
}
function onPointerUp(event) {
  const gesture = drag;
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  drag = null;
  if (!gesture.engaged || !gesture.nav.isConnected) return;

  gesture.current = dragPosition(gesture, event.clientX);
  const nearest = gesture.buttons.reduce((best, button) =>
    Math.abs(centerOf(button) - gesture.current) < Math.abs(centerOf(best) - gesture.current)
      ? button : best
  );
  ignoreNativeClickUntil = performance.now() + 400;

  const active = gesture.nav.querySelector('button[data-tab].on');
  if (nearest === active) {
    slide(gesture.pill, gesture.current, centerOf(active), 220);
    return;
  }

  // main.js owns the real tab switch. Carry the finger position across the
  // DOM replacement so the new pill finishes the same movement seamlessly.
  pendingOrigin = gesture.current;
  nearest.click();
  requestAnimationFrame(() => {
    if (gesture.nav.isConnected) {
      pendingOrigin = null;
      slide(gesture.pill, gesture.current, centerOf(active), 220);
    }
  });
}
function onPointerCancel(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const gesture = drag;
  drag = null;
  const active = gesture.nav.querySelector('button[data-tab].on');
  if (gesture.engaged && active && gesture.nav.isConnected) {
    slide(gesture.pill, gesture.current, centerOf(active), 220);
  }
}

// Prevent an extra browser-generated click after a drag from triggering
// the old tab, but leave normal taps (including tap-again scroll-to-top) alone.
document.addEventListener('click', event => {
  if (!event.isTrusted || performance.now() > ignoreNativeClickUntil) return;
  if (!event.target?.closest?.('nav button[data-tab]:not([data-tab="add"])')) return;
  ignoreNativeClickUntil = 0;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

document.addEventListener('pointerdown', onPointerDown, { passive: true });
document.addEventListener('pointermove', onPointerMove, { passive: true });
document.addEventListener('pointerup', onPointerUp, { passive: true });
document.addEventListener('pointercancel', onPointerCancel, { passive: true });
window.addEventListener('resize', () => {
  const nav = app?.querySelector(':scope > nav');
  const pill = nav?.querySelector(':scope > .listell-sliding-pill');
  const active = nav?.querySelector('button[data-tab].on:not([data-tab="add"])');
  if (pill && active && !drag) {
    pill.getAnimations().forEach(animation => animation.cancel());
    pill.style.left = centerOf(active) + 'px';
  }
}, { passive: true });

if (app) {
  new MutationObserver(syncSlidingPill).observe(app, { childList: true });
  syncSlidingPill();
}

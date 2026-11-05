// Sliding selection indicator for the four main bottom tabs.
// Kept separate so reverting to the original navigation only requires
// removing its import from view-preserve.js.
const style = document.createElement('style');
style.textContent = `
nav.listell-sliding-nav > .listell-sliding-pill {
  position: absolute;
  top: 16px;
  left: 0;
  width: 66px;
  height: 40px;
  border-radius: 999px;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 0;
  background: color-mix(in srgb, var(--accent) 19%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 34%, transparent);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--accent) 9%, transparent);
}
nav.listell-sliding-nav > button {
  position: relative;
  z-index: 1;
}
nav.listell-sliding-nav > button[data-tab="add"] {
  z-index: 2;
}
`;
document.head.appendChild(style);

const app = document.getElementById('app');
let previousTab = null;
let previousNav = null;

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

  const center = button => button.offsetLeft + button.offsetWidth / 2;
  const destination = center(active);
  pill.style.left = `${destination}px`;

  const from = previousTab
    ? nav.querySelector(`button[data-tab="${previousTab}"]`)
    : null;
  if (from && previousTab !== active.dataset.tab
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const origin = center(from);
    const distance = Math.abs(destination - origin);
    pill.animate(
      [{ left: `${origin}px` }, { left: `${destination}px` }],
      {
        duration: Math.min(480, 280 + distance * 0.32),
        easing: 'cubic-bezier(.22,.8,.25,1)'
      }
    );
  }

  previousTab = active.dataset.tab;
  previousNav = nav;
}

if (app) {
  new MutationObserver(syncSlidingPill).observe(app, { childList: true });
  syncSlidingPill();
}

/* =========================================
   JACK PENDER · jackpender.ai
   script.js — cinematic deep space v14
   ========================================= */

// =========================================
// CANVAS SETUP
// =========================================
const canvas = document.getElementById('space-canvas');
const ctx    = canvas.getContext('2d');

let W = window.innerWidth;
let H = window.innerHeight;
canvas.width  = W;
canvas.height = H;

window.addEventListener('resize', () => {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width  = W;
  canvas.height = H;
});

// =========================================
// CUSTOM CURSOR
// =========================================
(function initCursor() {
  // Skip on touch/coarse-pointer devices
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  document.documentElement.classList.add('custom-cursor');

  let dotX  = window.innerWidth  / 2;
  let dotY  = window.innerHeight / 2;
  let ringX = dotX, ringY = dotY;
  let visible = false;

  document.addEventListener('mousemove', e => {
    dotX = e.clientX;
    dotY = e.clientY;
    if (!visible) {
      visible = true;
      dot.style.opacity  = '1';
      ring.style.opacity = '1';
    }
  });

  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    if (visible) {
      dot.style.opacity  = '1';
      ring.style.opacity = '1';
    }
  });

  // Hover state — light up on interactive elements
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, input, textarea, label, select, [role="button"]')) {
      document.body.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('a, button, input, textarea, label, select, [role="button"]')) {
      document.body.classList.remove('cursor-hover');
    }
  });

  function animCursor() {
    // Dot snaps immediately
    dot.style.transform = `translate(${dotX}px, ${dotY}px)`;
    // Ring lerps behind
    ringX += (dotX - ringX) * 0.12;
    ringY += (dotY - ringY) * 0.12;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(animCursor);
  }
  animCursor();
})();

// =========================================
// SECTION REVEAL
// =========================================
function triggerSectionReveal(screenEl) {
  if (!screenEl) return;
  const reveals = Array.from(screenEl.querySelectorAll('.reveal'));
  // Reset first
  reveals.forEach(el => {
    el.classList.remove('revealed');
    el.style.transitionDelay = '';
  });
  // Stagger in on next frame
  requestAnimationFrame(() => {
    reveals.forEach((el, i) => {
      el.style.transitionDelay = (i * 55) + 'ms';
      el.classList.add('revealed');
    });
  });
}

// =========================================
// STARS — 3-layer depth field (Phase 6)
// =========================================
const STAR_COLORS = [
  [255,255,255], // white
  [200,215,255], // blue-white
  [220,200,255], // purple-tinted
  [180,230,255], // pale cyan
  [255,240,200], // warm white
];

// Layer config: [0] far · [1] mid · [2] near
const STAR_LAYERS = [
  { count: 100, minSize:0.15, maxSize:0.6,  minSpd:0.008, maxSpd:0.035, minOp:0.07, maxOp:0.32 },
  { count:  90, minSize:0.45, maxSize:1.05, minSpd:0.035, maxSpd:0.10,  minOp:0.18, maxOp:0.55 },
  { count:  50, minSize:0.85, maxSize:1.75, minSpd:0.09,  maxSpd:0.20,  minOp:0.35, maxOp:0.82 },
];

// Parallax — smooth lerp of mouse position for layer offset
let prlxX = 0, prlxY = 0, prlxTX = 0, prlxTY = 0;
document.addEventListener('mousemove', e => {
  prlxTX = (e.clientX / window.innerWidth  - 0.5) * 2;
  prlxTY = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

let stars      = [];
let warpActive = false;

function makeStar(layer) {
  const col = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
  const cfg = STAR_LAYERS[layer];
  const angle = Math.random() * Math.PI * 2;
  const speed = cfg.minSpd + Math.random() * (cfg.maxSpd - cfg.minSpd);
  return {
    x:       Math.random() * W,
    y:       Math.random() * H,
    speed,
    vx:      Math.cos(angle) * speed,
    vy:      Math.sin(angle) * speed,
    size:    cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize),
    opacity: cfg.minOp   + Math.random() * (cfg.maxOp   - cfg.minOp),
    r: col[0], g: col[1], b: col[2],
    layer,
  };
}

STAR_LAYERS.forEach((cfg, li) => {
  for (let i = 0; i < cfg.count; i++) stars.push(makeStar(li));
});

function updateStars() {
  if (warpActive) {
    // Warp: stream left at high speed
    stars.forEach(s => {
      s.x -= s.speed * 38;
      if (s.x < -8) { s.x = W + 6; s.y = Math.random() * H; }
    });
  } else {
    // Normal: gentle random drift
    stars.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      // Wrap around all edges
      if (s.x < -4)    s.x = W + 4;
      if (s.x > W + 4) s.x = -4;
      if (s.y < -4)    s.y = H + 4;
      if (s.y > H + 4) s.y = -4;
    });
  }
}

function drawStars() {
  stars.forEach(s => {
    // Parallax offset — near layer moves most, far stays fixed
    const offX = s.layer === 2 ? prlxX * 9 : s.layer === 1 ? prlxX * 3.5 : 0;
    const offY = s.layer === 2 ? prlxY * 9 : s.layer === 1 ? prlxY * 3.5 : 0;
    const sx = s.x + offX;
    const sy = s.y + offY;
    if (warpActive) {
      const len = s.speed * 90;
      ctx.beginPath();
      ctx.moveTo(sx + len, sy);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${s.opacity * 0.8})`;
      ctx.lineWidth   = s.size * 0.7;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(sx, sy, s.size * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${s.opacity})`;
      ctx.fill();
    }
  });
}

// =========================================
// DAILY QUOTE
// =========================================
const DAILY_QUOTES = [
  { text: "The best time to book a demo is whenever the prospect says they're too busy to talk about it.", attr: "— Your CRM, 11:47pm" },
  { text: "Salem, Massachusetts: founded 1626, most famous for an event in 1692 that sales reps still use as a metaphor for bad quarters.", attr: "— A tour guide who's heard everything" },
  { text: "AI will replace salespeople. AI has been about to replace salespeople for roughly five years now. The salespeople are still here.", attr: "— The AI, nervously" },
  { text: "San Francisco: where everyone is disrupting an industry and also complaining about the rent.", attr: "— Karl, the fog" },
  { text: "The difference between a pitch and a conversation is who's doing most of the listening.", attr: "— A prospect who hung up" },
  { text: "Business school teaches you frameworks. The first cold call teaches you everything else.", attr: "— A framework that didn't survive contact" },
  { text: "Nobody ever closed a deal by explaining their product more slowly.", attr: "— The hold music" },
  { text: "The CRM will be updated. Eventually. After the deal closes.", attr: "— Salesforce, waiting" },
  { text: "Magna Cum Laude is Latin for 'please hire me, I did the readings.'", attr: "— A Latin professor, disappointed but impressed" },
  { text: "Every startup has a messaging problem. That's not a complaint, it's a business model.", attr: "— Clerk Chat, probably" },
  { text: "Cold outreach: the art of introducing yourself to strangers and making it their idea to respond.", attr: "— Voicemail number 47 of 50" },
  { text: "San Francisco's fog has a name: Karl. Boston's fog is just called Tuesday.", attr: "— Karl the Fog, personally" },
  { text: "The best process isn't the one someone handed down. It's the one you built because nothing else existed yet.", attr: "— A blank sales template" },
  { text: "Sales is the only profession where 'no' is the beginning of the conversation.", attr: "— An out-of-office reply" },
  { text: "The best salespeople don't sell. They help people make decisions they were already thinking about.", attr: "— Sun Tzu (misattributed, but it fits)" },
  { text: "Quota is a number. Pipeline is a story. Closed revenue is the punchline.", attr: "— A QBR slide deck, slide 23" },
  { text: "AI voice and messaging doesn't replace human connection. It removes the part where you forget to follow up.", attr: "— A very honest product demo" },
  { text: "Business pitch competitions: where you practice explaining your idea to people who could fund it, or at least give you a nice plaque.", attr: "— The plaque, gathering dust" },
  { text: "In sales, 'I'll think about it' means one of three things. Experienced reps know which one.", attr: "— The deal that died in legal" },
  { text: "Disqualifying a deal takes courage. Chasing a bad deal takes stubbornness. Knowing the difference takes experience.", attr: "— A pipeline that needed cleaning" },
  { text: "The In-N-Out hat was a statement. The VP disagreed. The numbers disagreed with the VP.", attr: "— The hat, vindicated" },
  { text: "Enterprise software demos run on three things: solid discovery, a well-timed follow-up, and WiFi that doesn't fail during screen share.", attr: "— A Zoom call that almost held together" },
  { text: "Salem banned Ouija boards until 2001. Now it's the top place in America to buy one. Entrepreneurship comes in many forms.", attr: "— A Ouija board, unavailable for comment" },
  { text: "The average deal has more stages than a Broadway show and a shorter run time.", attr: "— A contract in final redlines" },
  { text: "Outbound strategy: the goal isn't to sound like a salesperson. The goal is to sound like someone worth talking to.", attr: "— Cold email subject line #23" },
  { text: "From SDR to closing enterprise deals in under two years. The average is 3–4 years. The average is just a number.", attr: "— The average, offended" },
  { text: "You can tell a lot about someone's sales philosophy by how they react when a deal goes quiet.", attr: "— A ghost in the pipeline" },
  { text: "An early-stage startup's GTM strategy is 40% research, 20% instinct, and 40% figuring it out after the first call.", attr: "— A pitch deck, slide 2" },
  { text: "Most people don't buy because of the features. They buy because someone made them feel like they'd be missing out without it.", attr: "— A win/loss analysis nobody read" },
  { text: "The Salem witch trials: a cautionary tale about what happens when you let fear drive decision-making. Still relevant in pipeline reviews.", attr: "— 1692, with notes" },
];

function initDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const q = DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
  const textEl = document.getElementById('daily-quote-text');
  const attrEl = document.getElementById('daily-quote-attr');
  if (textEl) textEl.textContent = q.text;
  if (attrEl) attrEl.textContent = q.attr;
}
initDailyQuote();

// =========================================
// FUN FACT POPUP
// =========================================
const factPopup    = document.getElementById('fact-popup');
const factPopupTxt = document.getElementById('fact-popup-text');
let factPopupTimer = null;

function showFact(text) {
  factPopupTxt.textContent = text;
  factPopup.classList.remove('hidden');
  // Trigger transition on next frame
  requestAnimationFrame(() => factPopup.classList.add('visible'));
  clearTimeout(factPopupTimer);
  factPopupTimer = setTimeout(() => hideFact(), 7000);
}

function hideFact() {
  factPopup.classList.remove('visible');
  clearTimeout(factPopupTimer);
  setTimeout(() => factPopup.classList.add('hidden'), 420);
}

document.getElementById('fact-popup-close').addEventListener('click', hideFact);

document.querySelectorAll('[data-fact]').forEach(el => {
  el.addEventListener('click', e => {
    // Don't trigger if clicking a button/link inside the card
    if (e.target.closest('button, a')) return;
    showFact(el.dataset.fact);
  });
});

// =========================================
// ARCADE SHOOTING (document-level click)
// =========================================
let canShoot = true;
let arcadeActive = false;
document.addEventListener('click', e => {
  if (e.target.closest('button, a, input, textarea, label')) return;
  // ARCADE MODE: fire bullet toward click position
  if (arcadeActive && arcState === 'playing' && arcShip) {
    const angle = Math.atan2(e.clientY - arcShip.y, e.clientX - arcShip.x);
    arcBullets.push(new ArcBullet(angle));
  }
});

// =========================================
// MAIN LOOP — cinematic starfield only
// =========================================
function loop() {
  // Lerp parallax toward mouse target (smooth movement)
  prlxX += (prlxTX - prlxX) * 0.04;
  prlxY += (prlxTY - prlxY) * 0.04;
  ctx.clearRect(0, 0, W, H);
  updateStars();
  drawStars();
  requestAnimationFrame(loop);
}

loop();

// =========================================
// NAVIGATION
// =========================================
const overlay = document.getElementById('warp-overlay');
const miniNav = document.getElementById('mini-nav');

function updateMiniNav(target) {
  // Show mini nav when inside any section, hide on home
  if (target === 'home') {
    miniNav.classList.add('hidden');
  } else {
    miniNav.classList.remove('hidden');
  }
  // Highlight the active section dot
  document.querySelectorAll('.mnav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === target);
  });
}

function navigateTo(target, pushHistory) {
  const current = document.querySelector('.screen.active');
  if (!current) return;
  if (current.id === 'screen-' + target) return;
  if (current.id === 'screen-arcade' && target !== 'arcade') arcEndGame('exit');
  arcadeActive = (target === 'arcade');
  canShoot   = false;
  warpActive = true;

  // Push browser history so back button works between sections
  if (pushHistory !== false) {
    history.pushState({ section: target }, '', '#' + target);
  }

  setTimeout(() => {
    overlay.style.opacity    = '0.8';
    overlay.style.transition = 'opacity 0.1s ease';
  }, 360);

  setTimeout(() => {
    current.classList.remove('active');
    const next = document.getElementById('screen-' + target);
    if (next) {
      next.classList.add('active');
      const scroll = next.querySelector('.section-scroll');
      if (scroll) scroll.scrollTop = 0;
      // Reset home scroll position when returning to home
      if (target === 'home') {
        const hs = next.querySelector('.home-scroll');
        if (hs) hs.scrollTop = 0;
      }
      // Staggered reveal for the incoming section
      triggerSectionReveal(next);
    }
    overlay.style.opacity    = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    warpActive = false;
    updateMiniNav(target);
    setTimeout(() => { canShoot = true; }, 350);
  }, 480);
}

// Browser back/forward button support
window.addEventListener('popstate', e => {
  const target = (e.state && e.state.section) || 'home';
  navigateTo(target, false);
});

// Load correct section if URL has a hash (e.g. #pilot)
if (location.hash) {
  const target = location.hash.slice(1);
  if (document.getElementById('screen-' + target)) {
    document.getElementById('screen-home').classList.remove('active');
    document.getElementById('screen-' + target).classList.add('active');
    updateMiniNav(target);
    arcadeActive = (target === 'arcade');
  }
}

// Wire up all nav buttons
document.querySelectorAll('.planet-btn').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.target)));
document.querySelectorAll('.back-btn').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.target)));
document.querySelectorAll('.mnav-btn').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.target)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') navigateTo('home'); });

// Trigger reveal on the initially active screen (handles direct URL hash + default home)
triggerSectionReveal(document.querySelector('.screen.active'));

// Fade scroll hint when user scrolls the home screen
const homeScroll = document.querySelector('.home-scroll');
const scrollHint = document.getElementById('scroll-hint');
if (homeScroll && scrollHint) {
  homeScroll.addEventListener('scroll', () => {
    scrollHint.classList.toggle('faded', homeScroll.scrollTop > 40);
  });
}

// =========================================
// MOBILE SWIPE — right swipe goes home (Phase 7)
// =========================================
let _swX = 0, _swY = 0, _swT = 0;
document.addEventListener('touchstart', e => {
  _swX = e.touches[0].clientX;
  _swY = e.touches[0].clientY;
  _swT = Date.now();
}, { passive: true });
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - _swX;
  const dy = e.changedTouches[0].clientY - _swY;
  const dt = Date.now() - _swT;
  // Right swipe: mostly horizontal, > 72px, < 450ms
  if (dx > 72 && Math.abs(dy) < 80 && dt < 450) {
    const active = document.querySelector('.screen.active');
    if (active && active.id !== 'screen-home' && active.id !== 'screen-arcade') {
      navigateTo('home');
    }
  }
}, { passive: true });

// =========================================
// SHOOTING STAR CONTACT
// =========================================
const launchBtn      = document.getElementById('launch-signal-btn');
const signalFormWrap = document.getElementById('signal-form-wrap');

if (launchBtn) {
  launchBtn.addEventListener('click', () => {
    const startX   = W + 10;
    const startY   = 80 + Math.random() * (H * 0.3);
    const endX     = -10;
    const endY     = startY + H * 0.25 + Math.random() * H * 0.2;
    const duration = 750;
    const t0       = performance.now();
    let tx = startX, ty = startY;

    function animStar(now) {
      const prog  = Math.min((now - t0) / duration, 1);
      const ease  = 1 - Math.pow(1 - prog, 3);
      const cx    = startX + (endX - startX) * ease;
      const cy    = startY + (endY - startY) * ease;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(cx, cy);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth   = 2;
      ctx.shadowColor = '#FFB800';
      ctx.shadowBlur  = 16;
      ctx.stroke();
      ctx.restore();

      tx = cx; ty = cy;
      if (prog < 1) {
        requestAnimationFrame(animStar);
      } else {
        signalFormWrap.classList.remove('hidden');
        launchBtn.style.display = 'none';
      }
    }
    requestAnimationFrame(animStar);
  });
}

// Form submit
const signalForm = document.getElementById('signal-form');
if (signalForm) {
  signalForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (signalForm.action.includes('YOUR_FORM_ID')) {
      alert('Add your Formspree ID to index.html to activate the contact form. (See setup instructions.)');
      return;
    }
    try {
      const res = await fetch(signalForm.action, {
        method: 'POST',
        body: new FormData(signalForm),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        signalForm.style.display = 'none';
        document.getElementById('form-success').classList.remove('hidden');
      }
    } catch {
      alert('Signal failed to transmit. Try emailing directly.');
    }
  });
}

// =========================================
// ARCADE GAME
// =========================================
let arcCanvas, arcCtx, arcW, arcH;
let arcState = 'idle';
let arcShip, arcAsteroids, arcBullets, arcExplosions;
let arcLives, arcHits, arcTimeLeft;
let arcAnimFrame, arcTimerInterval, arcSpawnInterval;
let arcMouseX = 0, arcMouseY = 0;
let arcInvincible = false;
let arcStarting  = false; // grace period at game start — no collision
let arcKeys      = {};    // WASD / arrow key state

class ArcAsteroid {
  constructor() { this.alive = true; this.spawn(); }
  spawn() {
    const edge = Math.floor(Math.random() * 4);
    let tx, ty;
    if (edge === 0) {
      // From top → travels generally downward
      this.x = Math.random() * arcW; this.y = -40;
      tx = arcW * 0.1 + Math.random() * arcW * 0.8;
      ty = arcH * 0.55 + Math.random() * arcH * 0.55;
    } else if (edge === 1) {
      // From right → travels generally leftward
      this.x = arcW + 40; this.y = Math.random() * arcH;
      tx = Math.random() * arcW * 0.5;
      ty = arcH * 0.1 + Math.random() * arcH * 0.8;
    } else if (edge === 2) {
      // From bottom → travels generally upward
      this.x = Math.random() * arcW; this.y = arcH + 40;
      tx = arcW * 0.1 + Math.random() * arcW * 0.8;
      ty = Math.random() * arcH * 0.45;
    } else {
      // From left → travels generally rightward
      this.x = -40; this.y = Math.random() * arcH;
      tx = arcW * 0.5 + Math.random() * arcW * 0.5;
      ty = arcH * 0.1 + Math.random() * arcH * 0.8;
    }
    this.size = 16 + Math.random() * 22;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d  = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = 0.5 + Math.random() * 0.9;
    this.vx = (dx / d) * spd;
    this.vy = (dy / d) * spd;
    this.rot = 0;
    this.rotSpd = (Math.random() - 0.5) * 0.04;
    const sides = 6 + Math.floor(Math.random() * 4);
    this.verts = Array.from({ length: sides }, () => 0.6 + Math.random() * 0.7);
    this.sides = sides;
    this.pulse = Math.random() * Math.PI * 2;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.rot += this.rotSpd; this.pulse += 0.04;
    if (this.x < -100 || this.x > arcW + 100 || this.y < -100 || this.y > arcH + 100) this.spawn();
  }
  draw() {
    const p = 0.5 + 0.5 * Math.sin(this.pulse);
    arcCtx.save();
    arcCtx.translate(this.x, this.y);
    arcCtx.rotate(this.rot);
    arcCtx.beginPath();
    for (let i = 0; i < this.sides; i++) {
      const a = (i / this.sides) * Math.PI * 2;
      const r = this.size * this.verts[i];
      i === 0 ? arcCtx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
              : arcCtx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    arcCtx.closePath();
    arcCtx.shadowColor = `rgba(255,${100 + p * 80},0,1)`;
    arcCtx.shadowBlur = 14 + p * 8;
    arcCtx.strokeStyle = `rgba(255,${140 + p * 60},20,0.9)`;
    arcCtx.lineWidth = 2;
    arcCtx.stroke();
    arcCtx.fillStyle = 'rgba(255,107,0,0.07)';
    arcCtx.fill();
    arcCtx.restore();
  }
  hit(px, py) {
    const dx = px - this.x, dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size * 1.1;
  }
}

class ArcBullet {
  constructor(angle) {
    this.x = arcShip.x; this.y = arcShip.y;
    const spd = 18;
    this.vx = Math.cos(angle) * spd;
    this.vy = Math.sin(angle) * spd;
    this.alive = true; this.life = 0;
  }
  update() {
    this.x += this.vx; this.y += this.vy; this.life++;
    if (this.life > 65 || this.x < -10 || this.x > arcW + 10 || this.y < -10 || this.y > arcH + 10) this.alive = false;
  }
  draw() {
    arcCtx.save();
    arcCtx.beginPath();
    arcCtx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    arcCtx.shadowColor = '#39FF14';
    arcCtx.shadowBlur = 18;
    arcCtx.fillStyle = '#39FF14';
    arcCtx.fill();
    arcCtx.beginPath();
    arcCtx.moveTo(this.x, this.y);
    arcCtx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
    arcCtx.strokeStyle = 'rgba(57,255,20,0.5)';
    arcCtx.lineWidth = 2;
    arcCtx.stroke();
    arcCtx.restore();
  }
}

class ArcExplosion {
  constructor(x, y) {
    this.x = x; this.y = y; this.life = 1.0;
    const colors = ['255,184,0', '255,107,0', '255,45,120', '57,255,20'];
    this.pts = Array.from({ length: 14 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 3.5,
      size: 1 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }
  update() { this.life -= 0.04; }
  draw() {
    const prog = 1 - this.life;
    this.pts.forEach(p => {
      const px = this.x + Math.cos(p.angle) * p.speed * prog * 28;
      const py = this.y + Math.sin(p.angle) * p.speed * prog * 28;
      arcCtx.beginPath();
      arcCtx.arc(px, py, p.size * this.life, 0, Math.PI * 2);
      arcCtx.shadowColor = `rgba(${p.color},1)`;
      arcCtx.shadowBlur = 5;
      arcCtx.fillStyle = `rgba(${p.color},${this.life})`;
      arcCtx.fill();
    });
  }
}

function arcDrawShip() {
  if (arcInvincible && Math.floor(Date.now() / 100) % 2 === 0) return;
  const s = arcShip, size = 18;
  arcCtx.save();
  arcCtx.translate(s.x, s.y);
  arcCtx.rotate(s.angle);
  arcCtx.beginPath();
  arcCtx.moveTo(size, 0);
  arcCtx.lineTo(-size * 0.65, size * 0.45);
  arcCtx.lineTo(-size * 0.35, 0);
  arcCtx.lineTo(-size * 0.65, -size * 0.45);
  arcCtx.closePath();
  arcCtx.shadowColor = '#39FF14';
  arcCtx.shadowBlur = 18;
  arcCtx.strokeStyle = '#39FF14';
  arcCtx.lineWidth = 1.5;
  arcCtx.stroke();
  arcCtx.fillStyle = 'rgba(57,255,20,0.1)';
  arcCtx.fill();
  arcCtx.restore();
}

function arcDrawCursor() {
  const x = arcMouseX, y = arcMouseY, r = 9;
  arcCtx.save();
  arcCtx.strokeStyle = 'rgba(57,255,20,0.7)';
  arcCtx.lineWidth = 1;
  arcCtx.shadowColor = '#39FF14';
  arcCtx.shadowBlur = 6;
  arcCtx.beginPath();
  arcCtx.moveTo(x - r, y); arcCtx.lineTo(x - 3, y);
  arcCtx.moveTo(x + 3, y); arcCtx.lineTo(x + r, y);
  arcCtx.moveTo(x, y - r); arcCtx.lineTo(x, y - 3);
  arcCtx.moveTo(x, y + 3); arcCtx.lineTo(x, y + r);
  arcCtx.stroke();
  arcCtx.beginPath();
  arcCtx.arc(x, y, 1.5, 0, Math.PI * 2);
  arcCtx.fillStyle = '#39FF14';
  arcCtx.fill();
  arcCtx.restore();
}

function arcUpdateHUD() {
  document.getElementById('arcade-lives').textContent = arcLives > 0 ? '♥ '.repeat(arcLives).trim() : '☆';
  document.getElementById('arcade-timer-display').textContent = arcTimeLeft < 10 ? '0' + arcTimeLeft : '' + arcTimeLeft;
  document.getElementById('arcade-hits-display').textContent = 'HITS: ' + arcHits;
}

function arcEndGame(result) {
  clearInterval(arcTimerInterval);
  clearInterval(arcSpawnInterval);
  cancelAnimationFrame(arcAnimFrame);
  arcState = result;

  const screenEl = document.getElementById('screen-arcade');
  if (screenEl) screenEl.classList.remove('playing');

  // Restore global footer + mini-nav when game ends
  const gf = document.getElementById('global-footer');
  if (gf) gf.classList.remove('hidden');
  const mn = document.getElementById('mini-nav');
  if (mn) mn.classList.remove('hidden');

  const hudEl   = document.getElementById('arcade-hud');
  const startEl = document.getElementById('arcade-start-overlay');
  const winEl   = document.getElementById('arcade-win-overlay');
  const deadEl  = document.getElementById('arcade-dead-overlay');
  if (!startEl) return;

  hudEl.classList.add('hidden');
  startEl.classList.add('hidden');
  winEl.classList.add('hidden');
  deadEl.classList.add('hidden');

  if (result === 'won')      winEl.classList.remove('hidden');
  else if (result === 'dead') deadEl.classList.remove('hidden');
  else                        startEl.classList.remove('hidden');
}

function arcStartGame() {
  arcState = 'playing';
  arcLives = 5;
  arcHits = 0;
  arcTimeLeft = 30;
  arcInvincible = false;
  arcStarting  = true;  // 5s grace period — ship can't be hit at start
  arcKeys      = {};
  setTimeout(() => { arcStarting = false; }, 5000);

  // Hide global footer + mini-nav during gameplay
  const gf = document.getElementById('global-footer');
  if (gf) gf.classList.add('hidden');
  const mn = document.getElementById('mini-nav');
  if (mn) mn.classList.add('hidden');
  arcShip = { x: arcW / 2, y: arcH / 2, angle: 0 };
  arcAsteroids = Array.from({ length: 4 }, () => new ArcAsteroid());
  arcBullets = [];
  arcExplosions = [];

  document.getElementById('arcade-start-overlay').classList.add('hidden');
  document.getElementById('arcade-win-overlay').classList.add('hidden');
  document.getElementById('arcade-dead-overlay').classList.add('hidden');
  document.getElementById('arcade-hud').classList.remove('hidden');
  document.getElementById('screen-arcade').classList.add('playing');

  arcUpdateHUD();

  clearInterval(arcTimerInterval);
  arcTimerInterval = setInterval(() => {
    arcTimeLeft--;
    arcUpdateHUD();
    if (arcTimeLeft <= 0) arcEndGame('won');
  }, 1000);

  clearInterval(arcSpawnInterval);
  arcSpawnInterval = setInterval(() => {
    if (arcState === 'playing' && arcAsteroids.filter(a => a.alive).length < 6) {
      arcAsteroids.push(new ArcAsteroid());
    }
  }, 2500);

  cancelAnimationFrame(arcAnimFrame);
  arcGameLoop();
}

function arcGameLoop() {
  arcCtx.clearRect(0, 0, arcW, arcH);
  arcCtx.fillStyle = 'rgba(6,2,21,0.95)';
  arcCtx.fillRect(0, 0, arcW, arcH);

  if (arcState !== 'playing') return;

  // Ship movement — WASD or arrow keys
  const spd = 4;
  if (arcKeys['ArrowUp']    || arcKeys['w'] || arcKeys['W']) arcShip.y -= spd;
  if (arcKeys['ArrowDown']  || arcKeys['s'] || arcKeys['S']) arcShip.y += spd;
  if (arcKeys['ArrowLeft']  || arcKeys['a'] || arcKeys['A']) arcShip.x -= spd;
  if (arcKeys['ArrowRight'] || arcKeys['d'] || arcKeys['D']) arcShip.x += spd;
  // Wrap at screen edges
  if (arcShip.x < -24) arcShip.x = arcW + 24;
  if (arcShip.x > arcW + 24) arcShip.x = -24;
  if (arcShip.y < -24) arcShip.y = arcH + 24;
  if (arcShip.y > arcH + 24) arcShip.y = -24;

  // Update ship aim
  arcShip.angle = Math.atan2(arcMouseY - arcShip.y, arcMouseX - arcShip.x);

  // Subtle aim line
  arcCtx.save();
  arcCtx.beginPath();
  arcCtx.moveTo(arcShip.x, arcShip.y);
  arcCtx.lineTo(arcMouseX, arcMouseY);
  arcCtx.strokeStyle = 'rgba(57,255,20,0.08)';
  arcCtx.lineWidth = 1;
  arcCtx.setLineDash([5, 8]);
  arcCtx.stroke();
  arcCtx.setLineDash([]);
  arcCtx.restore();

  // Bullets
  arcBullets = arcBullets.filter(b => b.alive);
  arcBullets.forEach(b => {
    b.update();
    arcAsteroids.forEach(a => {
      if (!a.alive || !b.alive) return;
      if (a.hit(b.x, b.y)) {
        a.alive = b.alive = false;
        arcExplosions.push(new ArcExplosion(a.x, a.y));
        arcHits++;
        arcUpdateHUD();
        setTimeout(() => { a.spawn(); a.alive = true; }, 1200);
      }
    });
    b.draw();
  });

  // Asteroids
  for (let i = 0; i < arcAsteroids.length; i++) {
    const a = arcAsteroids[i];
    if (!a.alive) continue;
    a.update();
    a.draw();
    if (!arcInvincible && !arcStarting) {
      const dx = arcShip.x - a.x, dy = arcShip.y - a.y;
      if (Math.sqrt(dx * dx + dy * dy) < a.size + 10) {
        a.alive = false;
        arcExplosions.push(new ArcExplosion(arcShip.x, arcShip.y));
        arcLives--;
        arcUpdateHUD();
        arcInvincible = true;
        const ref = a;
        setTimeout(() => { ref.spawn(); ref.alive = true; arcInvincible = false; }, 3000);
        if (arcLives <= 0) { arcEndGame('dead'); return; }
      }
    }
  }

  // Explosions
  arcExplosions.forEach(e => e.update());
  arcExplosions = arcExplosions.filter(e => e.life > 0);
  arcExplosions.forEach(e => e.draw());

  // Draw ship
  arcDrawShip();

  // Draw custom crosshair
  arcDrawCursor();

  arcAnimFrame = requestAnimationFrame(arcGameLoop);
}

// Initialize arcade
function arcInit() {
  arcCanvas = document.getElementById('arcade-canvas');
  if (!arcCanvas) return;
  arcCtx = arcCanvas.getContext('2d');

  function arcResize() {
    arcW = arcCanvas.width  = window.innerWidth;
    arcH = arcCanvas.height = window.innerHeight;
  }
  arcResize();
  window.addEventListener('resize', arcResize);

  document.addEventListener('mousemove', e => {
    arcMouseX = e.clientX;
    arcMouseY = e.clientY;
  });

  // Shooting is handled by the document-level click listener above

  document.addEventListener('keydown', e => {
    arcKeys[e.key] = true;
    if (arcState === 'playing') {
      // Prevent page scroll during gameplay
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === ' ') {
        arcBullets.push(new ArcBullet(arcShip.angle));
      }
    }
  });
  document.addEventListener('keyup', e => { arcKeys[e.key] = false; });

  const startBtn = document.getElementById('arcade-start-btn');
  const retryBtn = document.getElementById('arcade-retry-btn');
  const againBtn = document.getElementById('arcade-play-again-btn');
  if (startBtn) startBtn.addEventListener('click', arcStartGame);
  if (retryBtn) retryBtn.addEventListener('click', arcStartGame);
  if (againBtn) againBtn.addEventListener('click', arcStartGame);
}

// =========================================
// ORBITAL PLANET NAV (v23 — name-as-sun, hover-pause, spread orbits)
// =========================================
function initOrbitNav() {
  const nav  = document.querySelector('.planet-nav');
  if (!nav) return;

  const btns  = Array.from(nav.querySelectorAll('.planet-btn'));
  const rings = Array.from(nav.querySelectorAll('.orbit-ring'));
  if (!btns.length) return;

  // rFac  = orbit radius as fraction of nav width (evenly spread — min gap 0.07)
  // speed = radians per ms (~30% slower than v22)
  // phase = starting angle (radians)
  // b     = y-compression (ellipse flatness; 1 = circle)
  const PARAMS = [
    { rFac: 0.11, speed: 0.00021, phase: 0.00,  b: 0.38 }, // PILOT
    { rFac: 0.19, speed: 0.00015, phase: 1.05,  b: 0.34 }, // MISSION LOG
    { rFac: 0.27, speed: 0.00027, phase: 2.09,  b: 0.30 }, // TRANSMISSIONS
    { rFac: 0.33, speed: 0.00012, phase: 3.14,  b: 0.28 }, // ARCHIVE
    { rFac: 0.39, speed: 0.00018, phase: 4.19,  b: 0.26 }, // MAKE CONTACT
    { rFac: 0.45, speed: 0.00010, phase: 5.24,  b: 0.24 }, // ARCADE
  ];

  let orbits   = [];
  let orbitRaf = null;
  let running  = false;
  let lastTs   = null;

  function isMobile() { return window.innerWidth <= 640; }

  // Hover-pause listeners — set once, not per rebuild
  btns.forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => { if (orbits[i]) orbits[i].hovering = true; });
    btn.addEventListener('mouseleave', () => { if (orbits[i]) orbits[i].hovering = false; });
  });

  function buildOrbits() {
    if (isMobile()) { stopOrbit(); return; }
    const W = nav.offsetWidth;
    // Preserve live angle + scale on resize so orbit doesn't jump
    orbits = PARAMS.map((p, i) => ({
      ...p,
      r:            W * p.rFac,
      angle:        orbits[i] ? orbits[i].angle        : p.phase,
      hovering:     orbits[i] ? orbits[i].hovering     : false,
      currentScale: orbits[i] ? orbits[i].currentScale : 0.72 + 0.32 * 0.5,
    }));
    rings.forEach((ring, i) => {
      const o = orbits[i]; if (!o) return;
      ring.style.width  = (o.r * 2) + 'px';
      ring.style.height = (o.r * o.b * 2) + 'px';
    });
    if (!running) startOrbit();
  }

  function startOrbit() {
    running = true;
    lastTs  = null;
    btns.forEach(btn => {
      btn.style.position = 'absolute';
      btn.style.left     = '0';
      btn.style.top      = '0';
    });
    orbitRaf = requestAnimationFrame(tick);
  }

  function stopOrbit() {
    running = false;
    lastTs  = null;
    cancelAnimationFrame(orbitRaf);
    btns.forEach(btn => {
      btn.style.position  = '';
      btn.style.left      = '';
      btn.style.top       = '';
      btn.style.transform = '';
      btn.style.zIndex    = '';
      btn.style.opacity   = '';
    });
    orbits.forEach(o => { if (o) o.hovering = false; });
  }

  function tick(ts) {
    if (!running) return;

    // Delta time — capped to 50ms so tab switches don't cause a jump
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;

    const cx = nav.offsetWidth  / 2;
    const cy = nav.offsetHeight / 2;

    btns.forEach((btn, i) => {
      const o = orbits[i]; if (!o) return;

      // Advance angle only while not paused by hover
      if (!o.hovering) o.angle += o.speed * dt;

      const angle  = o.angle;
      const x      = cx + Math.cos(angle) * o.r;
      const y      = cy + Math.sin(angle) * o.r * o.b;
      const depth  = Math.sin(angle);       // -1 (back) → +1 (front)
      const t      = depth * 0.5 + 0.5;    // 0 → 1

      // Smoothly lerp toward target scale (hover = bigger, normal = depth-based)
      const baseScale   = 0.72 + 0.32 * t;
      const targetScale = o.hovering ? Math.max(baseScale * 1.20, 1.08) : baseScale;
      o.currentScale   += (targetScale - o.currentScale) * 0.12;

      btn.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${o.currentScale.toFixed(4)})`;
      btn.style.zIndex    = o.hovering ? '50' : String(Math.round(10 + depth * 15));
      btn.style.opacity   = o.hovering ? '1' : (0.45 + 0.55 * t).toFixed(3);
    });

    orbitRaf = requestAnimationFrame(tick);
  }

  buildOrbits();

  const ro = new ResizeObserver(buildOrbits);
  ro.observe(nav);

  document.addEventListener('visibilitychange', () => {
    if (!running) return;
    if (document.hidden) { cancelAnimationFrame(orbitRaf); lastTs = null; }
    else orbitRaf = requestAnimationFrame(tick);
  });
}
initOrbitNav();

arcInit();

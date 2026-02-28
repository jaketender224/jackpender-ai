/* =========================================
   JACK PENDER · jackpender.ai
   script.js — neon arcade space engine
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
// NEBULAE (painted once per frame behind stars)
// =========================================
const NEBULAE = [
  { cx: 0.18, cy: 0.25, r: 320, color: [128,0,255],  alpha: 0.06 },
  { cx: 0.82, cy: 0.70, r: 280, color: [0,100,255],  alpha: 0.05 },
  { cx: 0.50, cy: 0.50, r: 380, color: [0,180,255],  alpha: 0.03 },
  { cx: 0.75, cy: 0.15, r: 200, color: [255,45,120], alpha: 0.04 },
];

function drawNebulae() {
  NEBULAE.forEach(n => {
    const grd = ctx.createRadialGradient(
      n.cx * W, n.cy * H, 0,
      n.cx * W, n.cy * H, n.r
    );
    grd.addColorStop(0, `rgba(${n.color[0]},${n.color[1]},${n.color[2]},${n.alpha})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  });
}

// =========================================
// STARS
// =========================================
const STAR_COUNT  = 240;
const STAR_COLORS = [
  [255,255,255], // white
  [200,215,255], // blue-white
  [220,200,255], // purple-tinted
  [180,230,255], // pale cyan
  [255,240,200], // warm white
];

let stars      = [];
let warpActive = false;

function makeStar(forceRight) {
  const col = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
  return {
    x:       forceRight ? W + 6 : Math.random() * W,
    y:       Math.random() * H,
    speed:   0.06 + Math.random() * 0.4,
    size:    0.3 + Math.random() * 1.6,
    opacity: 0.1 + Math.random() * 0.8,
    r: col[0], g: col[1], b: col[2],
  };
}

for (let i = 0; i < STAR_COUNT; i++) stars.push(makeStar(false));

function updateStars() {
  const spd = warpActive ? 38 : 1;
  stars.forEach(s => {
    s.x -= s.speed * spd;
    if (s.x < -8) Object.assign(s, makeStar(true));
  });
}

function drawStars() {
  stars.forEach(s => {
    if (warpActive) {
      const len = s.speed * 90;
      ctx.beginPath();
      ctx.moveTo(s.x + len, s.y);
      ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${s.opacity * 0.8})`;
      ctx.lineWidth   = s.size * 0.7;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${s.opacity})`;
      ctx.fill();
    }
  });
}

// =========================================
// INTEL FACTS — story-driven, educational
// =========================================
const INTEL_FACTS = [
  "INTEL: 210% of quota in Q4. The real unlock? Cutting average sales cycle from 7.8 to 3.9 days while simultaneously closing bigger deals. Most AEs think you have to pick one. You don't — you just have to disqualify faster.",
  "INTEL: Wrote Clerk Chat's outbound playbook at 22 with zero prior sales experience. It's still being used. Takeaway: the person with the least assumptions often builds the best process — they're not protecting how it's always been done.",
  "INTEL: 80% win rate by Q4 2025. It started at 62%. The difference wasn't more effort — it was better disqualification. Stopped chasing deals that weren't ready. Sounds obvious. Most reps can't bring themselves to do it.",
  "INTEL: Grew average deal size 510% in under a year — from $2.1K to $12.8K ACV. The lesson: your average deal size is a ceiling you set for yourself. Most salespeople anchor to what they've already closed, not what's actually possible.",
  "INTEL: Closed a $330K deal before his 23rd birthday. His parents still can't explain what he does at dinner parties. He's made peace with this.",
  "INTEL: SDR to Mid-Market AE in under 2 years. The average is 3-4 years. Moving fast in sales isn't about skipping stages — it's about compressing them. Treat every stage like a test you're trying to ace early.",
  "INTEL: Won the Salem State business pitch competition in 2023. Turns out selling judges on a startup idea uses the exact same muscle as selling a VP on enterprise software. Different stakes, same fundamentals.",
  "INTEL: Closed 3 of the largest deals in Clerk Chat history. The company's max deal size went from $160K to $240K ACV in the process. Ceilings aren't real until you test them.",
  "INTEL: Showed up to the office in an In-N-Out hat. VP walked in, said 'that's where you're headed if you don't start closing.' Proceeded to have his best quarter. Hat is retired. Results are not.",
  "INTEL: Graduated Magna Cum Laude from Salem State. Nobody arrives at college planning to sell AI messaging software to hospitals and logistics companies. The path is rarely the one you mapped out — show up, figure it out.",
  "INTEL: Office alias: 'Jake Tender.' Legal name: Jack Pender. One is on the contracts. The other is on the group chat. Both close deals. Neither wears a tie.",
];

// =========================================
// ASTEROIDS
// =========================================
let asteroids  = [];
let bullets    = [];
let explosions = [];
let score      = 0;
let factIndex  = 0;
let hintHidden = false;

class Asteroid {
  constructor(offscreen) {
    this.alive = true;
    this.spawn(offscreen);
  }

  spawn(offscreen) {
    if (offscreen) {
      const e = Math.floor(Math.random() * 3);
      if      (e === 0) { this.x = W + 70;               this.y = Math.random() * H; }
      else if (e === 1) { this.x = Math.random() * W;    this.y = -70; }
      else              { this.x = Math.random() * W;    this.y = H + 70; }
    } else {
      this.x = 80 + Math.random() * (W - 160);
      this.y = 80 + Math.random() * (H - 160);
    }
    this.size     = 20 + Math.random() * 30;
    this.vx       = -0.35 - Math.random() * 1.3;
    this.vy       = (Math.random() - 0.5) * 0.9;
    this.rot      = 0;
    this.rotSpd   = (Math.random() - 0.5) * 0.022;
    const sides   = 7 + Math.floor(Math.random() * 4);
    this.verts    = Array.from({ length: sides }, () => 0.6 + Math.random() * 0.7);
    this.sides    = sides;
    this.glowPulse = Math.random() * Math.PI * 2;
  }

  update() {
    this.x        += this.vx;
    this.y        += this.vy;
    this.rot      += this.rotSpd;
    this.glowPulse += 0.03;
    if (this.x < -90 || this.y < -90 || this.y > H + 90) this.spawn(true);
  }

  draw() {
    const pulse = 0.5 + 0.5 * Math.sin(this.glowPulse);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    ctx.beginPath();
    for (let i = 0; i < this.sides; i++) {
      const angle = (i / this.sides) * Math.PI * 2;
      const r     = this.size * this.verts[i];
      i === 0
        ? ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
        : ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();

    ctx.shadowColor = `rgba(255,${100 + pulse * 80},0,1)`;
    ctx.shadowBlur  = 12 + pulse * 8;
    ctx.strokeStyle = `rgba(255,${140 + pulse * 60},20,0.85)`;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = 'rgba(255,107,0,0.06)';
    ctx.fill();
    ctx.restore();
  }

  hit(px, py) {
    const dx = px - this.x, dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size;
  }
}

// =========================================
// BULLETS
// =========================================
class Bullet {
  constructor(tx, ty) {
    this.x = W / 2;
    this.y = H / 2;
    const dx  = tx - this.x, dy = ty - this.y;
    const d   = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = 15;
    this.vx   = (dx / d) * spd;
    this.vy   = (dy / d) * spd;
    this.alive = true;
    this.life  = 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life++;
    if (this.life > 85 || this.x < -10 || this.x > W + 10 || this.y < -10 || this.y > H + 10) {
      this.alive = false;
    }
  }

  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#00E5FF';
    ctx.fill();

    // Trail
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
    ctx.strokeStyle = 'rgba(0,229,255,0.4)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

// =========================================
// EXPLOSIONS
// =========================================
class Explosion {
  constructor(x, y) {
    this.x    = x;
    this.y    = y;
    this.life = 1.0;
    const colors = ['255,184,0', '255,107,0', '255,45,120', '0,229,255'];
    this.pts = Array.from({ length: 18 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 4,
      size:  1 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }

  update() { this.life -= 0.032; }

  draw() {
    const prog = 1 - this.life;
    this.pts.forEach(p => {
      const px = this.x + Math.cos(p.angle) * p.speed * prog * 30;
      const py = this.y + Math.sin(p.angle) * p.speed * prog * 30;
      ctx.beginPath();
      ctx.arc(px, py, p.size * this.life, 0, Math.PI * 2);
      ctx.shadowColor = `rgba(${p.color},1)`;
      ctx.shadowBlur  = 6;
      ctx.fillStyle   = `rgba(${p.color},${this.life})`;
      ctx.fill();
    });
  }
}

// =========================================
// INTEL POPUP
// =========================================
let popupTimer = null;
function showIntel(text) {
  if (arcadeActive) return; // No intel popups during arcade game
  const popup = document.getElementById('intel-popup');
  document.getElementById('intel-text').textContent = text;
  popup.classList.add('visible');
  clearTimeout(popupTimer);
  popupTimer = setTimeout(() => popup.classList.remove('visible'), 5200);
}

// =========================================
// DAILY QUOTE
// =========================================
const DAILY_QUOTES = [
  { text: "The best time to book a demo is whenever the prospect says they're too busy to talk about it.", attr: "— Field notes" },
  { text: "Salem, Massachusetts: founded 1626, most famous for an event in 1692 that sales reps still use as a metaphor for bad quarters.", attr: "— Local history, abridged" },
  { text: "AI will replace salespeople. AI has been about to replace salespeople for roughly five years now. The salespeople are still here.", attr: "— Ongoing situation" },
  { text: "San Francisco: where everyone is disrupting an industry and also complaining about the rent.", attr: "— City motto, unofficial" },
  { text: "The difference between a pitch and a conversation is who's doing most of the listening.", attr: "— Overheard in a pipeline review" },
  { text: "Business school teaches you frameworks. The first cold call teaches you everything else.", attr: "— Week one, on the job" },
  { text: "Nobody ever closed a deal by explaining their product more slowly.", attr: "— Discovery call debrief" },
  { text: "The CRM will be updated. Eventually. After the deal closes.", attr: "— Universal sales truth" },
  { text: "Magna Cum Laude is Latin for 'please hire me, I did the readings.'", attr: "— Translation, practical edition" },
  { text: "Every startup has a messaging problem. That's not a complaint — it's a business model.", attr: "— Founder logic" },
  { text: "Cold outreach: the art of introducing yourself to strangers and making it their idea to respond.", attr: "— Sequence notes" },
  { text: "San Francisco's fog has a name — Karl. Boston's fog is just called Tuesday.", attr: "— West Coast vs. East Coast, summarized" },
  { text: "A playbook is only as good as the person who wrote it. Ideally they wrote it from the trenches, not the sidelines.", attr: "— Q1 retro" },
  { text: "Sales is the only profession where 'no' is the beginning of the conversation.", attr: "— Objection handling, page one" },
  { text: "The best salespeople don't sell. They help people make decisions they were already thinking about.", attr: "— Close rates, explained" },
  { text: "Quota is a number. Pipeline is a story. Closed revenue is the punchline.", attr: "— End of quarter" },
  { text: "AI messaging doesn't replace human connection. It removes the part where you forget to follow up.", attr: "— Product positioning, honest version" },
  { text: "Business pitch competitions: where you practice explaining your idea to people who could fund it, or at least give you a nice plaque.", attr: "— Competition debrief" },
  { text: "In sales, 'I'll think about it' means one of three things. Experienced reps know which one.", attr: "— Call recording, timestamped" },
  { text: "Disqualifying a deal takes courage. Chasing a bad deal takes stubbornness. Knowing the difference takes experience.", attr: "— Pipeline hygiene" },
  { text: "The In-N-Out hat was a statement. The VP disagreed. The numbers disagreed with the VP.", attr: "— Chapter closed" },
  { text: "Enterprise software demos run on three things: solid discovery, a well-timed follow-up, and WiFi that doesn't fail during screen share.", attr: "— Demo day checklist" },
  { text: "Salem banned Ouija boards until 2001. Now it's the top place in America to buy one. Entrepreneurship comes in many forms.", attr: "— Local economy, rebounded" },
  { text: "The average deal has more stages than a Broadway show and a shorter run time.", attr: "— Sales cycle analysis" },
  { text: "Outbound strategy tip: the goal isn't to sound like a salesperson. The goal is to sound like someone worth talking to.", attr: "— Playbook, chapter one" },
  { text: "From SDR to closing enterprise deals in under two years. The average is 3–4 years. The average is just a number.", attr: "— Performance review" },
  { text: "You can tell a lot about someone's sales philosophy by how they react when a deal goes quiet.", attr: "— Ghost pipeline theory" },
  { text: "An early-stage startup's GTM strategy is 40% research, 20% instinct, and 40% figuring it out after the first call.", attr: "— Go-to-market, real version" },
  { text: "Most people don't buy because of the features. They buy because someone made them feel like they'd be missing out without it.", attr: "— Win/loss analysis" },
  { text: "The Salem witch trials: a cautionary tale about what happens when you let fear drive decision-making. Still relevant in pipeline reviews.", attr: "— History, applied" },
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
// SPAWN INITIAL ASTEROIDS
// =========================================
for (let i = 0; i < 6; i++) asteroids.push(new Asteroid(false));
setInterval(() => {
  if (asteroids.filter(a => a.alive).length < 8) asteroids.push(new Asteroid(true));
}, 2800);

// =========================================
// CLICK TO SHOOT / DIRECT ASTEROID HIT
// =========================================
let canShoot = true;
let arcadeActive = false;
document.addEventListener('click', e => {
  if (e.target.closest('button, a, input, textarea, label, canvas#arcade-canvas')) return;
  if (!canShoot || arcadeActive) return;
  if (!hintHidden) {
    document.getElementById('shoot-hint').classList.add('hidden');
    hintHidden = true;
  }
  // Direct hit: clicking ON an asteroid destroys it immediately
  const clicked = asteroids.find(a => {
    if (!a.alive) return false;
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    return Math.sqrt(dx * dx + dy * dy) < a.size * 1.3;
  });
  if (clicked) {
    clicked.alive = false;
    explosions.push(new Explosion(clicked.x, clicked.y));
    score++;
    document.getElementById('score').textContent = score;
    showIntel(INTEL_FACTS[factIndex++ % INTEL_FACTS.length]);
    setTimeout(() => { clicked.spawn(true); clicked.alive = true; }, 1800);
  } else {
    bullets.push(new Bullet(e.clientX, e.clientY));
  }
});

// =========================================
// MAIN LOOP
// =========================================
function loop() {
  ctx.clearRect(0, 0, W, H);

  drawNebulae();
  updateStars();
  drawStars();

  // Bullets + collision
  bullets = bullets.filter(b => b.alive);
  bullets.forEach(b => {
    b.update();
    b.draw();
    asteroids.forEach(a => {
      if (!a.alive || !b.alive) return;
      if (a.hit(b.x, b.y)) {
        a.alive = b.alive = false;
        explosions.push(new Explosion(a.x, a.y));
        score++;
        document.getElementById('score').textContent = score;
        showIntel(INTEL_FACTS[factIndex++ % INTEL_FACTS.length]);
        setTimeout(() => { a.spawn(true); a.alive = true; }, 1800);
      }
    });
  });

  // Asteroids
  asteroids.forEach(a => { if (a.alive) { a.update(); a.draw(); } });

  // Explosions
  explosions = explosions.filter(e => e.life > 0);
  explosions.forEach(e => { e.update(); e.draw(); });

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

// Fade scroll hint when user scrolls the home screen
const homeScroll = document.querySelector('.home-scroll');
const scrollHint = document.getElementById('scroll-hint');
if (homeScroll && scrollHint) {
  homeScroll.addEventListener('scroll', () => {
    scrollHint.classList.toggle('faded', homeScroll.scrollTop > 40);
  });
}

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
    if      (edge === 0) { this.x = Math.random() * arcW; this.y = -40; }
    else if (edge === 1) { this.x = arcW + 40;            this.y = Math.random() * arcH; }
    else if (edge === 2) { this.x = Math.random() * arcW; this.y = arcH + 40; }
    else                 { this.x = -40;                   this.y = Math.random() * arcH; }
    this.size = 16 + Math.random() * 22;
    const dx = arcW / 2 - this.x + (Math.random() - 0.5) * 200;
    const dy = arcH / 2 - this.y + (Math.random() - 0.5) * 200;
    const d  = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = 1.0 + Math.random() * 1.4;
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
    const spd = 14;
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
    arcCtx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    arcCtx.shadowColor = '#39FF14';
    arcCtx.shadowBlur = 12;
    arcCtx.fillStyle = '#39FF14';
    arcCtx.fill();
    arcCtx.beginPath();
    arcCtx.moveTo(this.x, this.y);
    arcCtx.lineTo(this.x - this.vx * 2.5, this.y - this.vy * 2.5);
    arcCtx.strokeStyle = 'rgba(57,255,20,0.4)';
    arcCtx.lineWidth = 1.5;
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
  const hearts = arcLives > 0 ? '♥ '.repeat(arcLives).trim() : '☆';
  document.getElementById('arcade-lives').textContent = hearts;
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
  arcLives = 3;
  arcHits = 0;
  arcTimeLeft = 30;
  arcInvincible = false;
  arcStarting  = true;  // 2.5s grace period — ship can't be hit at start
  arcKeys      = {};
  setTimeout(() => { arcStarting = false; }, 2500);
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
    if (arcState === 'playing' && arcAsteroids.filter(a => a.alive).length < 8) {
      arcAsteroids.push(new ArcAsteroid());
    }
  }, 2200);

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
        setTimeout(() => { ref.spawn(); ref.alive = true; arcInvincible = false; }, 2000);
        if (arcLives <= 0) { arcEndGame('dead'); return; }
      }
    }
  }

  // Explosions
  arcExplosions = arcExplosions.filter(e => e.life > 0);
  arcExplosions.forEach(e => { e.update(); e.draw(); });

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

  arcCanvas.addEventListener('click', e => {
    if (arcState !== 'playing') return;
    arcBullets.push(new ArcBullet(arcShip.angle));
  });

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

arcInit();

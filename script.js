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
  const popup = document.getElementById('intel-popup');
  document.getElementById('intel-text').textContent = text;
  popup.classList.add('visible');
  clearTimeout(popupTimer);
  popupTimer = setTimeout(() => popup.classList.remove('visible'), 5200);
}

// =========================================
// SPAWN INITIAL ASTEROIDS
// =========================================
for (let i = 0; i < 6; i++) asteroids.push(new Asteroid(false));
setInterval(() => {
  if (asteroids.filter(a => a.alive).length < 8) asteroids.push(new Asteroid(true));
}, 2800);

// =========================================
// CLICK TO SHOOT
// =========================================
let canShoot = true;
document.addEventListener('click', e => {
  if (e.target.closest('button, a, input, textarea, label')) return;
  if (!canShoot) return;
  if (!hintHidden) {
    document.getElementById('shoot-hint').classList.add('hidden');
    hintHidden = true;
  }
  bullets.push(new Bullet(e.clientX, e.clientY));
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

function navigateTo(target) {
  const current = document.querySelector('.screen.active');
  if (!current) return;
  canShoot   = false;
  warpActive = true;

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
    }
    overlay.style.opacity    = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    warpActive = false;
    updateMiniNav(target);
    setTimeout(() => { canShoot = true; }, 350);
  }, 480);
}

// Wire up all nav buttons
document.querySelectorAll('.planet-btn').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.target)));
document.querySelectorAll('.back-btn').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.target)));
document.querySelectorAll('.mnav-btn').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.target)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') navigateTo('home'); });

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

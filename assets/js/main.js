/* ========== anime.js v4 (loaded from a CDN, nothing to install) ========== */
import {
    animate, createAnimatable, createTimeline, createTimer, createDrawable, createLayout, createScope,
    onScroll, splitText, scrambleText, stagger, utils, waapi, engine
} from 'https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.esm.min.js';

window.__animeReady = true;

const preview = document.documentElement.classList.contains('dev');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];


/* ========== Engine: one clock for every anime.js animation ========== */
// Pauses everything when the tab is hidden and resumes from the same frame when you come back.
engine.pauseOnDocumentHidden = true;
// A steady 60 fps is smooth for this site and saves battery on 120 Hz screens.
engine.fps = 60;

// Hardware-accelerated (WAAPI) animations and CSS transitions run outside the engine,
// so they get the same pause and resume treatment here.
const pausedNative = new Set();
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.getAnimations().forEach(a => {
            if (a.playState === 'running') { a.pause(); pausedNative.add(a); }
        });
    } else {
        pausedNative.forEach(a => a.play());
        pausedNative.clear();
    }
});


/* ========== Drafts: removed from the live site (kept in preview mode) ========== */
if (!preview) $$('[data-draft]').forEach(el => el.remove());


/* ========== Image placeholders ========== */
// Real image found: fade it in. Missing on the live site: gallery tiles are removed,
// and a work card is marked "Coming soon" until its thumbnail exists.
const missingImage = img => {
    const tile = img.parentElement;
    img.remove();
    if (preview) return;

    const card = tile.closest('.card:not([data-keep])');
    if (card) {
        card.classList.add('is-soon');
        card.removeAttribute('href');
        card.setAttribute('aria-disabled', 'true');
        const link = $('.link', card);
        if (link) link.textContent = 'Coming soon';
        return;
    }

    const gallery = tile.closest('.gallery');
    if (!gallery) return;
    tile.remove();
    if (!gallery.children.length) {
        const section = gallery.closest('section');
        $(`.toc a[href="#${section.id}"]`)?.remove();
        section.remove();
    }
};

$$('.ph img').forEach(img => {
    if (img.closest('.art')) return;     // gallery images are handled by the gallery below
    const ok = () => img.parentElement.classList.add('has-img');
    if (img.complete) img.naturalWidth ? ok() : missingImage(img);
    else {
        img.addEventListener('load', ok, { once: true });
        img.addEventListener('error', () => missingImage(img), { once: true });
    }
});


/* ========== Footer year ========== */
$$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());


/* ========== Navigation ========== */
const nav = $('.nav');
const toggle = $('.nav-toggle');
const links = $('.nav-links');

toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    links.classList.toggle('is-open', open);
});

links?.addEventListener('click', e => {
    if (!e.target.closest('a')) return;
    toggle.setAttribute('aria-expanded', 'false');
    links.classList.remove('is-open');
});

addEventListener('scroll', () => nav?.classList.toggle('is-scrolled', scrollY > 8), { passive: true });

// Highlight the menu link of the section on screen
const navTargets = $$('.nav-links a[href^="#"]').map(a => [a, $(a.getAttribute('href'))]).filter(([, s]) => s);
if (navTargets.length) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        navTargets.forEach(([a, s]) => a.classList.toggle('is-active', s === e.target));
    }), { rootMargin: '-45% 0px -50% 0px' });
    navTargets.forEach(([, s]) => io.observe(s));
}


/* ========== Starfield background: setup (the twinkle runs in the scope below) ========== */
const canvas = $('#stars');
const ctx = canvas?.getContext('2d');
const tints = ['255,255,255', '255,190,230', '200,180,255', '180,220,255'];
let stars = [], starsW = 0, starsH = 0;

const buildStars = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    starsW = innerWidth;
    starsH = innerHeight;
    canvas.width = starsW * dpr;
    canvas.height = starsH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.min(280, (starsW * starsH / 5500) | 0) }, () => {
        const a = Math.random() ** 2.4 * .85 + .12;     // brightness: most stars faint, a few very bright
        return {
            x: Math.random() * starsW,
            y: Math.random() * starsH,
            r: a * 1.5 + .25,                           // brighter stars are a little bigger
            a,
            s: Math.random() * .0016 + .0004,           // twinkle speed
            g: Math.random() * .0006 + .0002,           // glint speed (a rare sharp flash)
            p: Math.random() * 6.28,                    // offset so they don't twinkle together
            c: tints[(Math.random() * tints.length) | 0],
            bright: a > .6
        };
    });
};

// A shooting star now and then, drawn on the same canvas
let shooter = null, nextShot = performance.now() + 2500;
const drawShooter = now => {
    if (!shooter && now > nextShot) {
        shooter = { x: starsW * (.35 + Math.random() * .7), y: starsH * Math.random() * .45, len: 120 + Math.random() * 160, t0: now };
        nextShot = now + 3000 + Math.random() * 5000;
    }
    if (!shooter) return;
    const k = (now - shooter.t0) / 1100;
    if (k > 1) { shooter = null; return; }
    const hx = shooter.x - 340 * k * .57, hy = shooter.y + 340 * k * .82;   // travels down and to the left
    const tail = shooter.len * Math.min(1, k * 3);
    const g = ctx.createLinearGradient(hx, hy, hx + tail * .57, hy - tail * .82);
    const alpha = Math.sin(k * Math.PI);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(.3, `rgba(170,225,255,${alpha * .6})`);
    g.addColorStop(1, 'rgba(255,160,215,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + tail * .57, hy - tail * .82);
    ctx.stroke();
};

const drawStars = (t, live = false) => {
    ctx.clearRect(0, 0, starsW, starsH);
    for (const s of stars) {
        const tw = .5 + .5 * Math.sin(t * s.s + s.p);
        const glint = Math.max(0, Math.sin(t * s.g + s.p * 2)) ** 24;
        const alpha = Math.min(1, s.a * (.4 + .6 * tw * tw) + glint * .8);
        ctx.fillStyle = `rgba(${s.c},${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fill();

        // Bright stars get a soft halo and a four-point sparkle that flares on each glint
        if (s.bright || glint > .3) {
            ctx.fillStyle = `rgba(${s.c},${alpha * .12})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * 3.5, 0, 6.283);
            ctx.fill();
            const arm = s.r * (3 + 9 * glint);
            ctx.strokeStyle = `rgba(${s.c},${alpha * .7})`;
            ctx.lineWidth = .6;
            ctx.beginPath();
            ctx.moveTo(s.x - arm, s.y); ctx.lineTo(s.x + arm, s.y);
            ctx.moveTo(s.x, s.y - arm); ctx.lineTo(s.x, s.y + arm);
            ctx.stroke();
        }
    }
    if (live) drawShooter(performance.now());
};

if (canvas) {
    buildStars();
    drawStars(0);
    addEventListener('resize', () => { buildStars(); drawStars(0); });
}


/* ========== Scroll meteors: a few long-tailed meteors behind the page (animated in the scope below) ========== */
const meteorTints = ['170,225,255', '255,160,215', '195,170,255', '255,255,255'];
let skyLayer = null;
if (canvas && document.documentElement.scrollHeight > innerHeight * 1.6) {
    skyLayer = document.createElement('div');
    skyLayer.className = 'sky';
    skyLayer.setAttribute('aria-hidden', 'true');
    skyLayer.innerHTML = meteorTints.concat(meteorTints, meteorTints).slice(0, 10)
        .map(c => `<i class="meteor" style="--tint:${c};--len:${(160 + Math.random() * 220) | 0}px"><b></b></i>`).join('');
    canvas.after(skyLayer);

    // Scroll progress comet (right edge). It grows as you read, breaks through the cloud bank
    // that hides the footer, then crashes into the bottom of the page.
    document.body.insertAdjacentHTML('beforeend', `
        <div class="comet-track" aria-hidden="true"><div class="comet"><i class="comet-tail"></i><i class="comet-head"></i><i class="comet-ring"></i></div></div>
        <div class="cloud-flash" aria-hidden="true"></div>`);

    // Cloud bank over the footer: a back layer, and a front layer in two halves that part
    const footer = $('.footer');
    if (footer) {
        const puffs = (n, from, to) => Array.from({ length: n }, (_, i) => {
            const w = 24 + Math.random() * 20;
            const left = from + (to - from) * (i / (n - 1 || 1)) - w / 2 + Math.random() * 6 - 3;
            return `<i style="left:${left.toFixed(1)}%;width:${w.toFixed(1)}%;top:${(Math.random() * 40) | 0}px"></i>`;
        }).join('');
        footer.insertAdjacentHTML('afterbegin', `
            <div class="footer-sky" aria-hidden="true">
                <div class="clouds clouds-back">${puffs(7, -4, 104)}</div>
                <div class="clouds clouds-front">
                    <div class="cloud-half">${puffs(4, -6, 46)}<b class="cloud-base"></b></div>
                    <div class="cloud-half">${puffs(4, 54, 106)}<b class="cloud-base"></b></div>
                    <b class="cloud-glow"></b>
                </div>
            </div>`);
    }
}


/* ========== Meteor shower: page transitions and the startup intro (home page, on load or refresh) ========== */
// The small script in each page's <head> adds pt-arrive (came here through a site link) or pt-intro
// (home page opened or refreshed). Both cover the page until the shower below takes over.
const root = document.documentElement;
let skyGo;
const skyReady = new Promise(r => skyGo = r);     // the page's own entrance waits for this

// A full-screen night sky (CSS gradient + canvas) that sits above the page while it plays
const makeWarp = (extra = '') => {
    const warp = document.createElement('div');
    warp.className = 'warp ' + extra;
    warp.setAttribute('aria-hidden', 'true');
    const cv = document.createElement('canvas');
    warp.append(cv);
    document.body.append(warp);

    const c = cv.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const fall = 2.2;                                  // direction of travel: down and to the left
    const bg = Array.from({ length: 150 }, () => ({
        x: Math.random() * W, y: Math.random() * H * .85,
        r: Math.random() * 1.3 + .2, a: Math.random() ** 2 * .9 + .1, p: Math.random() * 6.28
    }));
    const meteors = [];
    const state = { rate: 0, draw: null };            // rate = new meteors per second (animated by anime.js)
    let last = performance.now(), carry = 0;

    // One glowing streak: bright white head, blue then pink tail (like the comet in Your Name)
    const streak = (x, y, angle, len, width, tint, alpha) => {
        const tx = x - Math.cos(angle) * len, ty = y - Math.sin(angle) * len;
        const g = c.createLinearGradient(x, y, tx, ty);
        g.addColorStop(0, `rgba(255,255,255,${alpha})`);
        g.addColorStop(.25, `rgba(${tint},${alpha * .75})`);
        g.addColorStop(1, `rgba(${tint},0)`);
        c.strokeStyle = g;
        c.lineWidth = width;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(tx, ty);
        c.stroke();
    };

    const frame = () => {
        const now = performance.now(), dt = Math.min(50, now - last);
        last = now;
        c.clearRect(0, 0, W, H);
        for (const s of bg) {
            c.fillStyle = `rgba(255,255,255,${s.a * (.55 + .45 * Math.sin(now * .003 + s.p))})`;
            c.beginPath();
            c.arc(s.x, s.y, s.r, 0, 6.283);
            c.fill();
        }
        carry += state.rate * dt / 1000;
        for (; carry >= 1; carry--) meteors.push({
            x: W * (.15 + Math.random() * 1.1), y: H * (Math.random() * .8 - .35),
            len: 90 + Math.random() * 230, v: .9 + Math.random() * 1.1, w: 1 + Math.random() * 1.4,
            tint: meteorTints[(Math.random() * 4) | 0], life: 0
        });
        c.globalCompositeOperation = 'lighter';
        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            m.x += Math.cos(fall) * m.v * dt;
            m.y += Math.sin(fall) * m.v * dt;
            m.life += dt;
            streak(m.x, m.y, fall, m.len * Math.min(1, m.life / 250), m.w, m.tint, .9);
            if (m.x < -m.len || m.y > H + m.len) meteors.splice(i, 1);
        }
        state.draw?.(c, streak);
        c.globalCompositeOperation = 'source-over';
    };
    const timer = createTimer({ loop: true, onUpdate: frame });

    return { warp, state, W, H, fall, done: () => { timer.cancel(); warp.remove(); } };
};

// Leaving: links to another page of the site play the shower first, then go
let leaving = false;
const leave = url => {
    if (leaving) return;
    leaving = true;
    try { sessionStorage.setItem('pt', '1'); } catch {}
    const sky = makeWarp();
    sky.warp.style.opacity = 0;
    waapi.animate(sky.warp, { opacity: [0, 1], duration: 450, ease: 'inQuad' });
    animate(sky.state, { rate: 70, duration: 400, ease: 'outQuad' });
    setTimeout(() => location.href = url, 650);
};

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    const page = path => path.replace(/index\.html$/, '');
    if (url.origin !== location.origin || page(url.pathname) === page(location.pathname)) return;   // other sites and same-page jumps work as usual
    e.preventDefault();
    leave(url.href);
});

// Coming back with the browser's Back button can restore the page mid-transition: clear it
addEventListener('pageshow', e => {
    if (!e.persisted) return;
    $$('.warp').forEach(w => w.remove());
    leaving = false;
});

// Arriving: the shower thins out and the night sky fades away to show the page
const arrive = () => {
    const sky = makeWarp();
    sky.state.rate = 45;
    root.classList.remove('pt-arrive');
    animate(sky.state, { rate: 0, duration: 900, ease: 'outQuad' });
    setTimeout(skyGo, 120);
    waapi.animate(sky.warp, { opacity: [1, 0], duration: 800, delay: 150, ease: 'inOutQuad' }).then(sky.done);
};

// Startup intro (home page): a comet streaks across the sky and splits in two, a meteor shower
// follows, the Needron logo appears, then the sky lifts away. Click, tap or any key skips it.
const intro = () => {
    const sky = makeWarp('is-intro');
    root.classList.remove('pt-intro');
    const { W, H, state, warp } = sky;

    const brand = document.createElement('div');
    brand.className = 'intro-brand';
    brand.innerHTML = `<img src="${$('.brand img')?.src || ''}" alt=""><span class="intro-name">Needron</span><span class="intro-tag">programmer · illustrator</span>`;
    const hint = document.createElement('span');
    hint.className = 'intro-skip';
    hint.textContent = 'Tap or click to skip';
    warp.append(brand, hint);
    const [logo, name, tag] = brand.children;
    utils.set([brand, tag, hint], { opacity: 0 });
    name.textContent = '';

    // The comet: travels from the top right corner; at 45% of the way a fragment breaks off
    // Aimed at the bottom left corner, so it crosses the whole screen on phones too
    const start = [W * 1.05, -H * .08], reach = Math.hypot(W * 1.15, H * 1.08);
    const path = Math.min(sky.fall + .25, Math.atan2(H * 1.08, -W * 1.15));
    const comet = { p: 0, len: 0 }, frag = { p: 0, on: false, x: 0, y: 0 }, burst = { r: 0, a: 0 };
    // Hand-off: at the end a small comet flies from the logo to the top of the scroll progress track
    const dock = $('.comet-track')?.getBoundingClientRect();
    const hand = { p: 0, on: false, from: [W / 2, H / 2 - 40], to: dock ? [dock.left, dock.top] : [W - 30, 96] };
    const pos = (p, angle, from = start, dist = reach) => [from[0] + Math.cos(angle) * dist * p, from[1] + Math.sin(angle) * dist * p];
    const drawComet = (c, x, y, angle, len, size, streak) => {
        streak(x, y, angle, len * 1.1, 14 * size, '120,190,255', .18);       // wide soft glow
        streak(x, y, angle, len, 5 * size, '170,225,255', .5);
        streak(x, y, angle, len * .8, 2 * size, '255,160,215', 1);          // bright core
        const g = c.createRadialGradient(x, y, 0, x, y, 26 * size);
        g.addColorStop(0, 'rgba(255,255,255,.95)');
        g.addColorStop(1, 'rgba(170,225,255,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, 26 * size, 0, 6.283);
        c.fill();
    };
    state.draw = (c, streak) => {
        if (comet.p > 0 && comet.p < 1) {
            const [x, y] = pos(comet.p, path);
            drawComet(c, x, y, path, comet.len, 1, streak);
            if (!frag.on && comet.p > .45) {
                frag.on = true;
                frag.x = x; frag.y = y;
                animate(frag, { p: [0, 1], duration: 1500, ease: 'in(1.4)' });
                animate(burst, { r: [0, 140], a: [.9, 0], duration: 900, ease: 'outQuart' });
            }
        }
        if (frag.on && frag.p < 1) {
            const [x, y] = pos(frag.p, path + .2, [frag.x, frag.y], reach * .6);
            drawComet(c, x, y, path + .2, comet.len * .55, .6, streak);
        }
        if (hand.on && hand.p < 1) {
            const angle = Math.atan2(hand.to[1] - hand.from[1], hand.to[0] - hand.from[0]);
            const x = hand.from[0] + (hand.to[0] - hand.from[0]) * hand.p;
            const y = hand.from[1] + (hand.to[1] - hand.from[1]) * hand.p;
            drawComet(c, x, y, angle, 60 + 180 * Math.sin(hand.p * Math.PI), .55, streak);
        }
        if (burst.a > 0) {
            const g = c.createRadialGradient(frag.x, frag.y, 0, frag.x, frag.y, burst.r);
            g.addColorStop(0, `rgba(255,220,240,${burst.a})`);
            g.addColorStop(1, 'rgba(255,160,215,0)');
            c.fillStyle = g;
            c.beginPath();
            c.arc(frag.x, frag.y, burst.r, 0, 6.283);
            c.fill();
        }
    };

    let lifted = false;
    const lift = () => {
        if (lifted) return;
        lifted = true;
        tl.pause();
        animate(state, { rate: 0, duration: 500 });
        waapi.animate(brand, { opacity: 0, scale: 1.06, duration: 400, ease: 'inQuad' });
        // The comet docks at the scroll track, then the sky fades and the page's own comet takes over
        hand.on = true;
        animate(hand, { p: [0, 1], duration: dock ? 750 : 1, ease: 'inOutQuad' });
        setTimeout(skyGo, dock ? 600 : 0);
        waapi.animate(warp, { opacity: [1, 0], duration: 800, delay: dock ? 550 : 150, ease: 'inOutQuad' }).then(sky.done);
    };

    const tl = createTimeline()
        .add(hint, { opacity: [0, 1], duration: 600 }, 300)
        .add(comet, { p: [0, 1], duration: 2300, ease: 'in(1.5)' }, 150)
        .add(comet, { len: [0, Math.min(520, W * .45)], duration: 1000, ease: 'outQuad' }, 150)
        .add(state, { rate: [0, 30], duration: 1000, ease: 'inQuad' }, 900)
        .add(brand, { opacity: [0, 1], duration: 700, ease: 'outQuart' }, 1350)
        .add(logo, { scale: [.6, 1], rotate: [-12, 0], duration: 1100, ease: 'outElastic(1, .6)' }, 1350)
        .add(name, { innerHTML: scrambleText({ text: 'Needron', chars: 'a-z', cursor: '_' }), duration: 900 }, 1450)
        .add(tag, { opacity: [0, 1], y: [8, 0], duration: 600, ease: 'outQuart' }, 2000)
        .add(state, { rate: 8, duration: 800, ease: 'outQuad' }, 2600)
        .call(lift, 3300);

    ['pointerdown', 'keydown', 'wheel'].forEach(type => addEventListener(type, lift, { once: true }));
    setTimeout(lift, 6000);                           // safety net
};

try {
    if (root.classList.contains('pt-arrive')) arrive();
    else if (root.classList.contains('pt-intro')) intro();
    else skyGo();
} catch (err) {
    // Never leave the page covered if something goes wrong
    $$('.warp').forEach(w => w.remove());
    root.classList.remove('pt-arrive', 'pt-intro');
    skyGo();
}


/* ========== Hero orbit: setup (the movement runs in the scope below) ========== */
const orbit = $('.orbit');
const rings = [
    { rx: .47, ry: .16, tilt: -24, speed: 18000, phase: 0 },    // ring 1: code chip
    { rx: .43, ry: .2, tilt: 32, speed: 24000, phase: 2.2 }      // ring 2: art chip
];

// Point on a tilted ellipse, as a fraction of the orbit box (0 to 1)
const ringPoint = (ring, angle) => {
    const x = ring.rx * Math.cos(angle);
    const y = ring.ry * Math.sin(angle);
    const t = ring.tilt * Math.PI / 180;
    return [.5 + x * Math.cos(t) - y * Math.sin(t), .5 + x * Math.sin(t) + y * Math.cos(t)];
};

// Move the chips; they pass behind the photo on the far side of the ring
const placeSatellites = time => $$('.satellite', orbit).forEach(sat => {
    const ring = rings[sat.dataset.ring - 1];
    const angle = ring.phase + time / ring.speed * Math.PI * 2;
    const [x, y] = ringPoint(ring, angle);
    const behind = Math.sin(angle) < 0;
    sat.style.transform = `translate(${x * orbit.offsetWidth}px, ${y * orbit.offsetHeight}px) scale(${behind ? .85 : 1})`;
    sat.style.zIndex = behind ? 0 : 2;
    sat.style.opacity = behind ? .55 : 1;
});

if (orbit) {
    // Draw each ring as an SVG path (viewBox is 400 × 400)
    rings.forEach((ring, i) => {
        let d = '';
        for (let k = 0; k <= 96; k++) {
            const [x, y] = ringPoint(ring, k / 96 * Math.PI * 2);
            d += (k ? 'L' : 'M') + (x * 400).toFixed(1) + ' ' + (y * 400).toFixed(1);
        }
        $('#ring-' + (i + 1)).setAttribute('d', d + 'Z');
    });
    $('.planet', orbit).style.zIndex = 1;
    placeSatellites(0);
    addEventListener('resize', () => placeSatellites(0));
}


/* ========== Meteor crash: the progress comet hits the bottom of the page and the footer blows apart ========== */
// Runs when you reach the very end of the page. The comet swells, slams into the ground, and the footer's own
// letters and logo are the debris: split up (anime.js splitText), blasted away from the impact with a fireball,
// shock rings, sparks, rocks and a dust cloud (drawn on a canvas), then rewound back into place.
function meteorCrash(done) {
    const footer = $('.footer'), track = $('.comet-track'), head = $('.comet-head');
    const W = root.clientWidth, H = innerHeight, big = Math.hypot(W, H);
    const fr = footer.getBoundingClientRect(), hr = head.getBoundingClientRect();
    const sx = hr.left + hr.width / 2, sy = hr.top + hr.height / 2;

    // It falls along its tail, down and to the left, into the floor of the page
    const tilt = (utils.get($('.comet'), 'rotate', false) || 0) - 5;
    const dirX = -Math.sin(tilt * Math.PI / 180), dirY = Math.cos(tilt * Math.PI / 180);
    const iy = Math.min(H, fr.bottom) - 22;
    const reach = Math.max(40, (iy - sy) / Math.max(dirY, .3));
    const ix = utils.clamp(sx + dirX * reach, 40, W - 40);

    // Canvas over the last screen of the page, so it scrolls with the footer
    const cv = document.createElement('canvas');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.className = 'impact';
    cv.setAttribute('aria-hidden', 'true');
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.cssText = `top:${scrollY}px;width:${W}px;height:${H}px`;
    document.body.append(cv);
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    track.classList.add('crashed');

    // Debris: every letter in the footer, and the wordmark cut into triangles
    const splits = $$('p, h2, li, .footer-bottom > *', footer)
        .map(el => splitText(el, { words: { class: 'debris-word' }, chars: { class: 'debris' } }));
    const pieces = $$('.debris', footer).map(el => {
        const r = el.getBoundingClientRect();
        return { el, x: r.left + r.width / 2, y: r.top + r.height / 2, heavy: false };
    });
    const logo = $('.footer-wordmark', footer);
    const shards = [];
    if (logo) {
        const r = logo.getBoundingClientRect(), cols = 4, rows = 2;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) for (const k of [0, 1]) {
            const [x0, x1, y0, y1] = [i / cols, (i + 1) / cols, j / rows, (j + 1) / rows].map(v => v * 100);
            const pts = k ? [[x0, y0], [x1, y0], [x1, y1]] : [[x0, y0], [x0, y1], [x1, y1]];
            const cx = pts.reduce((a, p) => a + p[0], 0) / 3, cy = pts.reduce((a, p) => a + p[1], 0) / 3;
            const el = logo.cloneNode();
            el.className = 'logo-shard';
            el.alt = '';
            el.style.cssText = `left:${r.left - fr.left - footer.clientLeft}px;top:${r.top - fr.top - footer.clientTop}px;` +
                `width:${r.width}px;height:${r.height}px;transform-origin:${cx}% ${cy}%;` +
                `clip-path:polygon(${pts.map(p => p[0] + '% ' + p[1] + '%').join(',')})`;
            footer.append(el);
            shards.push({ el, x: r.left + r.width * cx / 100, y: r.top + r.height * cy / 100, heavy: true });
        }
        logo.style.visibility = 'hidden';
    }

    // Each piece flies up and away from the impact: harder the closer it was, then gravity pulls it back
    // (never below the bottom of the page, so the page doesn't grow)
    const fling = p => {
        const dx = p.x - ix, dy = p.y - iy, d = Math.hypot(dx, dy) || 1;
        const power = utils.clamp(1.2 - d / (W * .8), .2, 1);
        let ux = dx / d, uy = Math.min(dy / d, -.2) - .45;
        const n = Math.hypot(ux, uy);
        ux /= n;
        uy /= n;
        const v = (p.heavy ? 380 : 560) * power * utils.random(.7, 1.3, 2);
        p.tx = ux * v;
        p.ty = uy * v;
        p.fall = utils.clamp(H - 14 - (p.y + p.ty), 0, utils.random(80, 320));
        p.spin = utils.random(-1, 1, 2) * (p.heavy ? 160 : 720);
        p.wait = d / big * 260;          // the shock wave reaches far pieces a little later
        p.burnt = d < 70;                // right at the impact: vaporised
    };
    const all = pieces.concat(shards);
    all.forEach(fling);

    // What the canvas draws, driven by the timeline below
    const s = { charge: 0, dive: 0, flash: 0, fire: 0, ring: 0, ring2: 0, rays: 0, glow: 0, hit: false };
    const sparks = [], rocks = [], dust = [], embers = [], rays = [];
    const R = (a, b) => a + Math.random() * (b - a);

    function boom() {
        s.hit = true;
        footer.classList.add('scorched');
        for (let i = 0; i < 200; i++) {
            const a = -Math.PI * R(.03, .97), v = R(240, 1350);
            sparks.push({ x: ix, y: iy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: R(.5, 1.7), w: R(1, 2.8), blue: Math.random() < .4 });
        }
        for (let i = 0; i < 46; i++) {
            const a = -Math.PI * R(.05, .95), v = R(200, 900), size = R(4, 15), sides = 3 + (Math.random() * 3 | 0);
            const pts = Array.from({ length: sides }, (_, k) => {
                const t = k / sides * Math.PI * 2;
                return [Math.cos(t) * size * R(.5, 1.2), Math.sin(t) * size * R(.5, 1.2)];
            });
            rocks.push({ x: ix, y: iy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: R(0, 6), vr: R(-12, 12), pts, t: 0, life: R(1.2, 2.2) });
        }
        // Dust: a ring rolling out along the ground, and a column that rises and spreads into a mushroom cap
        for (let i = 0; i < 16; i++) {
            const side = i % 2 ? 1 : -1;
            dust.push({ x: ix, y: iy - R(0, 20), vx: side * R(160, 760), vy: -R(10, 70), r: R(26, 50), gr: R(60, 130), t: 0, life: R(2.4, 3.6), up: 6 });
        }
        for (let i = 0; i < 14; i++) {
            dust.push({ x: ix + R(-30, 30), y: iy - R(0, 30), vx: R(-70, 70), vy: -R(160, 460), r: R(30, 52), gr: R(50, 110), t: 0, life: R(2.8, 3.8), up: 30 });
        }
        for (let i = 0; i < 70; i++) {
            embers.push({ x: ix + R(-60, 60), y: iy - R(0, 40), vx: R(-160, 160), vy: -R(40, 260), t: 0, life: R(1.6, 3.4), r: R(.8, 2.2), ph: R(0, 6) });
        }
        for (let i = 0; i < 16; i++) rays.push({ a: -Math.PI * R(.04, .96), len: R(.35, 1), w: R(6, 22) });

        // The page shakes (everything except the fixed layers)
        animate($$('main, .footer'), {
            x: [0, -12, 10, -8, 6, -4, 2, 0],
            y: [0, 7, -9, 6, -4, 3, -1, 0],
            duration: 620,
            ease: 'linear',
            onComplete: () => $$('main, .footer').forEach(el => el.style.transform = '')
        });
    }

    // One streak of light, as in the rest of the site: white head, blue then pink tail
    function meteor(x, y, len, width, glow) {
        const tx = x - dirX * len, ty = y - dirY * len;
        const g = c.createLinearGradient(x, y, tx, ty);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(.25, 'rgba(170,225,255,.7)');
        g.addColorStop(.65, 'rgba(255,160,215,.3)');
        g.addColorStop(1, 'rgba(255,160,215,0)');
        c.strokeStyle = g;
        c.lineWidth = width;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(tx, ty);
        c.stroke();
        const h = c.createRadialGradient(x, y, 0, x, y, glow);
        h.addColorStop(0, 'rgba(255,255,255,1)');
        h.addColorStop(.3, 'rgba(200,235,255,.75)');
        h.addColorStop(.6, 'rgba(255,170,220,.25)');
        h.addColorStop(1, 'rgba(255,170,220,0)');
        c.fillStyle = h;
        c.beginPath();
        c.arc(x, y, glow, 0, 7);
        c.fill();
    }

    function blob(x, y, r, stops) {
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        stops.forEach(([at, col]) => g.addColorStop(at, col));
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, 7);
        c.fill();
    }

    let last = performance.now();
    function draw() {
        const now = performance.now(), dt = Math.min((now - last) / 1000, .05);
        last = now;
        c.clearRect(0, 0, W, H);
        c.globalCompositeOperation = 'lighter';

        // Before the hit: the comet swells, then falls the last stretch
        if (!s.hit) {
            const x = sx + (ix - sx) * s.dive, y = sy + (iy - sy) * s.dive;
            meteor(x, y, 340 + 160 * s.charge + 420 * s.dive, 5 + 6 * s.charge + 6 * s.dive, 22 + 26 * s.charge + 30 * s.dive);
            return;
        }

        // Glowing crater
        if (s.glow > .01) {
            c.save();
            c.translate(ix, iy);
            c.scale(1, .45);
            blob(0, 0, 320, [[0, `rgba(255,170,90,${.75 * s.glow})`], [.35, `rgba(255,90,50,${.4 * s.glow})`], [1, 'rgba(160,30,40,0)']]);
            c.restore();
        }

        // Dust: dark red-brown, lit orange from below while it's fresh
        c.globalCompositeOperation = 'source-over';
        for (const d of dust) {
            d.t += dt;
            if (d.t > d.life) continue;
            const k = d.t / d.life, drag = Math.exp(-1.8 * dt);
            d.vx *= drag;
            d.vy = d.vy * drag - d.up * dt;
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.r += d.gr * dt;
            const a = Math.min(1, d.t * 6) * (1 - k) ** 1.3 * .5, hot = (1 - k) ** 4;
            const col = [110 + 145 * hot, 46 + 90 * hot, 52 + 20 * hot].map(v => v | 0).join(',');
            blob(d.x, d.y, d.r, [[0, `rgba(${col},${a})`], [.6, `rgba(${col},${a * .55})`], [1, `rgba(${col},0)`]]);
        }
        c.globalCompositeOperation = 'lighter';

        // Fireball, squashed against the ground
        if (s.fire > .01) {
            c.save();
            c.translate(ix, iy);
            c.scale(1, .62);
            blob(0, 0, s.fire * Math.min(W * .42, H * .9), [
                [0, `rgba(255,255,255,${s.fire})`], [.18, `rgba(255,244,210,${s.fire})`],
                [.42, `rgba(255,160,70,${.85 * s.fire})`], [.7, `rgba(230,70,50,${.4 * s.fire})`], [1, 'rgba(160,30,60,0)']
            ]);
            c.restore();
        }

        // Light rays bursting out of the impact
        if (s.rays > .01) {
            for (const r of rays) {
                const L = big * .6 * r.len * (.5 + .5 * (1 - s.rays));
                const ex = ix + Math.cos(r.a) * L, ey = iy + Math.sin(r.a) * L;
                const nx = -Math.sin(r.a) * r.w, ny = Math.cos(r.a) * r.w;
                const g = c.createLinearGradient(ix, iy, ex, ey);
                g.addColorStop(0, `rgba(255,240,220,${.7 * s.rays})`);
                g.addColorStop(1, 'rgba(255,170,120,0)');
                c.fillStyle = g;
                c.beginPath();
                c.moveTo(ix + nx, iy + ny);
                c.lineTo(ex, ey);
                c.lineTo(ix - nx, iy - ny);
                c.fill();
            }
        }

        // Shock rings rolling out across the ground
        for (const [p, col, w] of [[s.ring, '255,230,200', 16], [s.ring2, '255,130,90', 10]]) {
            if (p <= 0 || p >= 1) continue;
            c.strokeStyle = `rgba(${col},${(1 - p) ** 1.4})`;
            c.lineWidth = 2 + w * (1 - p);
            c.beginPath();
            c.ellipse(ix, iy, p * big * .8, p * big * .8 * .2, 0, 0, 7);
            c.stroke();
        }

        // Sparks: short streaks along their path, blue and orange like the film
        for (const p of sparks) {
            p.t += dt;
            if (p.t > p.life) continue;
            p.vy += 900 * dt;
            p.vx *= Math.exp(-.8 * dt);
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            const a = (1 - p.t / p.life) ** 1.2;
            c.strokeStyle = p.blue ? `rgba(150,170,255,${a})` : `rgba(255,${190 + (p.w * 20 | 0)},120,${a})`;
            c.lineWidth = p.w;
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.lineTo(p.x - p.vx * .035, p.y - p.vy * .035);
            c.stroke();
        }

        // Embers: blue specks floating up and twinkling
        for (const e of embers) {
            e.t += dt;
            if (e.t > e.life) continue;
            e.vx *= Math.exp(-1.2 * dt);
            e.vy = e.vy * Math.exp(-.9 * dt) - 14 * dt;
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            const a = (1 - e.t / e.life) * (.55 + .45 * Math.sin(e.t * 14 + e.ph));
            c.fillStyle = `rgba(140,160,255,${a})`;
            c.beginPath();
            c.arc(e.x, e.y, e.r, 0, 7);
            c.fill();
        }

        // Rocks: dark shards with a hot rim, tumbling
        c.globalCompositeOperation = 'source-over';
        for (const r of rocks) {
            r.t += dt;
            if (r.t > r.life) continue;
            r.vy += 1100 * dt;
            r.x += r.vx * dt;
            r.y += r.vy * dt;
            r.rot += r.vr * dt;
            c.save();
            c.translate(r.x, r.y);
            c.rotate(r.rot);
            c.globalAlpha = Math.min(1, (r.life - r.t) * 3);
            c.fillStyle = '#1a1018';
            c.strokeStyle = 'rgba(255,150,80,.9)';
            c.lineWidth = 1.5;
            c.beginPath();
            r.pts.forEach(([px, py], k) => k ? c.lineTo(px, py) : c.moveTo(px, py));
            c.closePath();
            c.fill();
            c.stroke();
            c.restore();
        }
        c.globalAlpha = 1;

        // White-out flash
        if (s.flash > .01) {
            c.fillStyle = `rgba(255,246,236,${.9 * s.flash})`;
            c.fillRect(0, 0, W, H);
        }
    }

    const loop = createTimer({ loop: true, onUpdate: draw });
    const HIT = 380;
    const tl = createTimeline({ onComplete: finish })
        .add(s, { charge: [0, 1], duration: 240, ease: 'inOutSine' }, 0)
        .add(s, { dive: [0, 1], duration: 140, ease: 'in(3)' }, 240)
        .call(boom, HIT)
        .add(s, { flash: [{ to: 1, duration: 40 }, { to: 0, duration: 650, ease: 'outQuad' }] }, HIT)
        .add(s, { fire: [{ to: 1, duration: 260, ease: 'outCubic' }, { to: 0, duration: 1500, ease: 'inQuad' }] }, HIT)
        .add(s, { rays: [{ to: 1, duration: 90 }, { to: 0, duration: 900, ease: 'outQuad' }] }, HIT)
        .add(s, { ring: [0, 1], duration: 1100, ease: 'outCubic' }, HIT)
        .add(s, { ring2: [0, 1], duration: 1500, ease: 'outCubic' }, HIT + 110)
        .add(s, { glow: [{ to: 1, duration: 120 }, { to: 0, duration: 3200, ease: 'inOutSine' }] }, HIT);

    // Blast: each piece flies on its own arc
    all.forEach(p => tl.add(p.el, {
        x: [{ to: p.tx, duration: 700, ease: 'outCubic' }, { to: p.tx * 1.15, duration: 1100, ease: 'linear' }],
        y: [{ to: p.ty, duration: 700, ease: 'outCubic' }, { to: p.ty + p.fall, duration: 1100, ease: 'inQuad' }],
        rotate: { to: p.spin, duration: 1800, ease: 'outQuart' },
        opacity: p.burnt ? { to: 0, duration: 260 } : { to: 1, duration: 1 }
    }, HIT + p.wait));

    // Rewind: every piece is pulled back into place, then the letters cool down
    tl.add(all.map(p => p.el), {
        x: 0,
        y: 0,
        rotate: 0,
        opacity: 1,
        duration: 1000,
        ease: 'inOut(4)',
        delay: () => utils.random(0, 500)
    }, HIT + 2500)
        .call(() => footer.classList.remove('scorched'), HIT + 3100)
        .call(() => {}, HIT + 4300);

    function finish() {
        loop.cancel();
        cv.remove();
        shards.forEach(p => p.el.remove());
        logo?.style.removeProperty('visibility');
        splits.forEach(sp => sp.revert());
        done();
    }
}


/* ========== Motion scope ========== */
// Everything that moves lives in one anime.js scope.
// - add():     looping motion. Re-runs when "reduce motion" or the screen width changes;
//              keepTime() makes the loops continue from where they were.
// - addOnce(): entrances that play once per visit, so a re-run never hides content again.
// It starts once the page transition or startup intro has cleared (skyReady).
const ease = 'outQuart';
const reveal = { opacity: [0, 1], y: [16, 0], duration: 700, ease };

skyReady.then(() => createScope({
    mediaQueries: {
        reduce: '(prefers-reduced-motion: reduce)',
        wide: '(min-width: 901px)'
    }
}).add(self => {
    const { reduce, wide } = self.matches;
    let stopCrash;

    /* ----- Starfield twinkle and orbit (always on, frozen for reduced motion) ----- */
    if (!reduce) {
        if (canvas) self.keepTime(() => createTimer({ loop: true, onUpdate: t => drawStars(t.currentTime, true) }));
        if (orbit) self.keepTime(() => createTimer({ loop: true, onUpdate: t => placeSatellites(t.currentTime) }));
    }

    if (reduce) return;


    /* ----- Scroll meteors: they fall as you scroll (anime.js onScroll, synced to the scrollbar) ----- */
    // Each meteor's trail grows in, shines, and fades out along its path; a light sweeps along every trail on a loop.
    if (skyLayer) {
        const shown = $$('.meteor', skyLayer).slice(0, wide ? 10 : 5);
        const W = innerWidth, H = innerHeight, travel = Math.hypot(W, H) * .75;
        const dx = Math.cos(2.2) * travel, dy = Math.sin(2.2) * travel;
        const fall = createTimeline({
            autoplay: onScroll({ target: document.body, enter: 'start start', leave: 'end end', sync: .3 })
        });
        shown.forEach((m, i) => {
            const x = W * (.3 + Math.random() * .85), y = H * (Math.random() * .5 - .25);
            const at = i * 700;
            fall.add(m, { x: [x, x + dx], y: [y, y + dy], duration: 2400, ease: 'in(1.4)' }, at)
                .add(m.firstChild, { scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0], duration: 2400, ease: 'linear' }, at);
        });
        animate(shown.map(m => m.firstChild), {
            '--sweep': ['120%', '-120%'],
            duration: () => utils.random(900, 1600),
            delay: stagger(160),
            ease: 'linear',
            loop: true
        });
    }


    /* ----- Scroll progress comet: travels down the right edge as you read, growing as it falls ----- */
    // When the footer comes up, the comet dives into the clouds covering it, lights them from inside and
    // breaks through. They part to reveal the footer while the comet swings toward the middle of the page.
    // Everything here is synced to the scrollbar (anime.js onScroll), so it rewinds when you scroll back up.
    const track = $('.comet-track');
    if (track) {
        const H = track.clientHeight;
        const comet = $('.comet'), head = $('.comet-head'), tail = $('.comet-tail');
        createTimeline({
            defaults: { ease: 'linear' },
            autoplay: onScroll({ target: document.body, enter: 'start start', leave: 'end end', sync: .25 })
        })
            .add(comet, { y: [0, H], x: [0, -14], duration: 1000, ease: 'in(1.3)' }, 0)
            .add(comet, { scale: [1, 2.4], duration: 1000, ease: 'in(4)' }, 0)
            .add(tail, { height: [36, 150], duration: 1000, ease: 'in(2)' }, 0);

        const footer = $('.footer'), sky = $('.footer-sky');
        if (footer && sky) {
            const [back, front] = $$('.clouds', sky);
            const [left, right] = $$('.cloud-half', front);
            const glow = $('.cloud-glow', sky);
            const swing = () => track.getBoundingClientRect().left - root.clientWidth * .56;
            createTimeline({
                defaults: { ease: 'linear' },
                autoplay: onScroll({ target: footer, enter: 'end start', leave: 'end end', sync: .25 })
            })
                .add(back, { y: ['45%', '0%'], duration: 380, ease: 'outQuad' }, 0)
                .add(glow, { opacity: [0, 1], scale: [.4, 1.25], duration: 260, ease: 'inQuad' }, 300)
                .add(head, { scale: [1, 1.6], duration: 260, ease: 'inQuad' }, 300)
                .add(left, { x: ['0%', '-72%'], opacity: [1, 0], duration: 220, ease: 'inQuad' }, 560)
                .add(right, { x: ['0%', '72%'], opacity: [1, 0], duration: 220, ease: 'inQuad' }, 560)
                .add(back, { opacity: [1, 0], duration: 260 }, 560)
                .add(glow, { opacity: [1, 0], duration: 200 }, 600)
                .add('.cloud-flash', { opacity: [0, 1, 0], duration: 220 }, 560)
                .add('.comet-ring', { scale: [.2, 4], opacity: [1, 0], duration: 220, ease: 'outQuad' }, 560)
                .add(track, { x: [0, () => -swing()], duration: 440, ease: 'inOutSine' }, 560)
                .add(comet, { rotate: [0, 55], duration: 300, ease: 'outQuad' }, 560);

            // At the very bottom of the page the comet crashes (once, until you scroll back up a bit)
            let armed = true, busy = false;
            const check = () => {
                if (busy) return;
                const gap = root.scrollHeight - innerHeight - scrollY;
                if (armed && gap <= 2) {
                    armed = false;
                    busy = true;
                    meteorCrash(() => { busy = false; check(); });
                } else if (!armed && gap > innerHeight * .35) {
                    armed = true;
                    track.classList.remove('crashed');
                }
            };
            addEventListener('scroll', check, { passive: true });
            stopCrash = () => removeEventListener('scroll', check);
        }

        // The tail shimmers and the head pulses all the time, even when you stop scrolling
        animate(tail, { '--sweep': ['120%', '-120%'], duration: 1300, ease: 'linear', loop: true });
        animate(head, { '--pulse': [.7, 1], duration: 700, ease: 'inOutSine', loop: true, alternate: true });
    }


    /* ----- Scroll cue: the word rolls upward letter by letter, a short line travels down the track ----- */
    // splitText's clone puts a copy of each letter underneath; sliding both up by 100% makes the word roll.
    if (wide && $('.scroll-cue')) {
        const { chars } = splitText('.scroll-word', { chars: { wrap: 'clip', clone: 'bottom' } });
        createTimeline({ loop: true, loopDelay: 1400 })
            .add(chars, { y: ['0%', '-100%'], duration: 700, ease: 'inOut(3)', delay: stagger(45) });

        animate(createDrawable('.scroll-line line'), {
            draw: ['0 .3', '.7 1'],
            duration: 1600,
            ease: 'inOutSine',
            loop: true,
            loopDelay: 500
        });

        // Fades and drops away as the hero scrolls up (anime.js onScroll, synced to the scrollbar)
        animate('.scroll-cue', {
            opacity: [1, 0],
            y: [0, 24],
            ease: 'linear',
            autoplay: onScroll({ target: document.body, enter: 'start start', leave: 'start start+=240', sync: .25 })
        });
    }

    return () => stopCrash?.();
}).addOnce(self => {
    if (self.matches.reduce) return;


    /* ----- Progress comet arrives: lights up where the startup comet docked, its tail settling in ----- */
    if ($('.comet-track')) {
        createTimeline()
            .add('.comet-track', { y: [-30, 0], opacity: [0, 1], duration: 700, ease: 'outExpo' })
            .add('.comet-tail', { scaleY: [3, 1], duration: 1100, ease: 'outExpo' }, 0);
    }


    /* ----- Hero intro: title rises word by word, the orbit rings draw themselves ----- */
    const heroTitle = $('.hero-title');
    if (heroTitle) {
        const { words } = splitText(heroTitle, { words: { wrap: 'clip', class: 'split-word' } });
        utils.set(words, { y: '110%' });
        heroTitle.style.visibility = 'visible';

        const intro = createTimeline({ defaults: { ease } })
            .add(words, { y: ['110%', '0%'], duration: 900, delay: stagger(40) })
            .add('[data-hero]', { ...reveal, delay: stagger(80) }, '-=600');

        if (orbit) {
            intro
                .add(createDrawable('.orbit-ring'), { draw: ['0 0', '0 1'], duration: 1400, delay: stagger(150), ease: 'inOutQuart' }, 0)
                .add('.planet', { scale: [.9, 1], opacity: [0, 1], duration: 900 }, 200)
                .add('.satellite', { opacity: [0, 1], duration: 500 }, 800);
        }
        if ($('.scroll-cue')) intro.add('.scroll-cue > *', { ...reveal, delay: stagger(120) }, '-=200');
    }


    /* ----- Scroll reveals: play once when an element scrolls into view (anime.js onScroll events) ----- */
    // Anything already on screen or scrolled past when the page loads (a reload halfway down,
    // or a jump from the menu) plays straight away, so nothing is left invisible.
    const playOnEnter = (target, anim) => {
        const box = target.getBoundingClientRect();
        if (box.top < innerHeight - 80) return anim.play();
        onScroll({ target, enter: 'bottom-=80 top', repeat: false, onEnter: () => anim.play() });
    };

    // Fade-ups: hardware-accelerated (WAAPI)
    $$('[data-reveal]').forEach(el => {
        playOnEnter(el, waapi.animate(el, { ...reveal, autoplay: false }));
    });

    $$('[data-stagger]').forEach(group => {
        playOnEnter(group, waapi.animate(group.children, { ...reveal, delay: stagger(80), autoplay: false }));
    });

    // Line icons draw themselves
    $$('.pillar-icon').forEach(icon => {
        playOnEnter(icon, animate(createDrawable(icon.querySelectorAll('path, rect, circle, polyline')), {
            draw: ['0 0', '0 1'],
            duration: 1200,
            delay: stagger(120, { start: 200 }),
            ease: 'inOutQuart',
            autoplay: false
        }));
    });


    /* ----- "Currently" line: cycles through what I'm up to; each change scrambles into the next ----- */
    // Edit the list in index.html (data-rotate, items separated by |).
    const nowText = $('.now b[data-rotate]');
    if (nowText) {
        const items = nowText.dataset.rotate.split('|').map(t => t.trim());
        const charsFor = text => /japanese/i.test(text) ? 'あいうえおかきくけこさしすせそたちつてとなにぬねのまみむめも' : 'a-z';
        let i = 0;
        createTimer({
            duration: 3800,
            loop: true,
            onLoop: () => {
                i = (i + 1) % items.length;
                animate(nowText, {
                    innerHTML: scrambleText({ text: items[i], chars: charsFor(items[i]), cursor: '_', revealRate: 45 }),
                    duration: 1000
                });
            }
        });
    }


    /* ----- "Coming soon" heading: scrambles into place, then re-scrambles every few seconds and on hover ----- */
    const comingTitle = $('.coming-title');
    if (comingTitle) {
        const text = comingTitle.textContent;
        const scramble = (duration = 900) => animate(comingTitle, {
            innerHTML: scrambleText({ text, chars: 'a-z!<>-_/[]{}=+*^?#', cursor: '_', revealRate: 40 }),
            duration
        });
        comingTitle.style.opacity = 0;
        const intro = createTimeline({ autoplay: false })
            .set(comingTitle, { opacity: 1 })
            .call(() => {
                scramble(1400);
                createTimer({ duration: 6000, loop: true, onLoop: () => scramble() });
            });
        playOnEnter(comingTitle, intro);
        comingTitle.closest('.coming-head').addEventListener('pointerenter', () => scramble());
    }


    /* ----- About timeline: the line fills in as you scroll through it ----- */
    if ($('.timeline-line .draw')) {
        animate(createDrawable('.timeline-line .draw'), {
            draw: ['0 0', '0 1'],
            ease: 'linear',
            autoplay: onScroll({ target: '.timeline', enter: 'center top', leave: 'center bottom', sync: .4 })
        });
    }


    /* ----- Video player: frame settles in, the play ring draws itself ----- */
    if ($('.player')) {
        waapi.animate('.player-frame', { opacity: [0, 1], scale: [.97, 1], duration: 900, ease });
        animate(createDrawable('.player-ring'), { draw: ['0 0', '0 1'], duration: 1400, delay: 300, ease: 'inOutQuart' });
    }
}));


/* ========== Hover motion (mouse only, skipped with reduced motion) ========== */
const canHover = matchMedia('(hover: hover) and (pointer: fine)');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const onHover = (el, { enter, move, leave }) => {
    const ok = () => canHover.matches && !calm.matches;
    el.addEventListener('pointerenter', e => ok() && enter?.(e));
    el.addEventListener('pointermove', e => ok() && move?.(e));
    el.addEventListener('pointerleave', e => ok() && leave?.(e));
};

// Work cards and gallery pieces: the picture zooms in slightly and drifts against the pointer
$$('a.card, .art-open').forEach(el => {
    let pic;
    const get = () => {
        const img = $('img', el);
        if (img && !pic) pic = createAnimatable(img, { x: 600, y: 600, scale: 700, ease: 'outQuart' });
        return pic;
    };
    onHover(el, {
        enter: () => get()?.scale(1.06),
        move: e => {
            if (!get()) return;
            const box = el.getBoundingClientRect();
            pic.x(((e.clientX - box.left) / box.width - .5) * -12);
            pic.y(((e.clientY - box.top) / box.height - .5) * -12);
        },
        leave: () => { if (get()) { pic.x(0); pic.y(0); pic.scale(1); } }
    });
});

// Card arrow: a quick nudge to the right each time you hover
$$('a.card .link span').forEach(arrow => onHover(arrow.closest('a'), {
    enter: () => animate(arrow, { x: [0, 6, 3], duration: 500, ease: 'outBack' }),
    leave: () => animate(arrow, { x: 0, duration: 300, ease })
}));

// Coming soon cards: the title scrambles, the status dot pings
$$('.soon-card').forEach(card => {
    const title = $('h4', card);
    const dot = $('.soon-status i', card);
    const text = title.textContent;
    onHover(card, {
        enter: () => {
            animate(title, { innerHTML: scrambleText({ text, chars: 'a-z', revealRate: 30 }), duration: 600 });
            animate(dot, { scale: [1, 1.9, 1], duration: 700, ease: 'outElastic(1, .5)' });
            animate(card, { borderColor: getComputedStyle(card).getPropertyValue('--c') || '#a78bfa', duration: 300 });
        },
        leave: () => animate(card, { borderColor: getComputedStyle(document.documentElement).getPropertyValue('--line-strong'), duration: 300 })
    });
});


/* ========== 404 page: the logo runs away from your cursor ========== */
const lostLogo = $('.lost-logo');
if (lostLogo) {
    const img = $('img', lostLogo);
    const bubble = $('.lost-bubble', lostLogo);
    const still = calm.matches;
    let px = 0, py = 0, dodges = 0, resting = false, bubbleTimer;

    // Gentle idle float on the picture (the wrapper is the part that dodges)
    if (!still) animate(img, { y: [-6, 6], duration: 1800, ease: 'inOutSine', loop: true, alternate: true });

    // Centre the bubble over the logo, but keep it inside the screen; the tail still points at the logo
    const placeBubble = () => {
        if (bubble.hidden) return;
        const box = lostLogo.getBoundingClientRect();
        bubble.classList.toggle('below', box.top < 90);
        const left = utils.clamp((box.width - bubble.offsetWidth) / 2, 12 - box.left, innerWidth - 12 - bubble.offsetWidth - box.left);
        bubble.style.left = `${left}px`;
        bubble.style.setProperty('--tail', `${box.width / 2 - left}px`);
    };

    const say = () => {
        clearTimeout(bubbleTimer);
        bubble.hidden = false;
        placeBubble();
        animate(bubble, { scale: [0, 1], opacity: [0, 1], duration: 700, ease: 'outElastic(1, .6)' });
        animate(img, { rotate: [0, -12, 12, -8, 8, 0], duration: 600, ease: 'inOutSine' });
        bubbleTimer = setTimeout(() => {
            animate(bubble, { scale: 0, opacity: 0, duration: 250, ease: 'inQuad' }).then(() => bubble.hidden = true);
        }, 2600);
    };

    const dodge = (cx, cy) => {
        const box = lostLogo.getBoundingClientRect();
        const dx = box.left + box.width / 2 - cx;
        const dy = box.top + box.height / 2 - cy;
        const len = Math.hypot(dx, dy) || 1;
        const dist = utils.random(150, 260);

        // Where the logo sits with no offset, and how far it may move while staying on screen
        const homeX = box.left - px, homeY = box.top - py, pad = 16;
        const clampX = v => utils.clamp(v, pad - homeX, innerWidth - pad - box.width - homeX);
        const clampY = v => utils.clamp(v, pad - homeY, innerHeight - pad - box.height - homeY);
        let nx = clampX(px + dx / len * dist);
        let ny = clampY(py + dy / len * dist);

        // Cornered against an edge: jump to a random free spot instead
        if (Math.hypot(homeX + nx + box.width / 2 - cx, homeY + ny + box.height / 2 - cy) < box.width) {
            nx = clampX(utils.random(-homeX, innerWidth - homeX - box.width));
            ny = clampY(utils.random(-homeY, innerHeight - homeY - box.height));
        }
        px = nx; py = ny;
        animate(lostLogo, {
            x: px, y: py,
            rotate: [utils.random(-20, 20), 0],
            duration: still ? 0 : 650,
            ease: 'outBack(1.6)'
        }).then(placeBubble);

        if (++dodges % 10 === 0) say();
    };

    // The logo counts as touched when the pointer gets inside its circle
    const near = e => {
        if (resting) return;
        const box = lostLogo.getBoundingClientRect();
        const r = box.width / 2;
        if (Math.hypot(box.left + r - e.clientX, box.top + r - e.clientY) > r) return;
        resting = true;
        setTimeout(() => resting = false, 220);
        dodge(e.clientX, e.clientY);
    };
    document.addEventListener('pointermove', near);
    document.addEventListener('pointerdown', near);
    addEventListener('resize', () => { px = py = 0; animate(lostLogo, { x: 0, y: 0, duration: 0 }); });
}


/* ========== Illustration gallery: filter, entrance and full-size viewer ========== */
const artGrid = $('.art-grid');
if (artGrid) {
    const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const figures = () => $$('.art', artGrid);

    // Each piece fades up as its image arrives (images stay lazy-loaded).
    // Missing image: labelled tile in preview, removed on the live site.
    const filterBar = $('.filters');
    let order = 0;
    const appear = fig => {
        if (reduce()) return fig.style.opacity = 1;
        waapi.animate(fig, { ...reveal, delay: (order++ % 6) * 70 });
    };
    const missing = fig => {
        if (preview) {
            fig.classList.add('is-missing');
            $('.art-open', fig).dataset.file = fig.dataset.file;
            $('img', fig).remove();
            return appear(fig);
        }
        fig.remove();
        if (!figures().length) $('.art-empty').hidden = false;
        buildFilters();
    };
    figures().forEach(fig => {
        const img = $('img', fig);
        if (img.complete) return img.naturalWidth ? appear(fig) : missing(fig);
        img.addEventListener('load', () => appear(fig), { once: true });
        img.addEventListener('error', () => missing(fig), { once: true });
    });

    // Filter buttons from the tags in use; only shown when there are at least two tags
    const layout = filterBar && createLayout(artGrid, {
        children: '.art',
        duration: reduce() ? 0 : 500,
        ease: 'inOutQuart',
        enterFrom: { opacity: 0 },
        leaveTo: { opacity: 0 }
    });
    function buildFilters() {
        if (!filterBar) return;
        const all = figures();
        const tags = [...new Set(all.map(f => f.dataset.tag).filter(Boolean))];
        const active = $('[aria-pressed="true"]', filterBar)?.dataset.filter || 'all';
        filterBar.hidden = tags.length < 2;
        filterBar.innerHTML = ['all', ...tags].map(t => {
            const n = t === 'all' ? all.length : all.filter(f => f.dataset.tag === t).length;
            return `<button class="chip" type="button" data-filter="${t}" aria-pressed="${t === active}">${t === 'all' ? 'All' : t} <small>${n}</small></button>`;
        }).join('');
    }
    buildFilters();
    filterBar?.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        $$('.chip', filterBar).forEach(c => c.setAttribute('aria-pressed', c === chip));
        layout.update(() => figures().forEach(f => {
            f.classList.toggle('is-hidden', chip.dataset.filter !== 'all' && f.dataset.tag !== chip.dataset.filter);
        }));
    });

    // Full-size viewer
    const lb = $('.lightbox');
    const lbImg = $('img', lb);
    const lbCap = $('figcaption', lb);
    let list = [], index = 0;

    const show = (i, dir = 0) => {
        index = (i + list.length) % list.length;
        const fig = list[index];
        lbImg.src = $('img', fig).src;
        lbImg.alt = $('img', fig).alt;
        lbCap.textContent = [...$('figcaption', fig).children].map(el => el.textContent).join(' · ');
        if (!reduce()) waapi.animate(lbImg, { opacity: [0, 1], x: [dir * 32, 0], scale: dir ? 1 : [.94, 1], duration: 450, ease });
    };

    const open = fig => {
        list = figures().filter(f => !f.classList.contains('is-hidden') && !f.classList.contains('is-missing'));
        if (!list.includes(fig)) return;
        $$('.lb-prev, .lb-next', lb).forEach(btn => btn.hidden = list.length < 2);
        lb.showModal();
        if (!reduce()) waapi.animate(lb, { opacity: [0, 1], duration: 250, ease: 'linear' });
        show(list.indexOf(fig));
    };

    const close = () => {
        if (reduce()) return lb.close();
        waapi.animate(lb, { opacity: [1, 0], duration: 200, ease: 'linear' }).then(() => lb.close());
    };

    artGrid.addEventListener('click', e => {
        const btn = e.target.closest('.art-open');
        if (btn) open(btn.closest('.art'));
    });
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', () => show(index - 1, -1));
    $('.lb-next', lb).addEventListener('click', () => show(index + 1, 1));
    lb.addEventListener('cancel', e => { e.preventDefault(); close(); });             // Esc key
    lb.addEventListener('click', e => { if (e.target === lb || e.target.tagName === 'FIGURE') close(); });
    lb.addEventListener('keydown', e => {
        if (list.length < 2) return;
        if (e.key === 'ArrowLeft') show(index - 1, -1);
        if (e.key === 'ArrowRight') show(index + 1, 1);
    });
}


/* ========== Video player (HimeAI demo on YouTube) ========== */
// Only the cover and play button load at first; YouTube's player is added when Play is pressed.
const player = $('[data-youtube]');
if (player) {
    const frame = $('.player-frame', player);
    const big = $('.player-big', player);
    let yt, playing = false, pausedByTab = false;

    // Tell the YouTube player what to do (needs enablejsapi=1 in its address)
    const command = func => yt?.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');

    big.addEventListener('click', () => {
        yt = document.createElement('iframe');
        yt.src = `https://www.youtube-nocookie.com/embed/${player.dataset.youtube}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`;
        yt.title = 'HimeAI demo video';
        yt.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        yt.allowFullscreen = true;
        yt.style.opacity = 0;
        frame.append(yt);
        animate(big, { scale: .6, opacity: 0, duration: 300, ease: 'inBack' }).then(() => big.remove());
        yt.addEventListener('load', () => {
            waapi.animate(yt, { opacity: [0, 1], duration: 500, ease: 'linear' });
            yt.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');   // ask YouTube to report play/pause
        }, { once: true });
    });

    // Keep track of whether the video is playing (YouTube state 1 = playing)
    addEventListener('message', e => {
        if (!yt || e.source !== yt.contentWindow) return;
        try {
            const state = JSON.parse(e.data).info?.playerState;
            if (state !== undefined) playing = state === 1;
        } catch {}
    });

    // Switching tabs pauses the video; coming back carries on where it left off
    document.addEventListener('visibilitychange', () => {
        if (!yt) return;
        if (document.hidden && playing) { command('pauseVideo'); pausedByTab = true; }
        else if (pausedByTab) { command('playVideo'); pausedByTab = false; }
    });
}


/* ========== Copy email button: shows "Copied" for two seconds ========== */
$$('.copy-btn').forEach(btn => {
    const label = btn.querySelector('b');
    btn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(btn.dataset.email);
        } catch {
            location.href = 'mailto:' + btn.dataset.email;
            return;
        }
        label.textContent = 'Copied';
        btn.disabled = true;
        setTimeout(() => {
            label.textContent = 'Copy email';
            btn.disabled = false;
        }, 2000);
    });
});


/* ========== Project pages: highlight the contents link of the section on screen ========== */
const tocLinks = $$('.toc a');
if (tocLinks.length) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) tocLinks.forEach(a => a.classList.toggle('is-active', a.hash === '#' + e.target.id));
    }), { rootMargin: '-30% 0px -60% 0px' });
    tocLinks.forEach(a => { const s = $(a.hash); if (s) io.observe(s); });
}

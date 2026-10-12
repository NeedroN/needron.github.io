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
        skyGo();
        animate(state, { rate: 0, duration: 500 });
        waapi.animate(brand, { opacity: 0, scale: 1.06, duration: 500, ease: 'inQuad' });
        waapi.animate(warp, { opacity: [1, 0], duration: 900, delay: 150, ease: 'inOutQuad' }).then(sky.done);
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
}).addOnce(self => {
    if (self.matches.reduce) return;


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

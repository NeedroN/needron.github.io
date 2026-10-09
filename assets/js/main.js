/* ========== anime.js v4 (loaded from a CDN, nothing to install) ========== */
import {
    animate, createTimeline, createTimer, createAnimatable, createDrawable, createLayout,
    onScroll, splitText, scrambleText, stagger, utils
} from 'https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.esm.min.js';

window.__animeReady = true;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const ease = 'outExpo';


/* ========== Image placeholders ========== */
// Real image found: hide the "add file" label. Missing: remove the broken image so the gradient shows.
$$('.ph img').forEach(img => {
    const ok = () => img.parentElement.classList.add('has-img');
    const missing = () => img.remove();
    if (img.complete) img.naturalWidth ? ok() : missing();
    else {
        img.addEventListener('load', ok, { once: true });
        img.addEventListener('error', missing, { once: true });
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
    if (open && !reduceMotion) {
        animate(links.querySelectorAll('li'), { opacity: [0, 1], x: [-12, 0], delay: stagger(50), duration: 500, ease });
    }
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


/* ========== Starfield background ========== */
const canvas = $('#stars');
if (canvas) {
    const ctx = canvas.getContext('2d');
    const tints = ['255,255,255', '255,190,230', '200,180,255', '180,220,255'];
    let stars = [], w, h;

    const build = () => {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        w = innerWidth;
        h = innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        stars = Array.from({ length: Math.min(220, (w * h / 6500) | 0) }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.1 + .2,          // size
            a: Math.random() * .55 + .15,         // brightness
            s: Math.random() * .0015 + .0004,     // twinkle speed
            p: Math.random() * 6.28,              // twinkle offset
            d: Math.random() * .3 + .05,          // parallax depth
            c: tints[(Math.random() * tints.length) | 0]
        }));
    };

    // Stars twinkle and drift slightly with scroll for depth
    const draw = t => {
        ctx.clearRect(0, 0, w, h);
        const sy = scrollY;
        for (const s of stars) {
            const a = reduceMotion ? s.a : s.a * (.55 + .45 * Math.sin(t * s.s + s.p));
            const y = ((s.y - sy * s.d) % h + h) % h;
            ctx.fillStyle = `rgba(${s.c},${a})`;
            ctx.beginPath();
            ctx.arc(s.x, y, s.r, 0, 6.283);
            ctx.fill();
        }
    };

    build();
    addEventListener('resize', build);
    if (reduceMotion) {
        draw(0);
        addEventListener('scroll', () => draw(0), { passive: true });
    } else {
        createTimer({ loop: true, onUpdate: self => draw(self.currentTime) });
    }
}


/* ========== Hero orbit: rings and the two chips travelling on them ========== */
const orbit = $('.orbit');
const rings = [
    { rx: .47, ry: .16, tilt: -24, speed: 14000, phase: 0 },    // ring 1: code chip
    { rx: .43, ry: .2, tilt: 32, speed: 19000, phase: 2.2 }      // ring 2: art chip
];

// Point on a tilted ellipse, as a fraction of the orbit box (0 to 1)
const ringPoint = (ring, angle) => {
    const x = ring.rx * Math.cos(angle);
    const y = ring.ry * Math.sin(angle);
    const t = ring.tilt * Math.PI / 180;
    return [.5 + x * Math.cos(t) - y * Math.sin(t), .5 + x * Math.sin(t) + y * Math.cos(t)];
};

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

    // Move the chips; they pass behind the photo on the far side of the ring
    const sats = $$('.satellite', orbit);
    const place = time => sats.forEach(sat => {
        const ring = rings[sat.dataset.ring - 1];
        const angle = ring.phase + (reduceMotion ? 0 : time / ring.speed * Math.PI * 2);
        const [x, y] = ringPoint(ring, angle);
        const behind = Math.sin(angle) < 0;
        sat.style.transform = `translate(${x * orbit.offsetWidth}px, ${y * orbit.offsetHeight}px) scale(${behind ? .82 : 1})`;
        sat.style.zIndex = behind ? 0 : 2;
        sat.style.opacity = behind ? .55 : 1;
    });
    $('.planet', orbit).style.zIndex = 1;

    place(0);
    if (!reduceMotion) createTimer({ loop: true, onUpdate: self => place(self.currentTime) });
    addEventListener('resize', () => place(0));
}


/* ========== Everything below is motion only (skipped for reduced motion) ========== */
if (!reduceMotion) {

    /* ----- Scroll progress bar ----- */
    animate('.progress', {
        scaleX: [0, 1],
        ease: 'linear',
        autoplay: onScroll({ target: document.body, enter: 'start start', leave: 'end end', sync: true })
    });


    /* ----- Hero intro ----- */
    const heroTitle = $('.hero-title, .page-hero h1');
    if (heroTitle) {
        const { words } = splitText(heroTitle, { words: { wrap: 'clip', class: 'split-word' } });
        utils.set(words, { y: '110%' });
        heroTitle.style.visibility = 'visible';
        const intro = createTimeline({ defaults: { ease } });

        intro.add(words, { y: ['110%', '0%'], duration: 1100, delay: stagger(55) });

        if ($$('[data-hero]').length) {
            intro.add('[data-hero]', { opacity: [0, 1], y: [18, 0], duration: 900, delay: stagger(90) }, '-=800');
        }

        if (orbit) {
            intro
                .add(createDrawable('.orbit-ring'), { draw: ['0 0', '0 1'], duration: 1600, delay: stagger(200), ease: 'inOutQuart' }, 0)
                .add('.planet', { scale: [.6, 1], opacity: [0, 1], duration: 1200, ease: 'outBack(1.4)' }, 200)
                .add('.satellite', { opacity: [0, 1], duration: 600 }, 900);
        }
    }


    /* ----- Hero fades and drifts as you scroll past it ----- */
    if (orbit) {
        animate(orbit, {
            y: [0, 140],
            scale: [1, .82],
            opacity: [1, 0],
            ease: 'linear',
            autoplay: onScroll({ target: '.hero', enter: 'start start', leave: 'start end', sync: .25 })
        });
    }


    /* ----- Mouse-follow glow in the hero (desktop only) ----- */
    const glow = $('.cursor-glow');
    const hero = $('.hero');
    if (glow && hero && matchMedia('(pointer: fine)').matches) {
        const follower = createAnimatable(glow, { x: 900, y: 900, ease: 'outQuart' });
        follower.x(hero.offsetWidth * .7);
        follower.y(hero.offsetHeight * .4);
        hero.addEventListener('pointermove', e => {
            const r = hero.getBoundingClientRect();
            follower.x(e.clientX - r.left);
            follower.y(e.clientY - r.top);
        });
    }


    /* ----- "Currently ..." line scrambles between phrases ----- */
    const now = $('#now-text');
    if (now?.dataset.phrases) {
        const phrases = now.dataset.phrases.split('|');
        let i = 0;
        setInterval(() => {
            i = (i + 1) % phrases.length;
            animate(now, { innerHTML: scrambleText({ text: phrases[i], chars: 'a-z', cursor: '_' }) });
        }, 4200);
    }


    /* ----- Section titles: words rise into place when scrolled into view ----- */
    $$('[data-split]').forEach(el => {
        const { words } = splitText(el, { words: { wrap: 'clip', class: 'split-word' } });
        utils.set(words, { y: '110%' });
        el.style.visibility = 'visible';
        animate(words, {
            y: ['110%', '0%'],
            duration: 1000,
            delay: stagger(45),
            ease,
            autoplay: onScroll({ target: el, enter: 'bottom-=80 top', sync: 'play', repeat: false })
        });
    });


    /* ----- Single elements fade up on scroll ----- */
    $$('[data-reveal]').forEach(el => {
        animate(el, {
            opacity: [0, 1],
            y: [28, 0],
            duration: 1000,
            ease,
            autoplay: onScroll({ target: el, enter: 'bottom-=60 top', sync: 'play', repeat: false })
        });
    });


    /* ----- Groups: children appear one after another ----- */
    $$('[data-stagger]').forEach(group => {
        animate(group.children, {
            opacity: [0, 1],
            y: [40, 0],
            duration: 1000,
            delay: stagger(110),
            ease,
            autoplay: onScroll({ target: group, enter: 'bottom-=60 top', sync: 'play', repeat: false })
        });
    });


    /* ----- "In 30 seconds" icons draw themselves ----- */
    $$('.pillar-icon').forEach(icon => {
        animate(createDrawable(icon.querySelectorAll('path, rect, circle, polyline')), {
            draw: ['0 0', '0 1'],
            duration: 1400,
            delay: stagger(140, { start: 300 }),
            ease: 'inOutQuart',
            autoplay: onScroll({ target: icon, enter: 'bottom-=40 top', sync: 'play', repeat: false })
        });
    });


    /* ----- Numbers count up ----- */
    $$('[data-count]').forEach(el => {
        const counter = { n: 0 };
        const suffix = el.dataset.suffix || '';
        el.textContent = '0' + suffix;
        animate(counter, {
            n: +el.dataset.count,
            duration: 1600,
            ease: 'outQuart',
            modifier: utils.round(0),
            onUpdate: () => el.textContent = counter.n + suffix,
            autoplay: onScroll({ target: el, enter: 'bottom-=40 top', sync: 'play', repeat: false })
        });
    });


    /* ----- Word band slides sideways with the scroll ----- */
    const band = $('.band-track');
    if (band) {
        animate(band, {
            x: ['0%', '-30%'],
            ease: 'linear',
            autoplay: onScroll({ target: '.band', enter: 'end start', leave: 'start end', sync: .3 })
        });
    }


    /* ----- About timeline: the line draws as you scroll through it ----- */
    const line = $('.timeline-line .draw');
    if (line) {
        animate(createDrawable(line), {
            draw: ['0 0', '0 1'],
            ease: 'linear',
            autoplay: onScroll({ target: '.timeline', enter: 'center top', leave: 'center bottom', sync: .4 })
        });
    }


    /* ----- Project pages: cover image parallax ----- */
    const coverImg = $('.cover');
    if (coverImg) {
        animate(coverImg, {
            scale: [.94, 1],
            opacity: [.4, 1],
            ease: 'linear',
            autoplay: onScroll({ target: coverImg, enter: 'end start', leave: 'center center', sync: .3 })
        });
    }


    /* ----- Skills page: level dots light up ----- */
    $$('.dots').forEach(dots => {
        animate(dots.querySelectorAll('.on'), {
            scale: [0, 1],
            rotate: ['0deg', '45deg'],
            duration: 700,
            delay: stagger(70),
            ease: 'outBack(2)',
            autoplay: onScroll({ target: dots, enter: 'bottom-=20 top', sync: 'play', repeat: false })
        });
    });
} else {
    $$('[data-count]').forEach(el => el.textContent = el.dataset.count + (el.dataset.suffix || ''));
}


/* ========== Work filter: cards rearrange smoothly (anime.js layout) ========== */
const grid = $('.work-grid');
const chips = $$('.chip[data-filter]');
if (grid && chips.length) {
    const layout = createLayout(grid, {
        children: '.card',
        duration: reduceMotion ? 0 : 700,
        ease: 'inOutQuart',
        enterFrom: { opacity: 0, scale: .92 },
        leaveTo: { opacity: 0, scale: .92 }
    });

    chips.forEach(chip => chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        chips.forEach(c => c.setAttribute('aria-pressed', c === chip));
        layout.update(() => {
            $$('.card', grid).forEach(card => {
                card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.cat !== filter);
            });
        }, { delay: reduceMotion ? 0 : stagger(40) });
    }));
}


/* ========== Copy email button ========== */
$$('.copy-btn').forEach(btn => {
    const label = btn.querySelector('b');
    btn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(btn.dataset.email);
        } catch {
            location.href = 'mailto:' + btn.dataset.email;
            return;
        }
        const show = text => reduceMotion
            ? (label.textContent = text)
            : animate(label, { innerHTML: scrambleText({ text, chars: 'a-z' }) });
        show('Copied!');
        setTimeout(() => show('Copy email'), 2200);
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

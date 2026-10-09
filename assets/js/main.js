/* ========== anime.js v4 (loaded from a CDN, nothing to install) ========== */
import {
    animate, createTimeline, createTimer, createDrawable, createLayout, onScroll, splitText, stagger, utils
} from 'https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.esm.min.js';

window.__animeReady = true;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const preview = document.documentElement.classList.contains('dev');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// One motion style for the whole site: same easing, same distance, same speed
const ease = 'outQuart';
const reveal = { opacity: [0, 1], y: [16, 0], duration: 700, ease };


/* ========== Drafts: removed from the live site (kept in preview mode) ========== */
if (!preview) $$('[data-draft]').forEach(el => el.remove());


/* ========== Image placeholders ========== */
// Real image found: fade it in. Missing: remove the broken image so the tile shows.
// On the live site, missing gallery images are removed, and an empty gallery is hidden.
const missingImage = img => {
    const tile = img.parentElement;
    img.remove();
    const gallery = tile.closest('.gallery');
    if (preview || !gallery) return;
    tile.remove();
    if (!gallery.children.length) {
        const section = gallery.closest('section');
        $(`.toc a[href="#${section.id}"]`)?.remove();
        section.remove();
    }
};

$$('.ph img').forEach(img => {
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


/* ========== Starfield background (stars twinkle slowly) ========== */
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
        stars = Array.from({ length: Math.min(180, (w * h / 8000) | 0) }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.1 + .2,          // size
            a: Math.random() * .5 + .15,          // brightness
            s: Math.random() * .0012 + .0003,     // twinkle speed
            p: Math.random() * 6.28,              // twinkle offset
            c: tints[(Math.random() * tints.length) | 0]
        }));
    };

    const draw = t => {
        ctx.clearRect(0, 0, w, h);
        for (const s of stars) {
            ctx.fillStyle = `rgba(${s.c},${s.a * (.6 + .4 * Math.sin(t * s.s + s.p))})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, 6.283);
            ctx.fill();
        }
    };

    build();
    addEventListener('resize', () => { build(); draw(0); });
    if (reduceMotion) draw(0);
    else createTimer({ loop: true, onUpdate: self => draw(self.currentTime) });
}


/* ========== Hero orbit: rings and the two chips travelling on them ========== */
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
        sat.style.transform = `translate(${x * orbit.offsetWidth}px, ${y * orbit.offsetHeight}px) scale(${behind ? .85 : 1})`;
        sat.style.zIndex = behind ? 0 : 2;
        sat.style.opacity = behind ? .55 : 1;
    });
    $('.planet', orbit).style.zIndex = 1;

    place(0);
    if (!reduceMotion) createTimer({ loop: true, onUpdate: self => place(self.currentTime) });
    addEventListener('resize', () => place(0));
}


/* ========== Entrance and scroll motion (skipped for reduced motion) ========== */
if (!reduceMotion) {

    /* ----- Hero intro: title rises word by word, then the rest fades in ----- */
    const heroTitle = $('.hero-title');
    if (heroTitle) {
        const { words } = splitText(heroTitle, { words: { wrap: 'clip', class: 'split-word' } });
        utils.set(words, { y: '110%' });
        heroTitle.style.visibility = 'visible';

        const intro = createTimeline({ defaults: { ease } });
        intro
            .add(words, { y: ['110%', '0%'], duration: 900, delay: stagger(40) })
            .add('[data-hero]', { ...reveal, delay: stagger(80) }, '-=600');

        if (orbit) {
            intro
                .add(createDrawable('.orbit-ring'), { draw: ['0 0', '0 1'], duration: 1400, delay: stagger(150), ease: 'inOutQuart' }, 0)
                .add('.planet', { scale: [.9, 1], opacity: [0, 1], duration: 900 }, 200)
                .add('.satellite', { opacity: [0, 1], duration: 500 }, 800);
        }
    }


    /* ----- Single elements fade up once when scrolled into view ----- */
    $$('[data-reveal]').forEach(el => {
        animate(el, {
            ...reveal,
            autoplay: onScroll({ target: el, enter: 'bottom-=80 top', sync: 'play', repeat: false })
        });
    });


    /* ----- Groups: children fade up one after another ----- */
    $$('[data-stagger]').forEach(group => {
        animate(group.children, {
            ...reveal,
            delay: stagger(80),
            autoplay: onScroll({ target: group, enter: 'bottom-=80 top', sync: 'play', repeat: false })
        });
    });


    /* ----- About timeline: the line fills in as you scroll through it ----- */
    const line = $('.timeline-line .draw');
    if (line) {
        animate(createDrawable(line), {
            draw: ['0 0', '0 1'],
            ease: 'linear',
            autoplay: onScroll({ target: '.timeline', enter: 'center top', leave: 'center bottom', sync: .4 })
        });
    }
}


/* ========== Work filter: counts, and cards rearrange smoothly (anime.js layout) ========== */
const grid = $('.work-grid');
const filters = $('.filters');
if (grid && filters) {
    const chips = $$('.chip[data-filter]', filters);
    const cards = () => $$('.card', grid);

    // Show how many cards each filter has; hide empty filters, or the whole bar if only one type exists
    chips.forEach(chip => {
        const n = cards().filter(c => chip.dataset.filter === 'all' || c.dataset.cat === chip.dataset.filter).length;
        chip.querySelector('small').textContent = n;
        chip.hidden = n === 0;
    });
    if (chips.filter(c => !c.hidden && c.dataset.filter !== 'all').length < 2) filters.hidden = true;

    const layout = createLayout(grid, {
        children: '.card',
        duration: reduceMotion ? 0 : 500,
        ease: 'inOutQuart',
        enterFrom: { opacity: 0 },
        leaveTo: { opacity: 0 }
    });

    chips.forEach(chip => chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        chips.forEach(c => c.setAttribute('aria-pressed', c === chip));
        layout.update(() => {
            cards().forEach(card => {
                card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.cat !== filter);
            });
        });
    }));
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

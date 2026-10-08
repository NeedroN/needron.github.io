(() => {
    /* ========== Setup ========== */
    // Skip animations if the visitor's device asks for reduced motion, or if anime.js failed to load
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const A = !reduce && window.anime ? window.anime : null;

    // Short helpers for selecting elements
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];


    /* ========== Image placeholders ========== */
    // If an image file is missing, remove it so the gradient placeholder shows instead
    $$('.ph img').forEach(img => {
        const drop = () => img.remove();
        if (img.complete && !img.naturalWidth) drop();
        else img.addEventListener('error', drop, { once: true });
    });


    /* ========== Footer year ========== */
    $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());


    /* ========== Navigation bar ========== */
    const nav = $('.nav');
    const toggle = $('.nav-toggle');
    const links = $('.nav-links');

    // Phone menu: open and close with the hamburger button
    if (toggle) {
        toggle.addEventListener('click', () => {
            const open = toggle.getAttribute('aria-expanded') !== 'true';
            toggle.setAttribute('aria-expanded', open);
            links.classList.toggle('open', open);
        });

        // Close the menu after a link is tapped
        links.addEventListener('click', e => {
            if (e.target.closest('a')) {
                toggle.setAttribute('aria-expanded', 'false');
                links.classList.remove('open');
            }
        });
    }

    // Show a border under the nav once the page is scrolled
    const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();


    /* ========== Starfield background ========== */
    const canvas = $('#stars');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const tints = ['255,255,255', '255,182,226', '196,176,255', '170,215,255'];  // white, pink, violet, blue
        let stars = [], w, h, raf;

        // Create stars to fit the screen size (capped at 260 for speed)
        const build = () => {
            const dpr = Math.min(devicePixelRatio || 1, 2);
            w = innerWidth;
            h = innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const count = Math.min(260, (w * h / 5200) | 0);
            stars = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 1.2 + .2,           // size
                a: Math.random() * .6 + .2,            // brightness
                s: Math.random() * .002 + .0005,       // twinkle speed
                p: Math.random() * 6.28,               // twinkle offset
                c: tints[(Math.random() * tints.length) | 0]
            }));
        };

        // Draw one frame; stars twinkle unless reduced motion is on
        const draw = t => {
            ctx.clearRect(0, 0, w, h);
            for (const s of stars) {
                const a = reduce ? s.a : s.a * (.55 + .45 * Math.sin(t * s.s + s.p));
                ctx.fillStyle = `rgba(${s.c},${a})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, 6.283);
                ctx.fill();
            }
        };

        const loop = t => { draw(t); raf = requestAnimationFrame(loop); };
        const start = () => {
            cancelAnimationFrame(raf);
            reduce ? draw(0) : (raf = requestAnimationFrame(loop));
        };

        // Rebuild on resize, and pause while the tab is hidden to save battery
        let resizeTimer;
        addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { build(); start(); }, 150);
        });
        document.addEventListener('visibilitychange', () => document.hidden ? cancelAnimationFrame(raf) : start());

        build();
        start();
    }


    /* ========== Scroll reveal animations ========== */
    const show = el => { el.style.opacity = 1; };

    // Fade an element up; with data-stagger, its children appear one after another
    const animateIn = el => {
        if (!A) { show(el); return; }

        if (el.hasAttribute('data-stagger')) {
            show(el);
            A({ targets: [...el.children], opacity: [0, 1], translateY: [28, 0], delay: A.stagger(80), duration: 800, easing: 'easeOutExpo' });
        } else {
            A({ targets: el, opacity: [0, 1], translateY: [24, 0], duration: 900, easing: 'easeOutExpo' });
        }

        // Skill level bars grow from the left
        $$('.bar i', el).forEach((bar, i) =>
            A({ targets: bar, scaleX: [0, 1], delay: 200 + i * 60, duration: 1100, easing: 'easeOutQuart' }));
    };

    // Animate each .reveal element the first time it scrolls into view
    const reveals = $$('.reveal');
    if (!A || !('IntersectionObserver' in window)) {
        reveals.forEach(show);
    } else {
        const io = new IntersectionObserver(entries => entries.forEach(e => {
            if (e.isIntersecting) {
                io.unobserve(e.target);
                animateIn(e.target);
            }
        }), { rootMargin: '0px 0px -10% 0px' });
        reveals.forEach(el => io.observe(el));
    }


    /* ========== Hero intro animation ========== */
    // Headline lines slide up, then the tag, text and buttons fade in
    if (A && $('.hero')) {
        A.timeline({ easing: 'easeOutExpo' })
            .add({ targets: '.hero h1 .line > span', translateY: ['110%', 0], duration: 1100, delay: A.stagger(120) })
            .add({ targets: '.hero-fade', opacity: [0, 1], translateY: [16, 0], duration: 800, delay: A.stagger(90) }, '-=700');
    } else {
        $$('.hero-fade').forEach(show);
        $$('.hero h1 .line > span').forEach(s => s.style.transform = 'none');
    }


    /* ========== Project category tabs ========== */
    const tablist = $('[role=tablist]');
    if (tablist) {
        const tabs = $$('[role=tab]', tablist);
        const pill = $('.tab-pill', tablist);
        const panelOf = tab => $('#' + tab.getAttribute('aria-controls'));

        // Slide the gradient pill under the active tab
        const place = tab => {
            pill.style.width = tab.offsetWidth + 'px';
            pill.style.transform = `translateX(${tab.offsetLeft - 4}px)`;
        };

        const setActive = active => tabs.forEach(t => {
            const on = t === active;
            t.setAttribute('aria-selected', on);
            t.tabIndex = on ? 0 : -1;
            panelOf(t).hidden = !on;
        });

        // Switch tab, animate its cards in, and update the URL (#cs or #illustration)
        const select = (tab, focus) => {
            setActive(tab);
            place(tab);
            if (focus) tab.focus();

            const cards = $$('.card', panelOf(tab));
            if (A) A({ targets: cards, opacity: [0, 1], translateY: [20, 0], delay: A.stagger(70), duration: 700, easing: 'easeOutExpo' });
            else cards.forEach(show);

            history.replaceState(null, '', '#' + tab.dataset.hash);
        };

        // Click or use the left/right arrow keys to switch
        tabs.forEach((t, i) => {
            t.addEventListener('click', () => select(t));
            t.addEventListener('keydown', e => {
                const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (step) select(tabs[(i + step + tabs.length) % tabs.length], true);
            });
        });

        // Open the tab named in the URL, otherwise the first one
        const initial = tabs.find(t => location.hash === '#' + t.dataset.hash) || tabs[0];
        setActive(initial);
        requestAnimationFrame(() => place(initial));

        // Keep the pill aligned after resizing or once fonts load
        const realign = () => place($('[aria-selected=true]', tablist));
        addEventListener('resize', realign);
        if (document.fonts) document.fonts.ready.then(realign);
    }
})();

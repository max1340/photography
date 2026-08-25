const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const opt = u => (u && u.includes('res.cloudinary.com') && u.includes('/upload/') && !/\/f_auto/.test(u)) ? u.replace('/upload/', '/upload/f_auto,q_auto/') : u;
const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); };
const openM = m => { 
    m.classList.add('open'); 
    document.body.style.overflow = 'hidden'; 
    const mb = m.querySelector('.mbox');
    if (mb && mb._updateScroll) requestAnimationFrame(() => mb._updateScroll());
};
const closeM = m => { 
    m.classList.remove('open'); 
    document.body.style.overflow = ''; 
    const mb = m.querySelector('.mbox');
    if (mb && mb._closeScroll) mb._closeScroll();
};
$$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeM(m); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal.open').forEach(closeM); if ($('#lightbox').classList.contains('open')) { if (e.key === 'ArrowRight') lbStep(1); if (e.key === 'ArrowLeft') lbStep(-1); } });

const burgerBtn = $('#burgerBtn');
const mobileMenu = $('#mobileMenu');
if(burgerBtn && mobileMenu) {
    burgerBtn.addEventListener('click', () => openM(mobileMenu));
    mobileMenu.addEventListener('click', (e) => {
        if(e.target === mobileMenu || e.target.classList.contains('mm-link')) {
            closeM(mobileMenu);
        }
    });
}

const currentLang = localStorage.getItem('site_lang') || 'ru';

const UI_DICT = {
    ru: {
        navHome: 'Главная', navWorks: 'Портфолио', navBlog: 'Блог', navContact: 'Контакты',
        sec1: '(01)<b>Обо мне</b>',
        sec2: '(02)<b>Моя экспертиза</b>',
        sec3: '(03)<b>Мои работы</b>',
        sec6: '(06)<b>Блог</b>',
        sec7: '(07) Контакты',
        seeAll: 'Смотреть все',
        seeAllBtn: 'СМОТРЕТЬ ВСЕ',
        seeMoreBtn: 'УЗНАТЬ БОЛЬШЕ',
        talkBtn: 'ДАВАЙТЕ ПОГОВОРИМ',
        instaBtn: 'НАПИСАТЬ В INSTAGRAM',
        modalTitle: 'Давайте обсудим',
        modalDesc: 'Я всегда открыт для новых проектов, съемок и творческих коллабораций. Напишите мне напрямую.',
        fullPortfolio: 'Всё портфолио',
        worksTitle: '<span class="w">Избранные кадры</span>, которые я привожу из каждой экспедиции',
        worksDesc: 'Несколько кадров, которые я не мог оставить в архиве. Клик по карточке откроет детали съёмки, полная коллекция — в галерее.'
    },
    en: {
        navHome: 'Home', navWorks: 'Portfolio', navBlog: 'Blog', navContact: 'Contact',
        sec1: '(01)<b>About Me</b>',
        sec2: '(02)<b>Expertise</b>',
        sec3: '(03)<b>Selected Works</b>',
        sec6: '(06)<b>Journal & Stories</b>',
        sec7: '(07) Contact',
        seeAll: 'View all',
        seeAllBtn: 'VIEW ALL',
        seeMoreBtn: 'DISCOVER MORE',
        talkBtn: 'LET\'S TALK',
        instaBtn: 'MESSAGE ON INSTAGRAM',
        modalTitle: 'Let\'s Connect',
        modalDesc: 'I am always open to new projects, expeditions, and creative collaborations. Send me a direct message.',
        fullPortfolio: 'Complete Portfolio',
        worksTitle: '<span class="w">Featured Shots</span> from every journey and expedition',
        worksDesc: 'A curated selection of frames that couldn\'t stay in the archive. Click any card for shooting details; the complete collection is in the gallery.'
    }
};

function applyLang() {
    $$('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (UI_DICT[currentLang] && UI_DICT[currentLang][key]) {
            el.innerHTML = UI_DICT[currentLang][key];
        }
    });
    const wt = $('#worksTitle');
    if (wt && UI_DICT[currentLang] && UI_DICT[currentLang].worksTitle) {
        wt.innerHTML = UI_DICT[currentLang].worksTitle;
    }
    const wd = $('#worksDesc');
    if (wd && UI_DICT[currentLang] && UI_DICT[currentLang].worksDesc) {
        wd.textContent = UI_DICT[currentLang].worksDesc;
    }
    
    const langSpans = $$('.lang-switch span');
    if (langSpans.length) {
        langSpans.forEach(s => {
            s.classList.toggle('active', s.dataset.lang === currentLang);
            s.onclick = () => {
                if (s.dataset.lang !== currentLang) {
                    localStorage.setItem('site_lang', s.dataset.lang);
                    location.reload();
                }
            };
        });
    }
}
applyLang();
$$('.seeall').forEach(a => a.setAttribute('href', 'gallery.html'));

import { dbAll, dbGetObj } from './firebase.js?v=2';

/* ---------- ТЕКСТОВЫЙ ДВИЖОК ---------- */
function parseMarkdown(text) {
    if (!text) return '';
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<span class="w">$1</span>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

dbGetObj('settings/main_' + currentLang).then(settings => {
    if (!settings) return;
    for (const [key, value] of Object.entries(settings)) {
        const el = $(`[data-content-key="${key}"]`);
        if (!el) continue;
        
        if (key === 'marqueeText') {
            const words = value.split(',').map(w => w.trim()).filter(Boolean);
            if (words.length > 0) {
                const html = words.map(w => `<span>${w.toUpperCase()} ✦</span>`).join('');
                el.innerHTML = html + html;
            }
            continue;
        }
        if (key === 'contactInsta') {
            const linkEl = document.getElementById('contactInstaLink');
            if (linkEl) linkEl.href = 'https://instagram.com/' + value.replace('@', '');
        }
        if (key === 'contactEmail') {
            el.href = 'mailto:' + value;
        }
        if (key.endsWith('Num')) {
            el.setAttribute('data-count', value);
            const suf = el.dataset.suffix || '';
            el.textContent = value + suf;
            continue;
        }
        el.innerHTML = parseMarkdown(value);
    }
});

/* ---------- HERO СЛАЙДЕР ---------- */
let currentHeroSlideId = null;
let heroSlides = [];
let isHeroDragging = false;
let heroDragStartX = 0;
let heroDragStartScroll = 0;
let heroHasMoved = false;

function updateHeroProgress() {
    const cards = $$('#heroCards .hcard');
    const total = cards.length;
    if (total === 0) return;
    const activeCard = cards.find(c => c.dataset.id === currentHeroSlideId) || cards[0];
    const currentIndex = cards.indexOf(activeCard) + 1;
    
    const p = $('.hero-side .progress');
    if (p) {
        const pCur = p.querySelector('.p-cur') || p.querySelectorAll('span')[0];
        const pTotal = p.querySelector('.p-total') || p.querySelectorAll('span')[1];
        if (pCur) pCur.textContent = String(currentIndex).padStart(2, '0');
        if (pTotal) pTotal.textContent = String(total).padStart(2, '0');
        const bar = p.querySelector('.bar i');
        if (bar) bar.style.width = (currentIndex / total * 100) + '%';
    }
}

function scrollCardIntoView(card) {
    const heroCards = $('#heroCards');
    if (!card || !heroCards) return;
    const cardLeft = card.offsetLeft;
    const cardWidth = card.offsetWidth;
    const containerWidth = heroCards.clientWidth;
    const targetScroll = cardLeft - (containerWidth - cardWidth) / 2;
    heroCards.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
}

function activateHeroSlide(slide, autoScroll = true) {
    if (!slide) return;
    currentHeroSlideId = slide.id;
    const img = $('#heroImg');
    const slideUrl = opt(slide.url);
    if (img) {
        img.style.transition = 'opacity 0.25s ease-in-out';
        if (img.src !== slideUrl && !img.src.endsWith(slideUrl)) {
            img.style.opacity = 0;
            setTimeout(() => {
                img.src = slideUrl;
                img.style.opacity = 1;
            }, 250);
        } else {
            img.src = slideUrl;
        }
    }
    
    const h = $('#heroTitle');
    if (h) {
        h.textContent = slide.title;
        const words = h.textContent.trim().split(/\s+/); 
        h.innerHTML = words.map((w, i) => '<span class="hw" style="transition-delay:' + (i * 70) + 'ms"><i>' + w + '</i></span>').join(' ');
        requestAnimationFrame(() => requestAnimationFrame(() => $$('#heroTitle .hw').forEach(s => s.classList.add('on'))));
    }
    
    const heroTags = $('#heroTags');
    if (heroTags) {
        const tags = slide.tags || [];
        heroTags.innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');
    }

    const cards = $$('#heroCards .hcard');
    cards.forEach(c => c.style.borderColor = c.dataset.id === slide.id ? '#fff' : 'rgba(255, 255, 255, .25)');
    
    const activeCard = cards.find(c => c.dataset.id === slide.id);
    if (autoScroll && activeCard) {
        scrollCardIntoView(activeCard);
    }
    updateHeroProgress();
}

function renderHeroCard(slide) {
    const el = document.createElement('div'); 
    el.className = 'hcard dyn'; 
    el.dataset.id = slide.id;
    el.innerHTML = `
        <div class="ph ph-sm"><img src="${opt(slide.url)}" alt="${slide.title || ''}"></div>
        <div class="hcard-body"><h4 class="htitle">${slide.title}</h4><p class="hsub">${slide.sub || ''}</p></div>
    `;
    el.addEventListener('click', () => {
        if (heroHasMoved) return;
        activateHeroSlide(slide, true);
    });
    $('#heroCards').appendChild(el);
    updateHeroProgress();
}

dbAll('hero_slides_' + currentLang).then(list => {
    if (list.length > 0) {
        heroSlides = list;
        list.forEach(s => renderHeroCard(s));
        activateHeroSlide(list[0], false);
    }
});

const heroCards = $('#heroCards');
if (heroCards) {
    heroCards.addEventListener('wheel', e => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            heroCards.scrollLeft += e.deltaY;
        }
    });
}

/* ---------- анимации ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { threshold: .12 });
$$('.reveal').forEach(el => io.observe(el));

/* параллакс hero */
addEventListener('scroll', () => { const y = scrollY; if (y < innerHeight) $('#heroImg').style.transform = 'translateY(' + y * .14 + 'px) scale(1.02)'; }, { passive: true });

/* маркиза: дублируем ленту */
(function () { const m = $('#mtrack'); if (m) m.innerHTML += m.innerHTML; })();

/* счётчики */
const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, t0 = performance.now();
    (function tick(t) {
        const raw = el.getAttribute('data-count') || '0';
        const num = parseFloat(raw) || 0;
        const inlineSuf = raw.replace(/^[0-9.-]+/, '');
        const suf = inlineSuf || el.dataset.suffix || '';
        
        const p = Math.min(1, (t - t0) / 1400), k = 1 - Math.pow(1 - p, 3); 
        el.textContent = Math.round(num * k) + suf; 
        if (p < 1) requestAnimationFrame(tick); 
    })(t0);
    }), { threshold: .6 });
$$('[data-count]').forEach(el => cio.observe(el));

/* scrollspy */
const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { $$('#pills a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); } }), { rootMargin: '-40% 0px -55% 0px' });
['top', 'works', 'blog', 'contacts'].forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });

/* ---------- карусель (Моя экспертиза) ---------- */
const track = $('#expTrack');
if (track) {
    const step = () => {
        const slide = track.querySelector('.slide');
        return slide ? slide.getBoundingClientRect().width + 24 : 0;
    };
    function nextSlide() { 
        const s = step(); 
        if (s > 0) { 
            if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
                track.scrollTo({ left: 0, behavior: 'smooth' }); 
            } else {
                track.scrollBy({ left: s, behavior: 'smooth' }); 
            }
        } 
    }
    $('#expNext').onclick = () => { track.scrollBy({ left: step(), behavior: 'smooth' }); restartAuto(); };
    $('#expPrev').onclick = () => { track.scrollBy({ left: -step(), behavior: 'smooth' }); restartAuto(); };
    let auto = setInterval(nextSlide, 5200);
    function restartAuto() { clearInterval(auto); auto = setInterval(nextSlide, 5200); }
    track.addEventListener('pointerenter', () => clearInterval(auto));
    track.addEventListener('pointerleave', restartAuto);
    
    let drag = null;
    track.addEventListener('pointerdown', e => { drag = { x: e.clientX, l: track.scrollLeft }; track.classList.add('dragging'); });
    addEventListener('pointermove', e => { if (drag) track.scrollLeft = drag.l - (e.clientX - drag.x); });
    addEventListener('pointerup', () => { drag = null; track.classList.remove('dragging'); });
    track.addEventListener('scroll', () => {
        const s = step();
        if (s <= 0) return;
        const i = Math.min(track.children.length - 1, Math.max(0, Math.round(track.scrollLeft / s)));
        const slide = track.children[i];
        if (!slide) return;
        const cap = $('#expCap');
        if ($('#expCapT').textContent !== slide.dataset.title || $('#expCapP').textContent !== slide.dataset.place) {
            cap.classList.add('fade');
            setTimeout(() => {
                $('#expCapT').textContent = slide.dataset.title || '';
                $('#expCapP').textContent = slide.dataset.place || '';
                cap.classList.remove('fade');
            }, 150);
        }
    }, { passive: true });
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function renderCarousel() {
    const track = $('#expTrack');
    if (!track) return;
    track.innerHTML = '';

    let items = getFilteredWorks();
    if (currentCategory === 'Все') {
        items = shuffleArray(allWorks);
    }

    if (items.length === 0) {
        items = allWorks;
    }

    items.forEach(item => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.dataset.title = item.title || '';
        const placeGenre = [item.place, (item.tags || []).join(', ') || item.sub].filter(Boolean).join(' • ');
        slide.dataset.place = placeGenre;
        const finalImg = opt(item.url || '');
        slide.innerHTML = `<div class="ph"><img src="${finalImg}" alt="${item.place || item.title || ''}" loading="lazy"></div>`;
        track.appendChild(slide);
    });

    if (items.length > 0) {
        $('#expCapT').textContent = items[0].title || '';
        const placeGenre = [items[0].place, (items[0].tags || []).join(', ') || items[0].sub].filter(Boolean).join(' • ');
        $('#expCapP').textContent = placeGenre;
    } else {
        $('#expCapT').textContent = '';
        $('#expCapP').textContent = '';
    }

    track.scrollTo({ left: 0, behavior: 'auto' });
}

/* ---------- портфолио ---------- */
const MAIN_CATEGORIES = ['Все', 'Пейзаж', 'Архитектура', 'Снег', 'Горы', 'Море', 'Город'];
let allWorks = [];
let currentCategory = 'Все';
let worksPageLimit = 4;
let worksCurrentCount = 0;

const PIN_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; margin-right:4px; opacity:0.85;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

function createWorkCard(it) {
    const el = document.createElement('article');
    el.className = 'wcard';
    el.dataset.id = it.id;
    const finalImg = opt(it.url || '');
    const descText = it.sub || '';
    const placeText = it.place ? `<span style="font-weight:600; opacity:0.95; display:inline-flex; align-items:center;">${PIN_SVG}${it.place}</span>` : '';
    const fullSub = [placeText, descText].filter(Boolean).join(' — ');
    el.innerHTML = `
        <div class="ph"><img src="${finalImg}" alt="${it.title || ''}" loading="lazy"></div>
        <div class="wcard-info">
            <h3 class="htitle">${it.title || ''}</h3>
            ${fullSub ? `<p class="sub hsub">${fullSub}</p>` : ''}
            <button class="btn-outline" type="button">ПОДРОБНЕЕ <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>
        </div>
    `;
    return el;
}

function getFilteredWorks() {
    if (currentCategory === 'Все') return allWorks;
    const catLower = currentCategory.toLowerCase();
    return allWorks.filter(w => {
        const hasTag = (w.tags || []).some(t => t.toLowerCase().includes(catLower));
        const hasTitle = (w.title || '').toLowerCase().includes(catLower);
        const hasPlace = (w.place || w.sub || '').toLowerCase().includes(catLower);
        return hasTag || hasTitle || hasPlace;
    });
}

function renderWorksList() {
    const grid = $('#worksGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const items = allWorks.slice(0, 4);
    items.forEach(w => {
        const card = createWorkCard(w);
        grid.appendChild(card);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                card.classList.add('show');
            });
        });
    });
}

function updateExpSeeAll() {
    const el = $('#expSeeAll');
    if (!el) return;
    if (currentCategory && currentCategory !== 'Все') {
        el.href = 'gallery.html?cat=' + encodeURIComponent(currentCategory);
    } else {
        el.href = 'gallery.html';
    }
}

const viewAllBtn = $('#viewAllWorksBtn');
if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => { location.href = 'gallery.html'; });
}
const viewAllWorksArr = $('#viewAllWorksArr');
if (viewAllWorksArr) {
    viewAllWorksArr.addEventListener('click', () => { location.href = 'gallery.html'; });
}

const expSeeAll = $('#expSeeAll');
if (expSeeAll) {
    expSeeAll.addEventListener('click', (e) => {
        e.preventDefault();
        const url = (currentCategory && currentCategory !== 'Все')
            ? 'gallery.html?cat=' + encodeURIComponent(currentCategory)
            : 'gallery.html';
        location.href = url;
    });
}

function selectCategory(catName) {
    if (!catName) return;
    const catLower = catName.toLowerCase().replace('✦', '').trim();
    const match = MAIN_CATEGORIES.find(c => c.toLowerCase() === catLower || catLower.includes(c.toLowerCase()));
    currentCategory = match || catName.trim();
    $$('#expCats span').forEach(s => s.classList.toggle('active', s.dataset.cat === currentCategory));
    renderCarousel();
    updateExpSeeAll();
}

const heroTagsEl = $('#heroTags');
if (heroTagsEl) {
    heroTagsEl.addEventListener('click', (e) => {
        const tag = e.target.closest('.tag');
        if (!tag) return;
        selectCategory(tag.textContent);
        const expSec = $('#expertise');
        if (expSec) expSec.scrollIntoView({ behavior: 'smooth' });
    });
}

const marqueeEl = $('#mtrack');
if (marqueeEl) {
    marqueeEl.addEventListener('click', (e) => {
        const span = e.target.closest('span');
        if (!span) return;
        selectCategory(span.textContent);
        const expSec = $('#expertise');
        if (expSec) expSec.scrollIntoView({ behavior: 'smooth' });
    });
}

function initCategories() {
    const container = $('#expCats');
    if (!container) return;
    
    container.innerHTML = MAIN_CATEGORIES.map(cat => 
        `<span class="${cat === currentCategory ? 'active' : ''}" data-cat="${cat}">${cat}</span>`
    ).join('');
    
    $$('#expCats span').forEach(el => {
        el.addEventListener('click', () => {
            $$('#expCats span').forEach(s => s.classList.remove('active'));
            el.classList.add('active');
            currentCategory = el.dataset.cat;
            renderCarousel();
            updateExpSeeAll();
        });
    });
}

dbAll('works_' + currentLang).then(list => {
    list.sort((a, b) => (a.order || 0) - (b.order || 0));
    allWorks = list;
    initCategories();
    renderCarousel();
    renderWorksList();
    updateExpSeeAll();
});

/* ---------- лайтбокс ---------- */
let lbIndex = 0;
function gallery() { 
    return allWorks.slice(0, 4).map(c => ({
        src: opt(c.url),
        title: c.title || '',
        sub: c.sub || '',
        place: c.place || '',
        tags: c.tags || []
    }));
}

function lbShow(i) {
    const g = gallery(); 
    if (g.length === 0) return;
    lbIndex = (i + g.length) % g.length; 
    const it = g[lbIndex];
    $('#lbImg').src = opt(it.src); 
    $('#lbTitle').textContent = it.title; 
    const subParts = [it.place, it.sub].filter(Boolean);
    $('#lbSub').textContent = subParts.join(' • ');
    $('#lbTags').innerHTML = (it.tags || []).map(t => '<span class="wtag">' + t + '</span>').join('');
}

const lbTagsEl = $('#lbTags');
if (lbTagsEl) {
    lbTagsEl.addEventListener('click', (e) => {
        const tag = e.target.closest('.wtag');
        if (!tag) return;
        selectCategory(tag.textContent);
        closeM($('#lightbox'));
        const worksSec = $('#works');
        if (worksSec) worksSec.scrollIntoView({ behavior: 'smooth' });
    });
}

function lbStep(d) { lbShow(lbIndex + d); }
$('#lbNext').onclick = () => lbStep(1); 
$('#lbPrev').onclick = () => lbStep(-1);

let worksDrag = null;
let worksHasMoved = false;
const worksGridEl = $('#worksGrid');
if (worksGridEl) {
    worksGridEl.addEventListener('pointerdown', e => {
        if (window.innerWidth <= 860) {
            worksDrag = { x: e.clientX, l: worksGridEl.scrollLeft };
            worksHasMoved = false;
        }
    });
    window.addEventListener('pointermove', e => {
        if (worksDrag) {
            const dx = e.clientX - worksDrag.x;
            if (Math.abs(dx) > 6) worksHasMoved = true;
            worksGridEl.scrollLeft = worksDrag.l - dx;
        }
    });
    window.addEventListener('pointerup', () => {
        worksDrag = null;
        setTimeout(() => { worksHasMoved = false; }, 50);
    });
}

function handleCardClick(e, gridSelector) {
    if (gridSelector === '#worksGrid' && worksHasMoved) return;
    const card = e.target.closest('.wcard'); 
    if (!card) return;
    const cards = $$(gridSelector + ' .wcard');
    lbShow(cards.indexOf(card)); 
    openM($('#lightbox'));
}

$('#worksGrid').addEventListener('click', e => handleCardClick(e, '#worksGrid'));

/* ---------- блог ---------- */
const postsMap = {};
function postCard(p) {
    postsMap[p.id] = p; const el = document.createElement('article'); el.className = 'bcard'; el.dataset.pid = p.id;
    el.innerHTML = `
        <div class="ph"><img src="${opt(p.img)}" alt=""></div>
        <div class="bmeta"><span class="bdate">${p.date}</span><h3>${p.title}</h3><p>${p.excerpt}</p><span class="bread">ЧИТАТЬ <svg width="14" height="10" viewBox="0 0 26 10" fill="none" stroke="currentColor" stroke-width="2"><path d="M0 5h24M20 1l4 4-4 4"/></svg></span></div>
    `;
    return el;
}
function renderPosts() {
    const grid = $('#blogGrid'); 
    dbAll('posts_' + currentLang).then(list => {
        list.forEach(r => grid.appendChild(postCard(r)));
    });
}
renderPosts();

$('#blogGrid').addEventListener('click', e => {
    const card = e.target.closest('.bcard'); if (!card) return;
    const p = postsMap[card.dataset.pid]; if (!p) return;
    
    // 1. Дата и время чтения
    const readMin = Math.max(1, Math.round((p.content || '').length / 1000));
    const readSuffix = currentLang === 'en' ? 'min read' : 'мин чтения';
    $('#pvDate').textContent = (p.date ? p.date + ' · ' : '') + readMin + ' ' + readSuffix;
    
    // 2. Заголовок и лид
    $('#pvTitle').textContent = p.title || '';
    const pvLead = $('#pvLead');
    if (pvLead) {
        pvLead.textContent = p.excerpt || '';
        pvLead.style.display = p.excerpt ? '' : 'none';
    }
    
    // 3. Карусель фото
    const track = $('#pvTrack');
    track.innerHTML = '';
    const imgs = (p.images && p.images.length > 0 ? p.images : [p.img]).filter(Boolean).map(opt);
    
    imgs.forEach(url => {
        const slide = document.createElement('div');
        slide.className = 'bc-slide';
        slide.innerHTML = `<img src="${opt(url)}" alt="">`;
        track.appendChild(slide);
    });
    
    // Стрелки и счетчик фото
    const arrows = $('#pvArrows');
    if (arrows) {
        arrows.style.display = imgs.length > 1 ? 'flex' : 'none';
    }
    
    const countEl = $('#pvCount');
    if (countEl) {
        if (imgs.length > 1) {
            countEl.style.display = '';
            countEl.textContent = `1 / ${imgs.length}`;
        } else {
            countEl.style.display = 'none';
        }
    }
    
    track.scrollTo({ left: 0, behavior: 'auto' });
    
    // 4. Тело статьи
    let rawContent = (p.content || '').split(/\n\n+/).map(t => '<p>' + t + '</p>').join('');
    $('#pvContent').innerHTML = parseMarkdown(rawContent);
    
    // 5. Подпись
    const signEl = $('#pvSign');
    if (signEl) {
        signEl.textContent = currentLang === 'ru' ? 'Макс · M.Photo' : 'Max · M.Photo';
    }
    
    openM($('#postView'));
});

const pvTrack = $('#pvTrack');
if (pvTrack) {
    $('#pvNext').onclick = () => pvTrack.scrollBy({ left: pvTrack.clientWidth, behavior: 'smooth' });
    $('#pvPrev').onclick = () => pvTrack.scrollBy({ left: -pvTrack.clientWidth, behavior: 'smooth' });
    
    pvTrack.addEventListener('scroll', () => {
        if (!pvTrack.clientWidth) return;
        const countEl = $('#pvCount');
        const total = pvTrack.children.length;
        if (total > 1 && countEl) {
            const i = Math.min(total, Math.max(1, Math.round(pvTrack.scrollLeft / pvTrack.clientWidth) + 1));
            countEl.textContent = `${i} / ${total}`;
        }
    }, { passive: true });
}

/* ---------- кастомный оверлей-скроллбар для модалок ---------- */
function initOverlayScroll(mbox) {
    if (!mbox) return;
    const thumb = document.createElement('div');
    thumb.className = 'os-thumb';
    document.body.appendChild(thumb);

    let hideTimer = null;
    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    function showThumb() {
        if (mbox.scrollHeight <= mbox.clientHeight + 4) {
            thumb.style.display = 'none';
            thumb.classList.remove('show');
            return;
        }
        thumb.style.display = '';
        thumb.classList.add('show');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            if (!isDragging) thumb.classList.remove('show');
        }, 800);
    }

    function update() {
        if (mbox.scrollHeight <= mbox.clientHeight + 4) {
            thumb.style.display = 'none';
            thumb.classList.remove('show');
            return;
        }
        const rect = mbox.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            thumb.style.display = 'none';
            thumb.classList.remove('show');
            return;
        }
        thumb.style.display = '';
        const height = Math.max(40, mbox.clientHeight * mbox.clientHeight / mbox.scrollHeight);
        const top = rect.top + (mbox.scrollTop / mbox.scrollHeight) * mbox.clientHeight;
        const left = rect.right - 10;
        thumb.style.height = `${height}px`;
        thumb.style.top = `${top}px`;
        thumb.style.left = `${left}px`;
    }

    mbox.addEventListener('scroll', () => {
        update();
        showThumb();
    }, { passive: true });

    mbox.addEventListener('mouseenter', () => {
        update();
        showThumb();
    });

    window.addEventListener('resize', update);

    mbox.addEventListener('load', (e) => {
        if (e.target && e.target.tagName === 'IMG') {
            update();
        }
    }, { capture: true });

    thumb.addEventListener('pointerdown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startScrollTop = mbox.scrollTop;
        thumb.classList.add('drag');
        thumb.classList.add('show');
        thumb.setPointerCapture(e.pointerId);
    });

    thumb.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const deltaY = e.clientY - startY;
        const thumbHeight = Math.max(40, mbox.clientHeight * mbox.clientHeight / mbox.scrollHeight);
        const scrollable = mbox.scrollHeight - mbox.clientHeight;
        const trackHeight = mbox.clientHeight - thumbHeight;
        if (trackHeight > 0) {
            mbox.scrollTop = startScrollTop + (deltaY / trackHeight) * scrollable;
        }
        update();
    });

    const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        thumb.classList.remove('drag');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => thumb.classList.remove('show'), 800);
    };

    thumb.addEventListener('pointerup', stopDrag);
    thumb.addEventListener('pointercancel', stopDrag);

    mbox._updateScroll = () => {
        update();
        showThumb();
    };

    mbox._closeScroll = () => {
        clearTimeout(hideTimer);
        isDragging = false;
        thumb.classList.remove('show');
        thumb.classList.remove('drag');
        thumb.style.display = 'none';
    };
}

$$('.mbox').forEach(initOverlayScroll);

/* ---------- контакты ---------- */
$$('.js-contact').forEach(b => b.addEventListener('click', () => openM($('#contactModal'))));
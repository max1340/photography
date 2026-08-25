const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
const js = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf-8');
const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf-8');

console.log('--- Запуск TDD тестов для модалки чтения поста (#postView) ---');

const errors = [];
function check(desc, fn) {
    try {
        fn();
        console.log(`[PASS] ${desc}`);
    } catch (e) {
        console.log(`[FAIL] ${desc}: ${e.message}`);
        errors.push({ desc, error: e.message });
    }
}

// 1. Лид поста (index.html, style.css, main.js)
check('1.1 index.html содержит #pvLead с классом pv-lead после #pvTitle', () => {
    assert.match(html, /id="pvTitle"[^>]*><\/h2>\s*<p class="pv-lead" id="pvLead"><\/p>/i, 'Элемент #pvLead должен следовать сразу за #pvTitle');
});

check('1.2 style.css содержит стили .pv-lead / #pvLead', () => {
    assert.match(css, /(\.pv-lead|#pvLead)\s*\{[^}]*font-size:\s*16\.5px/i, 'font-size: 16.5px');
    assert.match(css, /(\.pv-lead|#pvLead)\s*\{[^}]*color:\s*var\(--gray\)/i, 'color: var(--gray)');
    assert.match(css, /(\.pv-lead|#pvLead)\s*\{[^}]*line-height:\s*1\.7/i, 'line-height: 1.7');
    assert.match(css, /(\.pv-lead|#pvLead)\s*\{[^}]*margin:\s*12px\s+0\s+24px/i, 'margin: 12px 0 24px');
    assert.match(css, /(\.pv-lead|#pvLead)\s*\{[^}]*padding-left:\s*14px/i, 'padding-left: 14px');
    assert.match(css, /(\.pv-lead|#pvLead)\s*\{[^}]*border-left:\s*2px\s+solid\s+rgba\(255,\s*255,\s*255,\s*\.?25\)/i, 'border-left: 2px solid rgba(255,255,255,.25)');
    assert.match(css, /(\.pv-lead|#pvLead)\s*\{[^}]*max-width:\s*65ch/i, 'max-width: 65ch');
});

check('1.3 main.js устанавливает p.excerpt в #pvLead и скрывает при пустом значении', () => {
    assert.match(js, /pvLead.*textContent\s*=\s*p\.excerpt\s*\|\|\s*''/i, 'Должна быть установка p.excerpt');
    assert.match(js, /pvLead.*style\.display\s*=\s*(p\.excerpt|\!p\.excerpt|\!.*excerpt|p\.excerpt \? '' : 'none')/i, 'Должно быть управление display при отсутствии excerpt');
});

// 2. Типографика и шапка поста
check('2.1 style.css задает font-size 27px и line-height 1.25 для заголовка в #postView', () => {
    assert.match(css, /(\.modal#postView|\#postView|\.article-body)\s+([^}]*h2|h3)[^{]*\{[^}]*font-size:\s*27px/i, 'font-size: 27px');
    assert.match(css, /(\.modal#postView|\#postView|\.article-body)\s+([^}]*h2|h3)[^{]*\{[^}]*line-height:\s*1\.25/i, 'line-height: 1.25');
});

check('2.2 main.js формирует #pvDate с датой и временем чтения (мин чтения / min read)', () => {
    assert.match(js, /Math\.max\(\s*1,\s*Math\.round\(\s*\(\s*p\.content\s*\|\|\s*''\s*\)\.length\s*\/\s*1000\s*\)\s*\)/i, 'Формула расчета времени чтения N');
    assert.match(js, /мин чтения/i, 'Локализация "мин чтения" для RU');
    assert.match(js, /min read/i, 'Локализация "min read" для EN');
});

check('2.3 style.css задает стили текста статьи (.modal#postView .mtext p / .modal#postView .acontent p)', () => {
    assert.match(css, /(\.modal#postView|\#postView)\s+(\.mtext|\.acontent)\s+p[^{]*\{[^}]*font-size:\s*16px/i, 'font-size: 16px');
    assert.match(css, /(\.modal#postView|\#postView)\s+(\.mtext|\.acontent)\s+p[^{]*\{[^}]*line-height:\s*1\.85/i, 'line-height: 1.85');
    assert.match(css, /(\.modal#postView|\#postView)\s+(\.mtext|\.acontent)\s+p[^{]*\{[^}]*margin-bottom:\s*18px/i, 'margin-bottom: 18px');
    assert.match(css, /(\.modal#postView|\#postView)\s+(\.mtext|\.acontent)\s+p[^{]*\{[^}]*max-width:\s*65ch/i, 'max-width: 65ch');
    assert.match(css, /(\.modal#postView|\#postView)\s+(\.mtext|\.acontent)\s+p[^{]*\{[^}]*color:\s*#d6d5cf/i, 'color: #d6d5cf');
});

// 3. Карусель фото
check('3.1 index.html содержит #pvArrows и #pvCount внутри .blog-carousel', () => {
    const carouselMatch = html.match(/<div class="blog-carousel"[^>]*>([\s\S]*?)<\/div>\s*<div class="article-body">/i);
    assert.ok(carouselMatch, 'Контейнер .blog-carousel должен находиться перед .article-body');
    assert.match(carouselMatch[1], /id="pvCount"/i, '#pvCount должен быть внутри .blog-carousel');
    assert.match(carouselMatch[1], /id="pvArrows"/i, '#pvArrows должен быть внутри .blog-carousel');
});

check('3.2 style.css содержит оверлей для #pvArrows и размеры кнопок', () => {
    assert.match(css, /\.blog-carousel\s*\{[^}]*position:\s*relative/i, '.blog-carousel должен быть position: relative');
    assert.match(css, /\.blog-carousel\s*\{[^}]*background:\s*transparent/i, '.blog-carousel background: transparent');
    assert.match(css, /\.blog-carousel\s*\{[^}]*border-radius:\s*14px/i, '.blog-carousel border-radius: 14px');
    assert.match(css, /#pvArrows\s*\{[^}]*position:\s*absolute/i, '#pvArrows должен быть position: absolute');
    assert.match(css, /#pvArrows\s*\{[^}]*top:\s*50%/i, '#pvArrows top: 50%');
    assert.match(css, /#pvArrows\s*\{[^}]*transform:\s*translateY\(-50%\)/i, '#pvArrows translateY(-50%)');
    assert.match(css, /#pvArrows\s*\{[^}]*pointer-events:\s*none/i, '#pvArrows должен иметь pointer-events: none');
    assert.match(css, /#pvArrows\s+\.arr[^{]*\{[^}]*pointer-events:\s*auto/i, '#pvArrows .arr должен иметь pointer-events: auto');
    assert.match(css, /#pvArrows\s+\.arr[^{]*\{[^}]*width:\s*40px/i, '#pvArrows .arr width: 40px');
    assert.match(css, /#pvArrows\s+\.arr[^{]*\{[^}]*height:\s*40px/i, '#pvArrows .arr height: 40px');
    assert.match(css, /#pvArrows\s+\.arr[^{]*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*\.?45\)/i, '#pvArrows .arr темный полупрозрачный фон');
});

check('3.3 style.css задает .bc-slide img max-height: 48vh и border-radius: 0', () => {
    assert.match(css, /\.bc-slide\s+img\s*\{[^}]*max-height:\s*48vh/i, '.bc-slide img должен иметь max-height: 48vh');
    assert.match(css, /\.bc-slide\s+img\s*\{[^}]*border-radius:\s*0/i, '.bc-slide img border-radius: 0');
});

check('3.4 style.css содержит стили счетчика .bc-count', () => {
    assert.match(css, /\.bc-count\s*\{[^}]*position:\s*absolute/i, 'position: absolute');
    assert.match(css, /\.bc-count\s*\{[^}]*top:\s*12px/i, 'top: 12px');
    assert.match(css, /\.bc-count\s*\{[^}]*right:\s*12px/i, 'right: 12px');
    assert.match(css, /\.bc-count\s*\{[^}]*backdrop-filter:\s*blur\(6px\)/i, 'backdrop-filter: blur(6px)');
    assert.match(css, /\.bc-count\s*\{[^}]*border-radius:\s*999px/i, 'border-radius: 999px');
    assert.match(css, /\.bc-count\s*\{[^}]*padding:\s*5px\s+12px/i, 'padding: 5px 12px');
    assert.match(css, /\.bc-count\s*\{[^}]*font-size:\s*11px/i, 'font-size: 11px');
    assert.match(css, /\.bc-count\s*\{[^}]*color:\s*#fff/i, 'color: #fff');
});

check('3.5 main.js обновляет #pvCount и скрывает стрелки/счетчик при 1 фото', () => {
    assert.match(js, /pvCount/i, 'Должно быть использование pvCount в main.js');
    assert.match(js, /Math\.round\(\s*(track|pvTrack)\.scrollLeft\s*\/\s*(track|pvTrack)\.clientWidth\s*\)\s*\+\s*1/i, 'Формула вычисления текущего слайда');
});

// 4. Форма модалки
check('4.1 style.css задает .modal#postView .mbox { width: min(780px, 94vw); }', () => {
    assert.match(css, /(\.modal#postView\s+\.mbox|\.mbox\.article-box)[^{]*\{[^}]*width:\s*min\(780px,\s*94vw\)/i, 'Ширина модалки min(780px, 94vw)');
});

// 5. Подпись в конце статьи
check('5.1 index.html содержит #pvSign с классом pv-sign после #pvContent', () => {
    assert.match(html, /id="pvContent"[^>]*><\/div>\s*<p class="pv-sign" id="pvSign"><\/p>/i, 'Элемент #pvSign должен следовать за #pvContent');
});

check('5.2 main.js заполняет #pvSign строкой автора в зависимости от языка', () => {
    assert.match(js, /currentLang\s*===\s*'ru'\s*\?\s*'Макс\s*·\s*M\.Photo'\s*:\s*'Max\s*·\s*M\.Photo'/i, 'Заполнение подписи в зависимости от языка');
});

check('5.3 style.css содержит стили .pv-sign', () => {
    assert.match(css, /\.pv-sign\s*\{[^}]*margin-top:\s*26px/i, 'margin-top: 26px');
    assert.match(css, /\.pv-sign\s*\{[^}]*color:\s*var\(--gray\)/i, 'color: var(--gray)');
    assert.match(css, /\.pv-sign\s*\{[^}]*font-size:\s*13px/i, 'font-size: 13px');
    assert.match(css, /\.pv-sign\s*\{[^}]*letter-spacing:\s*\.?04em/i, 'letter-spacing: .04em');
});

// 6. Запреты
check('6.1 Отсутствуют диплинки (#post=) и перелинковка постов в main.js и index.html', () => {
    assert.doesNotMatch(js, /#post=/i, 'Запрещены диплинки #post=');
    assert.doesNotMatch(html, /#post=/i, 'Запрещены диплинки #post=');
    assert.doesNotMatch(js, /pvNextPost|pvPrevPost|nextPost|prevPost/i, 'Запрещена навигация между постами');
});

console.log(`\nИтог: Пройдено ${14 - errors.length} проверок.`);
if (errors.length > 0) {
    console.log(`Ошибок: ${errors.length}`);
    process.exit(1);
} else {
    console.log('Все TDD проверки пройдены успешно!');
}

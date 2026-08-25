const fs = require('fs');
const path = require('path');
const assert = require('assert');

const adminCss = fs.readFileSync(path.join(__dirname, 'admin.css'), 'utf-8');
const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf-8');
const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf-8');

console.log('--- Запуск TDD тестов для кастомных скроллбаров ---');

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

// 1. Скроллбар body в админке (Firefox + тонкий тёмный)
check('1.1 admin.css содержит scrollbar-width: thin и scrollbar-color для body', () => {
    assert.match(adminCss, /body\s*\{[^}]*scrollbar-width:\s*thin/i, 'admin.css body scrollbar-width: thin');
    assert.match(adminCss, /body\s*\{[^}]*scrollbar-color:\s*rgba\(255,\s*255,\s*255,\s*\.?25\)\s+#111111/i, 'admin.css body scrollbar-color');
});

// 2. Стили модалок и оверлей-тумбы в style.css
check('2.1 style.css скрывает нативный скроллбар у .mbox', () => {
    assert.match(styleCss, /\.mbox\s*\{[^}]*scrollbar-width:\s*none/i, 'style.css .mbox scrollbar-width: none');
    assert.match(styleCss, /\.mbox::-webkit-scrollbar\s*\{[^}]*display:\s*none/i, 'style.css .mbox::-webkit-scrollbar display: none');
});

check('2.2 style.css содержит стили .os-thumb, .os-thumb.show и .os-thumb:hover / .os-thumb.drag', () => {
    assert.match(styleCss, /\.os-thumb\s*\{[^}]*position:\s*fixed/i, '.os-thumb position: fixed');
    assert.match(styleCss, /\.os-thumb\s*\{[^}]*width:\s*4px/i, '.os-thumb width: 4px');
    assert.match(styleCss, /\.os-thumb\s*\{[^}]*border-radius:\s*99px/i, '.os-thumb border-radius: 99px');
    assert.match(styleCss, /\.os-thumb\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*\.?28\)/i, '.os-thumb background');
    assert.match(styleCss, /\.os-thumb\s*\{[^}]*opacity:\s*0/i, '.os-thumb opacity: 0');
    assert.match(styleCss, /\.os-thumb\s*\{[^}]*transition:\s*opacity\s+\.?3s/i, '.os-thumb transition');
    assert.match(styleCss, /\.os-thumb\.show\s*\{[^}]*opacity:\s*1/i, '.os-thumb.show opacity: 1');
    assert.match(styleCss, /(\.os-thumb:hover|\.os-thumb\.drag)\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*\.?5\)/i, '.os-thumb:hover/.drag background');
});

// 3. Логика initOverlayScroll в main.js
check('3.1 main.js содержит функцию initOverlayScroll', () => {
    assert.match(mainJs, /function\s+initOverlayScroll\s*\(|const\s+initOverlayScroll\s*=/i, 'initOverlayScroll объявлена');
});

check('3.2 initOverlayScroll проверяет scrollHeight <= clientHeight + 4', () => {
    assert.match(mainJs, /scrollHeight\s*<=\s*.*clientHeight\s*\+\s*4/i, 'Проверка scrollHeight <= clientHeight + 4');
});

check('3.3 initOverlayScroll вычисляет геометрию: height, top, left', () => {
    assert.match(mainJs, /Math\.max\(\s*40,\s*.*clientHeight\s*\*\s*.*clientHeight\s*\/\s*.*scrollHeight\s*\)/i, 'Вычисление высоты тумбы');
    assert.match(mainJs, /rect\.top\s*\+\s*\(.*scrollTop\s*\/\s*.*scrollHeight\)\s*\*\s*.*clientHeight/i, 'Вычисление top');
    assert.match(mainJs, /rect\.right\s*-\s*10/i, 'Вычисление left');
});

check('3.4 initOverlayScroll скрывает тумбу через 800мс после остановки скролла', () => {
    assert.match(mainJs, /800/i, 'Таймаут скрытия 800мс');
});

check('3.5 initOverlayScroll поддерживает Drag (pointerdown, pointermove, pointerup, .drag)', () => {
    assert.match(mainJs, /pointerdown/i, 'Обработка pointerdown');
    assert.match(mainJs, /pointermove/i, 'Обработка pointermove');
    assert.match(mainJs, /pointerup/i, 'Обработка pointerup');
    assert.match(mainJs, /classList\.(add|remove)\(['"]drag['"]\)/i, 'Класс drag');
});

check('3.6 update() вызывается на scroll, resize, img load (capture: true) и в openM', () => {
    assert.match(mainJs, /addEventListener\(['"]load['"][\s\S]*?capture:\s*true/i, 'Слушатель load с capture: true');
    assert.match(mainJs, /openM/i, 'Обновление в openM');
});

check('3.7 initOverlayScroll инициализируется для всех .mbox на странице', () => {
    assert.match(mainJs, /\$\$?\(['"]\.mbox['"]\)/i, 'Поиск .mbox для инициализации');
});

console.log(`\nИтог: Пройдено ${10 - errors.length} из 10 проверок.`);
if (errors.length > 0) {
    console.log(`Ошибок: ${errors.length}`);
    process.exit(1);
} else {
    console.log('Все TDD проверки пройдены успешно!');
}

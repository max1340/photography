const fs = require('fs');
const path = require('path');
const assert = require('assert');

const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf-8');

console.log('--- Запуск TDD тестов для style.css ---');

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

// 1. Тональный ритм секций
check('1.1 :root содержит --panel: #3d3c31', () => {
    assert.match(css, /--panel:\s*#3d3c31;/i, 'Переменная --panel должна быть #3d3c31');
});

check('1.2 .expertise и .contact имеют background: var(--panel) и border: none', () => {
    assert.match(css, /\.expertise\s*\{[^}]*background:\s*var\(--panel\)/, '.expertise должен иметь background: var(--panel)');
    assert.match(css, /\.expertise\s*\{[^}]*border:\s*none/, '.expertise должен иметь border: none');
    assert.match(css, /\.contact\s*\{[^}]*background:\s*var\(--panel\)/, '.contact должен иметь background: var(--panel)');
    assert.match(css, /\.contact\s*\{[^}]*border:\s*none/, '.contact должен иметь border: none');
});

// 2. Хиро: светлое фото, нижний градиент, тень заголовка
check('2.1 .hero::after имеет правильный градиент (180deg, transparent 55%, rgba(0,0,0,.45) 100%)', () => {
    assert.match(css, /\.hero::after\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*transparent\s+55%,\s*rgba\(0,\s*0,\s*0,\s*\.?45\)\s+100%\)/, 'Неправильный градиент в .hero::after');
});

check('2.2 .hero-title имеет text-shadow: 0 2px 24px rgba(0,0,0,.45)', () => {
    assert.match(css, /\.hero-title\s*\{[^}]*text-shadow:\s*0\s+2px\s+24px\s+rgba\(0,\s*0,\s*0,\s*\.?45\)/, 'hero-title должен иметь легкую тень');
});

check('2.3 С фото в хиро снята темная вуаль (filter: brightness)', () => {
    const heroImgMatch = css.match(/\.hero\s*>\s*\.ph\s+img\s*\{([^}]*)\}/);
    if (heroImgMatch) {
        assert.doesNotMatch(heroImgMatch[1], /brightness\(\.?7\d*\)/, 'Фото не должно иметь затемняющего brightness фильтра');
    }
});

// 3. (03) «Мои работы»: карточки фото с подписью поверх
check('3.1 .wcard .wcard-info имеет position: absolute, bottom: 0 и градиентную подложку с pointer-events: none', () => {
    assert.match(css, /\.wcard-info\s*\{[^}]*position:\s*absolute/, '.wcard-info должен быть position: absolute');
    assert.match(css, /\.wcard-info\s*\{[^}]*bottom:\s*0/, '.wcard-info должен быть прижат к низу bottom: 0');
    assert.match(css, /\.wcard-info\s*\{[^}]*pointer-events:\s*none/, '.wcard-info должен иметь pointer-events: none');
});

check('3.2 .wcard .wcard-info .sub имеет ограничение в 2 строки', () => {
    assert.match(css, /\.wcard-info\s+\.sub\s*\{[^}]*-webkit-line-clamp:\s*2/, '.wcard-info .sub должен иметь line-clamp: 2');
});

check('3.3 «ПОДРОБНЕЕ» оформлен как тонкая полноширинная плашка', () => {
    assert.match(css, /\.wcard-info\s+\.btn-outline\s*\{[^}]*width:\s*100%/, 'Кнопка ПОДРОБНЕЕ должна быть width: 100%');
    assert.match(css, /\.wcard-info\s+\.btn-outline\s*\{[^}]*pointer-events:\s*auto/, 'Кнопка ПОДРОБНЕЕ должна иметь pointer-events: auto');
});

// 4. Вертикальный ритм
check('4.1 .expertise { margin-top: 70px; }', () => {
    assert.match(css, /\.expertise\s*\{[^}]*margin-top:\s*70px/, '.expertise margin-top должен быть 70px');
});

check('4.2 .works-head { padding: 70px 6px 0; }', () => {
    assert.match(css, /\.works-head\s*\{[^}]*padding:\s*70px\s+6px\s+0/, '.works-head padding должен быть 70px 6px 0');
});

check('4.3 .works-grid { margin-top: 36px; }', () => {
    assert.match(css, /\.works-grid\s*\{[^}]*margin-top:\s*36px/, '.works-grid margin-top должен быть 36px');
});

check('4.4 .blog-head { padding: 70px 6px 0; }', () => {
    assert.match(css, /\.blog-head\s*\{[^}]*padding:\s*70px\s+6px\s+0/, '.blog-head padding должен быть 70px 6px 0');
});

check('4.5 .contact { margin-top: 80px; }', () => {
    assert.match(css, /\.contact\s*\{[^}]*margin-top:\s*80px/, '.contact margin-top должен быть 80px');
});

// 5. Карточки сцен в хиро
check('5.1 .hero-side width: min(560px, 100%) и .hcard flex: 0 0 250px (срез 3-й карточки)', () => {
    assert.match(css, /\.hero-side\s*\{[^}]*width:\s*min\(560px,\s*100%\)/, '.hero-side должен быть min(560px, 100%)');
    assert.match(css, /\.hcard\s*\{[^}]*flex:\s*0\s+0\s+250px/, '.hcard должен быть flex: 0 0 250px');
});

// 6. Заголовок контактов
check('6.1 .contact-top h2 имеет серый базовый тон (var(--gray))', () => {
    assert.match(css, /\.contact-top\s+h2\s*\{[^}]*color:\s*var\(--gray\)/, '.contact-top h2 должен иметь color: var(--gray)');
});

console.log(`\nИтог: Пройдено ${14 - errors.length} из 14 проверок.`);
if (errors.length > 0) {
    console.log(`Ошибок: ${errors.length}`);
    process.exit(1);
} else {
    console.log('Все TDD проверки пройдены успешно!');
}

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Запуск TDD тестов для разделения ролей секций (02) и (03) ---');

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

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf-8');

// 1. (03) Тексты и отсутствие data-content-key
check('1.1 Заголовок секции (03) содержит "Избранные кадры" и не имеет data-content-key', () => {
    assert.match(indexHtml, /<span class="w">Избранные кадры<\/span>,\s*которые я привожу из каждой экспедиции/, 'Текст заголовка (03) должен быть обновлен');
    assert.doesNotMatch(indexHtml, /data-content-key=["']worksTitle["']/, 'data-content-key=worksTitle должен быть удален');
});

check('1.2 Описание секции (03) обновлено и не имеет data-content-key', () => {
    assert.match(indexHtml, /Несколько кадров, которые я не мог оставить в архиве\. Клик по карточке откроет детали съёмки, полная коллекция — в галерее\./, 'Текст описания (03) должен быть обновлен');
    assert.doesNotMatch(indexHtml, /data-content-key=["']worksDesc["']/, 'data-content-key=worksDesc должен быть удален');
});

// 2. (03) Независимость #worksGrid от фильтров и рендеринг 4 карточек
check('2.1 renderWorksList показывает первые 4 элемента из allWorks', () => {
    assert.match(mainJs, /allWorks\.slice\(0,\s*4\)/, 'renderWorksList должен брать первые 4 элемента из allWorks');
});

check('2.2 #expCats и selectCategory НЕ вызывают renderWorksList', () => {
    const selectCatMatch = mainJs.match(/function\s+selectCategory\([^)]*\)\s*\{([\s\S]*?)\}/);
    if (selectCatMatch) {
        assert.doesNotMatch(selectCatMatch[1], /renderWorksList/, 'selectCategory не должен вызывать renderWorksList');
    }
    const initCatMatch = mainJs.match(/function\s+initCategories\([^)]*\)\s*\{([\s\S]*?)\}/);
    if (initCatMatch) {
        assert.doesNotMatch(initCatMatch[1], /addEventListener\(['"]click['"].*?renderWorksList/, 'Клик по категориям не должен вызывать renderWorksList');
    }
});

// 3. (03) Кнопка #viewAllWorksBtn и стрелка ведут на gallery.html
check('3.1 viewAllWorksBtn ведет на gallery.html', () => {
    assert.match(mainJs, /viewAllWorksBtn[\s\S]*?location\.href\s*=\s*['"]gallery\.html['"]/, 'viewAllWorksBtn должен вести на gallery.html');
});

// 4. (02) Ссылка «Смотреть все» в (02) с динамической категорией
check('4.1 В секции (02) есть ссылка #expSeeAll', () => {
    assert.match(indexHtml, /id=["']expSeeAll["']/, 'В index.html должен присутствовать элемент #expSeeAll');
});

check('4.2 expSeeAll ведет на gallery.html?cat=... в зависимости от currentCategory', () => {
    assert.match(mainJs, /gallery\.html\?cat=\s*['"]?\s*\+\s*encodeURIComponent\(currentCategory\)/, 'expSeeAll должен формировать URL с ?cat=');
});

console.log(`\nИтог: Ошибок ${errors.length}`);
if (errors.length > 0) {
    process.exit(1);
} else {
    console.log('Все TDD проверки разделения ролей пройдены!');
}

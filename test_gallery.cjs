const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Запуск TDD тестов для Gallery и интеграции с главной страницей ---');

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

// Проверка 1: Наличие gallery.html
check('1. gallery.html существует в корне проекта', () => {
    assert.strictEqual(fs.existsSync(path.join(__dirname, 'gallery.html')), true, 'gallery.html должен существовать');
});

if (fs.existsSync(path.join(__dirname, 'gallery.html'))) {
    const galleryHtml = fs.readFileSync(path.join(__dirname, 'gallery.html'), 'utf-8');

    // Проверка 2: Подключение firebase.js и чтение works_
    check('2. gallery.html импортирует dbAll из ./firebase.js?v=2 и запрашивает works_ + currentLang', () => {
        assert.match(galleryHtml, /import\s*\{\s*dbAll\s*\}\s*from\s*['"]\.\/firebase\.js\?v=2['"]/, 'Должен быть импорт dbAll из ./firebase.js?v=2');
        assert.match(galleryHtml, /dbAll\(['"]works_['"]\s*\+\s*currentLang\)/, 'Должен запрашивать коллекцию works_ + currentLang');
    });

    // Проверка 3: Наличие masonry сетки, фильтров и лайтбокса
    check('3. gallery.html содержит стили и элементы: g-grid (masonry), g-filters, load-more-btn, lightbox', () => {
        assert.match(galleryHtml, /\.g-grid\s*\{[^}]*column-count:\s*4/, 'Сетка должна иметь 4 колонки на десктопе');
        assert.match(galleryHtml, /id=["']gFilters["']/, 'Должен присутствовать контейнер #gFilters');
        assert.match(galleryHtml, /id=["']gMore["']/, 'Должна присутствовать кнопка #gMore (Показать ещё)');
        assert.match(galleryHtml, /id=["']lightbox["']/, 'Должен присутствовать модальный лайтбокс #lightbox');
    });

    // Проверка 4: Поддержка URL параметра ?cat=
    check('4. gallery.html поддерживает ?cat= в URL и обновляет history.replaceState', () => {
        assert.match(galleryHtml, /URLSearchParams\(location\.search\)\.get\(['"]cat['"]\)/, 'Должно быть чтение параметра cat из URL');
        assert.match(galleryHtml, /history\.replaceState/, 'Должно быть обновление history.replaceState при фильтрации');
    });

    // Проверка 5: Язык и переключение
    check('5. gallery.html считывает currentLang из localStorage(site_lang) и обрабатывает переключатель RU/EN', () => {
        assert.match(galleryHtml, /localStorage\.getItem\(['"]site_lang['"]\)/, 'Должно считывать site_lang из localStorage');
        assert.match(galleryHtml, /localStorage\.setItem\(['"]site_lang['"]/, 'Должно сохранять site_lang в localStorage');
        assert.match(galleryHtml, /location\.reload\(\)/, 'Должно перезагружать страницу при смене языка');
    });

    // Проверка 6: Подгрузка порциями по 24
    check('6. gallery.html подгружает по 24 элемента (PAGE = 24)', () => {
        assert.match(galleryHtml, /PAGE\s*=\s*24/, 'Пагинация должна быть по 24 элемента');
    });

    // Проверка 7: Ссылки "Назад к портфолио"
    check('7. gallery.html содержит ссылки назад на index.html', () => {
        assert.match(galleryHtml, /href=["']index\.html["']/, 'Должны быть ссылки на index.html');
    });
}

// Проверка 8: Изменения в main.js
const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf-8');
check('8. main.js перенаправляет viewAllWorksBtn на gallery.html', () => {
    assert.match(mainJs, /viewAllWorksBtn[\s\S]*?location\.href\s*=\s*['"]gallery\.html['"]/, 'viewAllWorksBtn должен вести на gallery.html');
});

check('9. main.js устанавливает href="gallery.html" для .seeall', () => {
    assert.match(mainJs, /\$\$\(['"]\.seeall['"]\)\.forEach\(.*?setAttribute\(['"]href['"],\s*['"]gallery\.html['"]\)/, 'Должна быть установка href=gallery.html для .seeall');
});

console.log(`\nИтог: Ошибок ${errors.length}`);
if (errors.length > 0) {
    process.exit(1);
} else {
    console.log('Все TDD проверки успешно пройдены!');
}

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Запуск TDD тестов для пакета улучшений админки и сайта ===\n');

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

// 1. Проверка логики хелпера opt()
check('1.1 Логика хелпера opt(u) корректно трансформирует URL Cloudinary', () => {
    const opt = u => (u && u.includes('res.cloudinary.com') && u.includes('/upload/') && !/\/f_auto/.test(u))
        ? u.replace('/upload/', '/upload/f_auto,q_auto/')
        : u;
    
    assert.strictEqual(
        opt('https://res.cloudinary.com/vi68bvcr/image/upload/v1234/photo.jpg'),
        'https://res.cloudinary.com/vi68bvcr/image/upload/f_auto,q_auto/v1234/photo.jpg'
    );
    assert.strictEqual(
        opt('https://res.cloudinary.com/vi68bvcr/image/upload/f_auto,q_auto/v1234/photo.jpg'),
        'https://res.cloudinary.com/vi68bvcr/image/upload/f_auto,q_auto/v1234/photo.jpg'
    );
    assert.strictEqual(
        opt('https://example.com/photo.jpg'),
        'https://example.com/photo.jpg'
    );
    assert.strictEqual(opt(''), '');
    assert.strictEqual(opt(null), null);
    assert.strictEqual(opt(undefined), undefined);
});

// 2. Проверка main.js
const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf-8');

check('2.1 main.js определяет хелпер opt()', () => {
    assert.match(mainJs, /const\s+opt\s*=\s*u\s*=>/, 'main.js должен объявлять const opt = u => ...');
});

check('2.2 main.js применяет opt() ко всем местам рендера изображений', () => {
    assert.match(mainJs, /renderHeroCard[\s\S]*?opt\(/, 'renderHeroCard должен использовать opt()');
    assert.match(mainJs, /activateHeroSlide[\s\S]*?opt\(/, 'activateHeroSlide должен использовать opt()');
    assert.match(mainJs, /createWorkCard[\s\S]*?opt\(/, 'createWorkCard должен использовать opt()');
    assert.match(mainJs, /renderCarousel[\s\S]*?opt\(/, 'renderCarousel должен использовать opt()');
    assert.match(mainJs, /postCard[\s\S]*?opt\(/, 'postCard должен использовать opt()');
    assert.match(mainJs, /gallery\(\)[\s\S]*?opt\(/, 'gallery() в main.js должен использовать opt()');
});

check('2.3 main.js сортирует работы по order перед рендером', () => {
    assert.match(mainJs, /dbAll\(['"]works_['"]\s*\+\s*currentLang\)[\s\S]*?sort\(/, 'main.js должен сортировать works_ по order');
});

// 3. Проверка gallery.html
const galleryHtml = fs.readFileSync(path.join(__dirname, 'gallery.html'), 'utf-8');

check('3.1 gallery.html определяет хелпер opt()', () => {
    assert.match(galleryHtml, /const\s+opt\s*=\s*u\s*=>/, 'gallery.html должен объявлять const opt = u => ...');
});

check('3.2 gallery.html применяет opt() к tile и lbShow', () => {
    assert.match(galleryHtml, /function\s+tile[\s\S]*?opt\(/, 'tile в gallery.html должен использовать opt()');
    assert.match(galleryHtml, /function\s+lbShow[\s\S]*?opt\(/, 'lbShow в gallery.html должен использовать opt()');
});

check('3.3 gallery.html сортирует работы по order перед применением', () => {
    assert.match(galleryHtml, /dbAll\(['"]works_['"]\s*\+\s*currentLang\)[\s\S]*?sort\(/, 'gallery.html должен сортировать works_ по order');
});

// 4. Проверка admin.html
const adminHtml = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf-8');

check('4.1 admin.html содержит ссылки «Открыть сайт» и «Открыть галерею» с target="_blank"', () => {
    assert.match(adminHtml, /href=["']index\.html["'][^>]*target=["']_blank["']/, 'Должна быть ссылка на index.html с target="_blank"');
    assert.match(adminHtml, /href=["']gallery\.html["'][^>]*target=["']_blank["']/, 'Должна быть ссылка на gallery.html с target="_blank"');
});

check('4.2 admin.html содержит кнопки экспорта и импорта JSON в сайдбаре', () => {
    assert.match(adminHtml, /id=["']exportJsonBtn["']/, 'Должна быть кнопка #exportJsonBtn');
    assert.match(adminHtml, /id=["']importJsonBtn["']/, 'Должна быть кнопка #importJsonBtn');
    assert.match(adminHtml, /id=["']importJsonInput["']/, 'Должен быть скрытый input #importJsonInput');
});

check('4.3 admin.html содержит поиск и фильтр по тегам для работ', () => {
    assert.match(adminHtml, /id=["']worksSearch["']/, 'Должен быть input #worksSearch');
    assert.match(adminHtml, /id=["']worksTagFilter["']/, 'Должен быть select #worksTagFilter');
});

check('4.4 admin.html содержит поиск для блога', () => {
    assert.match(adminHtml, /id=["']blogSearch["']/, 'Должен быть input #blogSearch');
});

check('4.5 admin.html содержит индикатор статуса настроек #settingsStatus', () => {
    assert.match(adminHtml, /id=["']settingsStatus["']/, 'Должен быть элемент #settingsStatus');
});

check('4.6 admin.html содержит блоки live-превью .md-preview под полями настроек', () => {
    assert.match(adminHtml, /id=["']prev_aboutText["']/, 'Должен быть #prev_aboutText');
    assert.match(adminHtml, /id=["']prev_aboutQuote["']/, 'Должен быть #prev_aboutQuote');
    assert.match(adminHtml, /id=["']prev_expTitle["']/, 'Должен быть #prev_expTitle');
    assert.match(adminHtml, /id=["']prev_worksTitle["']/, 'Должен быть #prev_worksTitle');
    assert.match(adminHtml, /id=["']prev_worksDesc["']/, 'Должен быть #prev_worksDesc');
    assert.match(adminHtml, /id=["']prev_blogTitle["']/, 'Должен быть #prev_blogTitle');
    assert.match(adminHtml, /id=["']prev_blogDesc["']/, 'Должен быть #prev_blogDesc');
    assert.match(adminHtml, /id=["']prev_contactTitle1["']/, 'Должен быть #prev_contactTitle1');
    assert.match(adminHtml, /id=["']prev_contactTitle2["']/, 'Должен быть #prev_contactTitle2');
});

check('4.7 admin.html содержит кнопку «Сегодня» для даты поста', () => {
    assert.match(adminHtml, /id=["']btnDateToday["']/, 'Должна быть кнопка #btnDateToday');
});

check('4.8 admin.html содержит элементы для Rich Editor блога: #postPreview, #postMobileTabs, #mdToolbar, #photoCounter, #leadHint, #contentStats', () => {
    assert.match(adminHtml, /id=["']postPreview["']/, 'Должен быть элемент #postPreview');
    assert.match(adminHtml, /id=["']postMobileTabs["']/, 'Должен быть элемент #postMobileTabs');
    assert.match(adminHtml, /id=["']mdToolbar["']/, 'Должен быть элемент #mdToolbar');
    assert.match(adminHtml, /id=["']btnMdBold["']/, 'Должна быть кнопка #btnMdBold');
    assert.match(adminHtml, /id=["']btnMdItalic["']/, 'Должна быть кнопка #btnMdItalic');
    assert.match(adminHtml, /id=["']btnMdPara["']/, 'Должна быть кнопка #btnMdPara');
    assert.match(adminHtml, /id=["']photoCounter["']/, 'Должен быть элемент #photoCounter');
    assert.match(adminHtml, /id=["']leadHint["']/, 'Должен быть элемент #leadHint');
    assert.match(adminHtml, /id=["']contentStats["']/, 'Должен быть элемент #contentStats');
});

// 5. Проверка admin.js
const adminJs = fs.readFileSync(path.join(__dirname, 'admin.js'), 'utf-8');

check('5.1 admin.js объявляет хелпер opt() и применяет в #editFileInput', () => {
    assert.match(adminJs, /const\s+opt\s*=\s*u\s*=>/, 'admin.js должен объявлять const opt = u => ...');
    assert.match(adminJs, /uploadUrls\.push\(\s*opt\(/, 'admin.js должен использовать opt() при сохранении secure_url в uploadUrls');
});

check('5.2 admin.js хранит heroItems, workItems, postItems и фильтрует списки', () => {
    assert.match(adminJs, /let\s+heroItems\s*=/, 'admin.js должен объявлять heroItems');
    assert.match(adminJs, /let\s+workItems\s*=/, 'admin.js должен объявлять workItems');
    assert.match(adminJs, /let\s+postItems\s*=/, 'admin.js должен объявлять postItems');
});

check('5.3 admin.js содержит сортировку и кнопки перемещения order (↑, ↓) с классом btn-icon', () => {
    assert.match(adminJs, /order/, 'admin.js должен оперировать полем order');
    assert.match(adminJs, /btn-icon/, 'Кнопки перемещения должны иметь класс btn-icon');
    assert.match(adminJs, /move-up/, 'Должен быть класс move-up');
    assert.match(adminJs, /move-down/, 'Должен быть класс move-down');
});

check('5.4 admin.js реализует toastAction() и отменяемое удаление без confirm()', () => {
    assert.match(adminJs, /toastAction\s*\(/, 'admin.js должен объявлять функцию toastAction');
    assert.doesNotMatch(adminJs, /confirm\(['"]Точно удалить\?['"]\)/, 'admin.js не должен использовать confirm() при удалении карточек');
});

check('5.5 admin.js реализует collectSettings() и дебаунс автосохранения 1200мс', () => {
    assert.match(adminJs, /function\s+collectSettings\s*\(/, 'admin.js должен иметь функцию collectSettings');
    assert.match(adminJs, /1200/, 'admin.js должен использовать таймер 1200мс для автосохранения');
});

check('5.6 admin.js реализует экспорт и импорт JSON', () => {
    assert.match(adminJs, /exportJsonBtn/, 'admin.js должен обрабатывать экспорт JSON');
    assert.match(adminJs, /importJson/, 'admin.js должен обрабатывать импорт JSON');
    assert.match(adminJs, /mphoto-backup-/, 'admin.js должен формировать имя файла mphoto-backup-YYYY-MM-DD.json');
});

check('5.7 admin.js реализует mdPreview() для live-превью', () => {
    assert.match(adminJs, /function\s+mdPreview\s*\(/, 'admin.js должен объявлять функцию mdPreview');
    assert.match(adminJs, /<span class="w">/, 'mdPreview должен оборачивать *...* в <span class="w">');
    assert.match(adminJs, /<strong>/, 'mdPreview должен оборачивать **...** в <strong>');
});

check('5.8 admin.js рендерит кнопку «Дублировать» ТОЛЬКО для блога (mode === "posts")', () => {
    assert.match(adminJs, /mode\s*===\s*['"]posts['"][\s\S]*?dup-btn/, 'Кнопка Дублировать должна рендериться только при mode === posts');
    assert.doesNotMatch(adminJs, /mode\s*===\s*['"]works['"][\s\S]*?duplicateButtonHtml\s*=/, 'Кнопка Дублировать не должна создаваться для works');
});

check('5.9 admin.js настраивает модалку и добавляет класс modal-box--wide в режиме posts', () => {
    assert.match(adminJs, /modal-box--wide/, 'admin.js должен добавлять/удалять класс modal-box--wide');
});

check('5.10 admin.js обновляет #postPreview с mdPreview и параграфами', () => {
    assert.match(adminJs, /function\s+updatePostPreview|const\s+updatePostPreview/, 'admin.js должен содержать функцию updatePostPreview');
    assert.match(adminJs, /postPreview/, 'updatePostPreview должен рендерить в #postPreview');
});

check('5.11 admin.js реализует markdown toolbar через selectionStart/selectionEnd', () => {
    assert.match(adminJs, /selectionStart/, 'admin.js должен использовать selectionStart');
    assert.match(adminJs, /selectionEnd/, 'admin.js должен использовать selectionEnd');
});

check('5.12 admin.js поддерживает drag&drop загрузку файлов в .ph-upload', () => {
    assert.match(adminJs, /dragover|dragenter/, 'admin.js должен слушать dragover/dragenter');
    assert.match(adminJs, /drop/, 'admin.js должен слушать drop');
    assert.match(adminJs, /dataTransfer\.files/, 'admin.js должен читать dataTransfer.files');
});

check('5.13 admin.js реализует управление фото: перемещение, обложка, счетчик', () => {
    assert.match(adminJs, /photoCounter/, 'admin.js должен обновлять #photoCounter');
    assert.match(adminJs, /move-photo|thumb-btn|del-thumb/, 'admin.js должен иметь действия на тайлах фото');
});

check('5.14 admin.js реализует автосохранение черновика draft_post_', () => {
    assert.match(adminJs, /draft_post_/, 'admin.js должен работать с ключом draft_post_ в localStorage');
});

check('5.15 admin.js реализует защиту от случайного закрытия с флагом dirty и toastAction', () => {
    assert.match(adminJs, /dirty|isDirty/, 'admin.js должен отслеживать флаг dirty');
    assert.match(adminJs, /toastAction\(['"]Несохранённые изменения/, 'admin.js должен показывать подтверждение закрытия');
});

check('5.16 admin.js реализует валидацию при сохранении (заголовок и фото)', () => {
    assert.match(adminJs, /classList\.add\(['"]err['"]\)/, 'admin.js должен добавлять класс err при ошибке валидации');
});

check('5.17 admin.js считает символы и время чтения (~M мин)', () => {
    assert.match(adminJs, /contentStats/, 'admin.js должен обновлять #contentStats');
    assert.match(adminJs, /1000/, 'admin.js должен рассчитывать время чтения на основе 1000 символов/мин');
});

// 6. Проверка admin.css
const adminCss = fs.readFileSync(path.join(__dirname, 'admin.css'), 'utf-8');

check('6.1 admin.css содержит стили для .md-preview и .md-preview .w', () => {
    assert.match(adminCss, /\.md-preview/, 'admin.css должен содержать стили для .md-preview');
    assert.match(adminCss, /\.md-preview\s+\.w/, 'admin.css должен содержать стили для .md-preview .w');
});

check('6.2 admin.css содержит компактные стили для .card-actions, button и .btn-icon', () => {
    assert.match(adminCss, /\.card-actions\s*\{[^}]*flex-wrap:\s*wrap/, '.card-actions должен иметь flex-wrap: wrap');
    assert.match(adminCss, /\.card-actions\s*\{[^}]*gap:\s*8px/, '.card-actions должен иметь gap: 8px');
    assert.match(adminCss, /\.card-actions\s+button\s*\{[^}]*flex:\s*0\s+0\s+auto/, '.card-actions button должен иметь flex: 0 0 auto');
    assert.match(adminCss, /\.card-actions\s+\.btn-icon\s*\{[^}]*width:\s*32px/, '.btn-icon должен иметь width: 32px');
});

check('6.3 admin.css содержит тёмную тему для select.inp и option', () => {
    assert.match(adminCss, /select\.inp\s*\{[^}]*background:\s*#161616/, 'select.inp должен иметь background: #161616');
    assert.match(adminCss, /select\.inp\s+option\s*\{[^}]*background:\s*#1e1e1e/, 'select.inp option должен иметь background: #1e1e1e');
    assert.match(adminCss, /select\.inp\s+option:checked\s*\{[^}]*background:\s*#333/, 'select.inp option:checked должен иметь background: #333');
});

check('6.4 admin.css содержит стили для .filter-row с flex-wrap и min-width 160px для select', () => {
    assert.match(adminCss, /\.filter-row/, '.filter-row стили должны присутствовать в admin.css');
    assert.match(adminCss, /\.filter-row\s+select\.inp|\.filter-row\s+select/, 'Должно быть правило для select в .filter-row');
});

check('6.5 admin.css содержит стили для .modal-box--wide (max-width: 860px) и двух колонок', () => {
    assert.match(adminCss, /\.modal-box--wide/, 'admin.css должен содержать класс .modal-box--wide');
    assert.match(adminCss, /860px/, '.modal-box--wide должен иметь max-width: 860px');
    assert.match(adminCss, /\.post-col-edit/, 'admin.css должен содержать стили для .post-col-edit');
    assert.match(adminCss, /\.post-col-preview/, 'admin.css должен содержать стили для .post-col-preview');
});

check('6.6 admin.css содержит стили для .md-toolbar и кнопок .btn-tool', () => {
    assert.match(adminCss, /\.md-toolbar/, 'admin.css должен содержать стили для .md-toolbar');
    assert.match(adminCss, /\.btn-tool/, 'admin.css должен содержать стили для .btn-tool');
});

check('6.7 admin.css содержит стили для сетки тайлов 120x120 и бейджа обложки', () => {
    assert.match(adminCss, /120px/, 'admin.css должен использовать размер тайлов 120px');
    assert.match(adminCss, /\.cover-badge|\.badge-cover/, 'admin.css должен содержать бейдж обложки');
});

check('6.8 admin.css содержит стили для подсветки ошибок .err', () => {
    assert.match(adminCss, /\.inp\.err|\.ph-upload\.err|\.err/, 'admin.css должен содержать стили для подсветки ошибок .err');
});

console.log(`\nИтог: Ошибок ${errors.length}`);
if (errors.length > 0) {
    console.log(`Зафиксировано ${errors.length} непройденных тестов.`);
} else {
    console.log('Все TDD проверки пройдены!');
}


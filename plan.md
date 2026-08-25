# План разработки проекта (plan.md)

## Завершено: Кастомные скроллбары по гибридной схеме и оверлей-индикатор для модалок

- [x] 1. **Поддержка Firefox в админке**: `scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.25) #111111;` в `admin.css`.
- [x] 2. **Скрытие нативного скролла у `.mbox`**: `scrollbar-width: none;` и `::-webkit-scrollbar { display: none; }` в `style.css`.
- [x] 3. **Стили оверлей-индикатора `.os-thumb`**: `position: fixed; width: 4px; border-radius: 99px; background: rgba(255,255,255,.28);` с состояниями `.show`, `:hover` и `.drag` в `style.css`.
- [x] 4. **Логика `initOverlayScroll(mbox)` в `main.js`**:
  - [x] Проверка условия `scrollHeight <= clientHeight + 4` (индикатор скрыт).
  - [x] Расчет геометрии (высота `max(40, clientHeight^2 / scrollHeight)`, `top`, `left = rect.right - 10`).
  - [x] Плавное появление при скролле/mouseenter и исчезновение через 800мс после остановки.
  - [x] Поддержка перетаскивания (Drag) с захватом курсора (`setPointerCapture`) и пересчетом `scrollTop`.
  - [x] Обновление на `scroll`, `resize`, при открытии `openM(m)` и на событии `load` картинок (`capture: true`).
  - [x] Инициализация для всех `.mbox` при старте страницы.
- [x] 5. **TDD Тесты**: Все проверки в `test_scrollbars.cjs` успешно пройдены (10/10 PASS).

## Завершено: Улучшение модалки чтения поста блога (#postView)

- [x] 1. **TDD Тесты**: Разработка набора тестов в `test_post_view.cjs` для проверки всех требований:
  - [x] 1.1 Лид поста (`#pvLead`, `.pv-lead`, `border-left: 2px solid rgba(255,255,255,.25)`, `16.5px`, `margin: 12px 0 24px`, скрытие при пустом `excerpt`).
  - [x] 1.2 Типографика и шапка (заголовок 27px/1.25, дата + время чтения одной строкой, текст 16px/1.85 ~65ch).
  - [x] 1.3 Карусель фото (оверлей `#pvArrows` по центру кадра `top: 50%`, темные полупрозрачные кнопки с блюром, счётчик `#pvCount`, `max-height: 48vh`, `border-radius: 0`, фон `transparent`, синхронизация со скроллом, скрытие при 1 фото).
  - [x] 1.4 Форма модалки (`.modal#postView .mbox` ширина `min(780px, 94vw)`).
  - [x] 1.5 Подпись автора (`#pvSign`, `.pv-sign`, RU/EN локализация).
  - [x] 1.6 Проверка отсутствия запрещенных элементов (диплинки, перелинковка постов, шаринг).
- [x] 2. **Разметка `index.html`**:
  - [x] 2.1 Перенос `#pvArrows` внутрь `.blog-carousel`.
  - [x] 2.2 Добавление `#pvCount` внутрь `.blog-carousel`.
  - [x] 2.3 Добавление `#pvLead` после `#pvTitle`.
  - [x] 2.4 Добавление `#pvSign` после `#pvContent`.
- [x] 3. **Стили `style.css`**:
  - [x] 3.1 Стили `.pv-lead` (16px, var(--gray), line-height: 1.7, margin: 10px 0 18px, max-width: 65ch).
  - [x] 3.2 Стили заголовка и текста для `.modal#postView` (27px / 1.25, 15.5px / 1.85, color: #d6d5cf, max-width: 65ch).
  - [x] 3.3 Стили `.blog-carousel` (`position: relative;`), `#pvArrows` (оверлей по бокам `position: absolute; inset: 0`), `#pvArrows .arr` (40x40px, pointer-events: auto).
  - [x] 3.4 Стили `.bc-slide img` (`max-height: 48vh`).
  - [x] 3.5 Стили `.bc-count` (absolute, top/right 12px, backdrop-filter, rounded pill).
  - [x] 3.6 Стили `.modal#postView .mbox` (`width: min(780px, 94vw)`).
  - [x] 3.7 Стили `.pv-sign` (margin-top: 26px, color: var(--gray), font-size: 13px, letter-spacing: .04em).
- [x] 4. **Логика `main.js`**:
  - [x] 4.1 Вывод времени чтения в `#pvDate` (`p.date + ' · ' + N + ' мин чтения'` / `'min read'`).
  - [x] 4.2 Установка `#pvLead` с сокрытием при отсутствии `excerpt`.
  - [x] 4.3 Управление счетчиком фото `#pvCount` и стрелками `#pvArrows` при открытии.
  - [x] 4.4 Сброс скролла `#pvTrack` на 0 при открытии поста.
  - [x] 4.5 Обработчик скролла `#pvTrack` для динамического обновления счётчика «i / total».
  - [x] 4.6 Установка подписи `#pvSign` в зависимости от языка.
- [x] 5. **Тестирование и валидация**:
  - [x] 5.1 Успешное выполнение `test_post_view.cjs` (14/14 тестов PASS).
  - [x] 5.2 Прогон всех регрессионных тестов (`test_styles.cjs`, `test_gallery.cjs`, `test_roles.cjs`, `test_admin_suite.cjs`) — 100% PASS.
  - [x] 5.3 Полная проверка соответствия требованиям пользователя и отсутствие регрессий.

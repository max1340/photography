const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

import { auth, dbPut, dbAll, dbDel, dbGetObj, dbSetObj } from './firebase.js?v=2';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// Хелпер Cloudinary URL оптимизации
const opt = u => (u && u.includes('res.cloudinary.com') && u.includes('/upload/') && !/\/f_auto/.test(u))
    ? u.replace('/upload/', '/upload/f_auto,q_auto/')
    : u;

// Язык админки
let currentAdminLang = localStorage.getItem('admin_lang') || 'ru';
const updateAdminLangUI = () => {
    $$('#adminLangSwitch span').forEach(s => s.classList.toggle('active', s.dataset.lang === currentAdminLang));
};
updateAdminLangUI();
$$('#adminLangSwitch span').forEach(s => {
    s.onclick = () => {
        if (s.dataset.lang !== currentAdminLang) {
            currentAdminLang = s.dataset.lang;
            localStorage.setItem('admin_lang', currentAdminLang);
            updateAdminLangUI();
            if ($('#dashboard').style.display === 'flex') {
                loadAllData();
                loadSettings();
            }
        }
    };
});

// Флаг несохранённых изменений
let isDirty = false;
function setDirty(val) {
    isDirty = val;
}

// Уведомления и отменяемые действия
let toastTimer = null;
const toast = (msg) => {
    const t = $('#toast');
    t.innerHTML = `<span>${msg}</span>`;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
};

const toastAction = (msg, actionText, callback) => {
    const t = $('#toast');
    t.innerHTML = `<span>${msg}</span> <button class="toast-act-btn" type="button">${actionText}</button>`;
    t.classList.add('show');
    clearTimeout(toastTimer);
    const actBtn = t.querySelector('.toast-act-btn');
    if (actBtn) {
        actBtn.onclick = async (e) => {
            e.stopPropagation();
            t.classList.remove('show');
            clearTimeout(toastTimer);
            if (callback) await callback();
        };
    }
    toastTimer = setTimeout(() => t.classList.remove('show'), 6000);
};

// Модальные окна и защита от закрытия при несохранённых изменениях
const openM = m => { m.classList.add('open'); };
const closeM = m => { m.classList.remove('open'); };

$$('.modal').forEach(m => {
    m.addEventListener('click', e => {
        const isCloseBtn = e.target.closest('[data-close]');
        const isBackdrop = e.target === m;
        if (isCloseBtn || isBackdrop) {
            if (m.id === 'editModal' && isDirty) {
                toastAction('Несохранённые изменения', 'Закрыть', () => {
                    setDirty(false);
                    closeM(m);
                });
            } else {
                closeM(m);
            }
        }
    });
});

// Сжатие фото
function compress(file) {
    return new Promise((res, rej) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const max = 1920;
            let w = img.naturalWidth, h = img.naturalHeight;
            const k = Math.min(1, max / Math.max(w, h));
            w = Math.round(w * k);
            h = Math.round(h * k);
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            res(c.toDataURL('image/jpeg', 0.85));
            URL.revokeObjectURL(url);
        };
        img.onerror = rej;
        img.src = url;
    });
}

// Состояние загрузки фото и список URL
let uploadUrls = [];
let isUploading = false;

function renderUploadPreviews() {
    const container = $('#uploadPreviewContainer');
    const uploadText = $('#uploadText');
    const photoCounter = $('#photoCounter');
    
    if (photoCounter) {
        photoCounter.textContent = `Фото: ${uploadUrls.length}`;
        photoCounter.style.display = (currentMode === 'posts' || currentMode === 'blog') ? 'inline' : 'none';
    }
    
    if (uploadUrls.length === 0 && !isUploading) {
        container.innerHTML = '';
        uploadText.textContent = 'Загрузить фото (или перетащите сюда)';
        uploadText.style.display = 'block';
        return;
    }
    
    uploadText.textContent = uploadUrls.length > 0 ? '+ Загрузить / добавить ещё фото' : 'Загрузить фото (или перетащите сюда)';
    uploadText.style.display = 'block';
    
    const isPostsMode = currentMode === 'posts' || currentMode === 'blog';
    
    let html = uploadUrls.map((u, i) => {
        const isFirst = i === 0;
        const isLast = i === uploadUrls.length - 1;
        
        let badgeHtml = '';
        if (isFirst && isPostsMode) {
            badgeHtml = '<div class="cover-badge">Обложка</div>';
        }
        
        let actionsHtml = '';
        if (isPostsMode) {
            actionsHtml = `
                <div class="tile-actions">
                    <button type="button" class="move-photo-left" data-idx="${i}" ${isFirst ? 'disabled' : ''} title="Сдвинуть влево">←</button>
                    ${!isFirst ? `<button type="button" class="thumb-btn make-cover" data-idx="${i}" title="Сделать обложкой">★</button>` : ''}
                    <button type="button" class="move-photo-right" data-idx="${i}" ${isLast ? 'disabled' : ''} title="Сдвинуть вправо">→</button>
                    <button type="button" class="del-thumb" data-idx="${i}" title="Удалить">×</button>
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="tile-actions">
                    <button type="button" class="del-thumb" data-idx="${i}" title="Удалить">×</button>
                </div>
            `;
        }
        
        return `
            <div class="thumb-tile" data-index="${i}">
                ${badgeHtml}
                <img src="${opt(u)}" alt="">
                ${actionsHtml}
            </div>
        `;
    }).join('');
    
    if (isUploading) {
        html += `
            <div class="thumb-tile tile-loading">
                <div class="tile-spinner"></div>
                <span>Загрузка...</span>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    // Обработчики кнопок на тайлах
    container.querySelectorAll('.del-thumb').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx);
            uploadUrls.splice(idx, 1);
            setDirty(true);
            renderUploadPreviews();
            updatePostPreview();
            triggerPostDraftAutosave();
        };
    });
    
    container.querySelectorAll('.move-photo-left').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx);
            if (idx > 0) {
                const temp = uploadUrls[idx];
                uploadUrls[idx] = uploadUrls[idx - 1];
                uploadUrls[idx - 1] = temp;
                setDirty(true);
                renderUploadPreviews();
                updatePostPreview();
                triggerPostDraftAutosave();
            }
        };
    });
    
    container.querySelectorAll('.move-photo-right').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx);
            if (idx < uploadUrls.length - 1) {
                const temp = uploadUrls[idx];
                uploadUrls[idx] = uploadUrls[idx + 1];
                uploadUrls[idx + 1] = temp;
                setDirty(true);
                renderUploadPreviews();
                updatePostPreview();
                triggerPostDraftAutosave();
            }
        };
    });
    
    container.querySelectorAll('.make-cover').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx);
            if (idx > 0) {
                const item = uploadUrls.splice(idx, 1)[0];
                uploadUrls.unshift(item);
                setDirty(true);
                renderUploadPreviews();
                updatePostPreview();
                triggerPostDraftAutosave();
            }
        };
    });
}

// Единый пайплайн загрузки файлов в Cloudinary
async function uploadFiles(files) {
    if (!files || !files.length) return;
    
    isUploading = true;
    renderUploadPreviews();
    $('#editImageBtn').classList.remove('err');
    
    if (currentMode !== 'posts' && currentMode !== 'blog' && currentMode !== 'works') {
        uploadUrls = [];
    }
    
    for (const f of files) {
        try {
            const base64Data = await compress(f);
            const formData = new FormData();
            formData.append('file', base64Data);
            formData.append('upload_preset', 'Photosite');
            
            const res = await fetch('https://api.cloudinary.com/v1_1/vi68bvcr/image/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (data.secure_url) {
                uploadUrls.push(opt(data.secure_url));
                setDirty(true);
                triggerPostDraftAutosave();
            } else {
                toast('Ошибка загрузки: ' + (data.error?.message || 'Неизвестная ошибка'));
            }
        } catch (err) {
            console.error(err);
            toast('Ошибка при загрузке фото');
        }
    }
    
    isUploading = false;
    renderUploadPreviews();
    updatePostPreview();
}

// Выбор фото через диалоговое окно
$('#editImageBtn').onclick = (e) => {
    if (e.target.closest('.thumb-tile')) return;
    $('#editFileInput').value = '';
    $('#editFileInput').multiple = (currentMode === 'blog' || currentMode === 'posts' || currentMode === 'works');
    $('#editFileInput').click();
};

$('#editFileInput').addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    await uploadFiles(files);
});

// Drag & Drop загрузка файлов в .ph-upload
const phUploadEl = $('#editImageBtn');
if (phUploadEl) {
    phUploadEl.addEventListener('dragover', e => {
        e.preventDefault();
        e.stopPropagation();
        phUploadEl.classList.add('drag-over');
    });
    phUploadEl.addEventListener('dragenter', e => {
        e.preventDefault();
        e.stopPropagation();
        phUploadEl.classList.add('drag-over');
    });
    phUploadEl.addEventListener('dragleave', e => {
        e.preventDefault();
        e.stopPropagation();
        phUploadEl.classList.remove('drag-over');
    });
    phUploadEl.addEventListener('drop', async e => {
        e.preventDefault();
        e.stopPropagation();
        phUploadEl.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length) {
                await uploadFiles(files);
            }
        }
    });
}

// Авторизация
onAuthStateChanged(auth, user => {
    if (user) {
        $('#loginOverlay').classList.remove('active');
        $('#dashboard').style.display = 'flex';
        loadAllData();
        loadSettings();
    } else {
        $('#loginOverlay').classList.add('active');
        $('#dashboard').style.display = 'none';
    }
});

$('#adminForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, $('#adminEmail').value, $('#adminPassword').value);
        toast("Успешный вход!");
    } catch(err) { toast("Ошибка: " + err.message); }
});

$('#logoutBtn').onclick = () => signOut(auth);

// Табы сайдбара
$$('.admin-nav a').forEach(a => {
    a.onclick = (e) => {
        e.preventDefault();
        $$('.admin-nav a').forEach(x => x.classList.remove('active'));
        $$('.tab-content').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        $('#tab-' + a.dataset.tab).classList.add('active');
    };
});

// Состояние списков и фильтров
let heroItems = [];
let workItems = [];
let postItems = [];
let worksSearchQuery = '';
let worksSelectedTag = '';
let blogSearchQuery = '';

// Помощник для даты поста "Сегодня"
function getTodayFormatted(lang) {
    const d = new Date();
    const day = d.getDate();
    const year = d.getFullYear();
    if (lang === 'ru') {
        const monthsRu = ['ЯНВАРЯ', 'ФЕВРАЛЯ', 'МАРТА', 'АПРЕЛЯ', 'МАЯ', 'ИЮНЯ', 'ИЮЛЯ', 'АВГУСТА', 'СЕНТЯБРЯ', 'ОКТЯБРЯ', 'НОЯБРЯ', 'ДЕКАБРЯ'];
        return `${day} ${monthsRu[d.getMonth()]} ${year}`;
    } else {
        const monthsEn = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
        return `${monthsEn[d.getMonth()]} ${day}, ${year}`;
    }
}

const btnDateToday = $('#btnDateToday');
if (btnDateToday) {
    btnDateToday.onclick = () => {
        $('#editFieldDate').value = getTodayFormatted(currentAdminLang);
        setDirty(true);
        updatePostPreview();
        triggerPostDraftAutosave();
    };
}

// Live-превью Markdown
function mdPreview(text) {
    if (!text) return '';
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<span class="w">$1</span>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

const PREVIEW_KEYS = [
    'aboutText', 'aboutQuote', 'expTitle', 'worksTitle',
    'worksDesc', 'blogTitle', 'blogDesc', 'contactTitle1', 'contactTitle2'
];

function updateAllMdPreviews() {
    PREVIEW_KEYS.forEach(key => {
        const inputEl = $('#s_' + key);
        const prevEl = $('#prev_' + key);
        if (inputEl && prevEl) {
            prevEl.innerHTML = mdPreview(inputEl.value);
        }
    });
}

// Живое превью поста блога
function updatePostPreview() {
    const postPreview = $('#postPreview');
    if (!postPreview) return;
    
    if (currentMode !== 'posts' && currentMode !== 'blog') return;
    
    const coverUrl = uploadUrls.length > 0 ? uploadUrls[0] : '';
    const date = $('#editFieldDate').value || getTodayFormatted(currentAdminLang);
    const title = $('#editField1').value || 'Заголовок поста';
    const lead = $('#editField2').value;
    const content = $('#editField3').value;
    
    // Подсказка для лида
    const leadHint = $('#leadHint');
    if (leadHint) {
        leadHint.style.display = lead ? 'none' : 'block';
    }
    
    // Статистика контента (символы и время чтения)
    const contentStats = $('#contentStats');
    if (contentStats) {
        const len = content.length;
        const mins = Math.max(1, Math.ceil(len / 1000));
        contentStats.textContent = `${len} символов · ~${mins} мин чтения`;
    }
    
    // Формирование абзацев
    const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const parasHtml = paragraphs.map(p => `<p>${mdPreview(p)}</p>`).join('');
    
    postPreview.innerHTML = `
        ${coverUrl ? `<img src="${opt(coverUrl)}" class="pv-cover" alt="">` : ''}
        <div class="pv-date">${date}</div>
        <h4 class="pv-title">${title}</h4>
        ${lead ? `<div class="pv-lead">${mdPreview(lead)}</div>` : ''}
        <div class="pv-body">${parasHtml || '<p style="color:var(--text-dim); font-style:italic;">Текст поста будет отображаться здесь...</p>'}</div>
    `;
}

// Markdown-тулбар
function wrapSelectedText(before, after, defaultText = '') {
    const ta = $('#editField3');
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;
    const sel = val.substring(start, end) || defaultText;
    const replacement = before + sel + after;
    ta.value = val.substring(0, start) + replacement + val.substring(end);
    ta.focus();
    const newCursor = start + before.length + sel.length;
    ta.setSelectionRange(start + before.length, newCursor);
    setDirty(true);
    updatePostPreview();
    triggerPostDraftAutosave();
}

function insertParaBreak() {
    const ta = $('#editField3');
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;
    ta.value = val.substring(0, start) + '\n\n' + val.substring(end);
    ta.focus();
    ta.setSelectionRange(start + 2, start + 2);
    setDirty(true);
    updatePostPreview();
    triggerPostDraftAutosave();
}

const btnMdBold = $('#btnMdBold');
if (btnMdBold) btnMdBold.onclick = () => wrapSelectedText('**', '**', 'жирный текст');

const btnMdItalic = $('#btnMdItalic');
if (btnMdItalic) btnMdItalic.onclick = () => wrapSelectedText('*', '*', 'выделенный текст');

const btnMdPara = $('#btnMdPara');
if (btnMdPara) btnMdPara.onclick = () => insertParaBreak();

// Мобильный переключатель колонок (Текст / Превью)
$$('#postMobileTabs .btn-tab').forEach(btn => {
    btn.onclick = () => {
        $$('#postMobileTabs .btn-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const col = btn.dataset.col;
        const editCol = $('.post-col-edit');
        const prevCol = $('#postColPreview');
        if (col === 'preview') {
            if (editCol) editCol.classList.add('tab-hidden');
            if (prevCol) prevCol.classList.remove('tab-hidden');
        } else {
            if (editCol) editCol.classList.remove('tab-hidden');
            if (prevCol) prevCol.classList.add('tab-hidden');
        }
    };
});

// Автосохранение черновиков постов
let postDraftTimer = null;
function triggerPostDraftAutosave() {
    if (currentMode !== 'posts' && currentMode !== 'blog') return;
    clearTimeout(postDraftTimer);
    postDraftTimer = setTimeout(() => {
        const editId = $('#editId').value || 'new';
        const draft = {
            title: $('#editField1').value,
            excerpt: $('#editField2').value,
            content: $('#editField3').value,
            date: $('#editFieldDate').value,
            uploadUrls: uploadUrls,
            ts: Date.now()
        };
        localStorage.setItem('draft_post_' + editId, JSON.stringify(draft));
    }, 500);
}

function restorePostDraftIfExists(editId, originalItem = null) {
    const key = 'draft_post_' + (editId || 'new');
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    
    try {
        const draft = JSON.parse(raw);
        if (!draft) return false;
        
        const origTitle = originalItem ? (originalItem.title || '') : '';
        const origContent = originalItem ? (originalItem.content || '') : '';
        const origExcerpt = originalItem ? (originalItem.excerpt || '') : '';
        
        const hasDifferences = (draft.title && draft.title !== origTitle) ||
                              (draft.content && draft.content !== origContent) ||
                              (draft.excerpt && draft.excerpt !== origExcerpt);
                              
        if (hasDifferences) {
            if (draft.title !== undefined) $('#editField1').value = draft.title;
            if (draft.excerpt !== undefined) $('#editField2').value = draft.excerpt;
            if (draft.content !== undefined) $('#editField3').value = draft.content;
            if (draft.date) $('#editFieldDate').value = draft.date;
            if (draft.uploadUrls && draft.uploadUrls.length) {
                uploadUrls = [...draft.uploadUrls];
            }
            renderUploadPreviews();
            updatePostPreview();
            toast('Черновик восстановлен');
            setDirty(true);
            return true;
        }
    } catch(e) {
        console.error('Ошибка чтения черновика:', e);
    }
    return false;
}

// Слушатели ввода в модалке
const editFormEl = $('#editForm');
if (editFormEl) {
    editFormEl.addEventListener('input', e => {
        setDirty(true);
        if (e.target && e.target.classList) {
            e.target.classList.remove('err');
        }
        if (currentMode === 'posts' || currentMode === 'blog') {
            updatePostPreview();
            triggerPostDraftAutosave();
        }
    });
}

// Сбор настроек сайта
function collectSettings() {
    return {
        marqueeText: $('#s_marqueeText').value,
        aboutText: $('#s_aboutText').value,
        aboutQuote: $('#s_aboutQuote').value,
        stat1Num: $('#s_stat1Num').value,
        stat1Text: $('#s_stat1Text').value,
        stat2Num: $('#s_stat2Num').value,
        stat2Text: $('#s_stat2Text').value,
        stat3Num: $('#s_stat3Num').value,
        stat3Text: $('#s_stat3Text').value,
        stat4Num: $('#s_stat4Num').value,
        stat4Text: $('#s_stat4Text').value,
        expTitle: $('#s_expTitle').value,
        worksTitle: $('#s_worksTitle').value,
        worksDesc: $('#s_worksDesc').value,
        blogTitle: $('#s_blogTitle').value,
        blogDesc: $('#s_blogDesc').value,
        contactTitle1: $('#s_contactTitle1').value,
        contactTitle2: $('#s_contactTitle2').value,
        contactLoc: $('#s_contactLoc').value,
        contactInsta: $('#s_contactInsta').value,
        contactEmail: $('#s_contactEmail').value,
    };
}

// Автосохранение настроек с дебаунсом 1200мс
let autosaveTimer = null;
function triggerSettingsAutosave() {
    const statusEl = $('#settingsStatus');
    if (statusEl) {
        statusEl.textContent = 'Несохранённые изменения…';
        statusEl.style.color = '#e5a93c';
    }
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(async () => {
        try {
            const data = collectSettings();
            await dbSetObj('settings/main_' + currentAdminLang, data);
            if (statusEl) {
                statusEl.textContent = 'Сохранено ✓';
                statusEl.style.color = '#4ade80';
                setTimeout(() => {
                    if (statusEl.textContent === 'Сохранено ✓') {
                        statusEl.textContent = '';
                    }
                }, 3000);
            }
        } catch (err) {
            console.error(err);
            if (statusEl) {
                statusEl.textContent = 'Ошибка автосохранения';
                statusEl.style.color = '#f87171';
            }
        }
    }, 1200);
}

const settingsForm = $('#settingsForm');
if (settingsForm) {
    settingsForm.addEventListener('input', () => {
        updateAllMdPreviews();
        triggerSettingsAutosave();
    });
}

$('#saveSettingsBtn').onclick = async (e) => {
    e.preventDefault();
    clearTimeout(autosaveTimer);
    const btn = $('#saveSettingsBtn');
    const oldText = btn.textContent;
    btn.textContent = 'Сохранение...';
    const statusEl = $('#settingsStatus');
    
    try {
        const data = collectSettings();
        await dbSetObj('settings/main_' + currentAdminLang, data);
        toast('Настройки сохранены ✓');
        if (statusEl) {
            statusEl.textContent = 'Сохранено ✓';
            statusEl.style.color = '#4ade80';
            setTimeout(() => {
                if (statusEl.textContent === 'Сохранено ✓') statusEl.textContent = '';
            }, 3000);
        }
    } catch (err) {
        console.error(err);
        toast('Ошибка сохранения');
        if (statusEl) {
            statusEl.textContent = 'Ошибка сохранения';
            statusEl.style.color = '#f87171';
        }
    }
    btn.textContent = oldText;
};

async function loadSettings() {
    const settings = await dbGetObj('settings/main_' + currentAdminLang);
    if (settings) {
        for (const key of Object.keys(settings)) {
            const el = $('#s_' + key);
            if (el) el.value = settings[key];
        }
    }
    updateAllMdPreviews();
    const statusEl = $('#settingsStatus');
    if (statusEl) statusEl.textContent = '';
}

// Экспорт и импорт JSON
$('#exportJsonBtn').onclick = async () => {
    try {
        toast('Подготовка экспорта...');
        const backup = {
            version: 1,
            exportedAt: new Date().toISOString(),
            hero_slides_ru: await dbGetObj('hero_slides_ru') || {},
            hero_slides_en: await dbGetObj('hero_slides_en') || {},
            works_ru: await dbGetObj('works_ru') || {},
            works_en: await dbGetObj('works_en') || {},
            posts_ru: await dbGetObj('posts_ru') || {},
            posts_en: await dbGetObj('posts_en') || {},
            'settings/main_ru': await dbGetObj('settings/main_ru') || {},
            'settings/main_en': await dbGetObj('settings/main_en') || {}
        };
        const jsonStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        a.href = url;
        a.download = `mphoto-backup-${yyyy}-${mm}-${dd}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Бэкап скачан ✓');
    } catch (err) {
        console.error(err);
        toast('Ошибка экспорта');
    }
};

$('#importJsonBtn').onclick = () => {
    const inp = $('#importJsonInput');
    inp.value = '';
    inp.click();
};

$('#importJsonInput').onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!confirm('Заменить все данные?')) return;
        
        toast('Импорт данных...');
        if (data.hero_slides_ru) await dbSetObj('hero_slides_ru', data.hero_slides_ru);
        if (data.hero_slides_en) await dbSetObj('hero_slides_en', data.hero_slides_en);
        if (data.works_ru) await dbSetObj('works_ru', data.works_ru);
        if (data.works_en) await dbSetObj('works_en', data.works_en);
        if (data.posts_ru) await dbSetObj('posts_ru', data.posts_ru);
        if (data.posts_en) await dbSetObj('posts_en', data.posts_en);
        if (data['settings/main_ru']) await dbSetObj('settings/main_ru', data['settings/main_ru']);
        else if (data.settings_main_ru) await dbSetObj('settings/main_ru', data.settings_main_ru);
        if (data['settings/main_en']) await dbSetObj('settings/main_en', data['settings/main_en']);
        else if (data.settings_main_en) await dbSetObj('settings/main_en', data.settings_main_en);
        
        await loadAllData();
        await loadSettings();
        toast('Импорт успешно завершён ✓');
    } catch (err) {
        console.error(err);
        toast('Ошибка импорта: неверный JSON');
    }
};

// Состояние модалки
let currentMode = '';
const resetModal = () => {
    $('#editForm').reset();
    uploadUrls = [];
    isUploading = false;
    setDirty(false);
    
    $$('.inp.err, .ph-upload.err').forEach(el => el.classList.remove('err'));
    
    renderUploadPreviews();
    $('#uploadText').textContent = 'Загрузить фото (или перетащите сюда)';
    $('#uploadText').style.display = 'block';
    $('#editId').value = '';
    $('#editField1').style.display = 'block';
    $('#editField2').style.display = 'block';
    $('#editFieldPlace').style.display = 'none';
    $('#editFieldTags').style.display = 'block';
    $('#editDateFieldRow').style.display = 'none';
    $('#editFieldDate').style.display = 'none';
    $('#editField3').style.display = 'none';
    
    const modalBox = $('#editModal .modal-box');
    if (modalBox) modalBox.classList.remove('modal-box--wide');
    
    const postColPreview = $('#postColPreview');
    if (postColPreview) postColPreview.style.display = 'none';
    
    const mdToolbar = $('#mdToolbar');
    if (mdToolbar) mdToolbar.style.display = 'none';
    
    const contentStats = $('#contentStats');
    if (contentStats) contentStats.style.display = 'none';
    
    const leadHint = $('#leadHint');
    if (leadHint) leadHint.style.display = 'none';
    
    const photoCounter = $('#photoCounter');
    if (photoCounter) photoCounter.style.display = 'none';
    
    const mobileTabs = $('#postMobileTabs');
    if (mobileTabs) mobileTabs.style.display = 'none';
    
    const editCol = $('.post-col-edit');
    if (editCol) editCol.classList.remove('tab-hidden');
    if (postColPreview) postColPreview.classList.remove('tab-hidden');
};

function setupFieldsForMode(mode) {
    const modalBox = $('#editModal .modal-box');
    const postColPreview = $('#postColPreview');
    const mdToolbar = $('#mdToolbar');
    const contentStats = $('#contentStats');
    const leadHint = $('#leadHint');
    const photoCounter = $('#photoCounter');
    const mobileTabs = $('#postMobileTabs');
    
    if (mode === 'hero') {
        if (modalBox) modalBox.classList.remove('modal-box--wide');
        if (postColPreview) postColPreview.style.display = 'none';
        if (mdToolbar) mdToolbar.style.display = 'none';
        if (contentStats) contentStats.style.display = 'none';
        if (leadHint) leadHint.style.display = 'none';
        if (photoCounter) photoCounter.style.display = 'none';
        if (mobileTabs) mobileTabs.style.display = 'none';
        
        $('#editField1').placeholder = 'Главный заголовок';
        $('#editField2').placeholder = 'Подзаголовок';
        $('#editField2').style.display = 'block';
        $('#editFieldPlace').style.display = 'none';
        $('#editFieldTags').placeholder = 'Теги (через запятую)';
        $('#editFieldTags').style.display = 'block';
        $('#editDateFieldRow').style.display = 'none';
        $('#editFieldDate').style.display = 'none';
        $('#editField3').style.display = 'none';
    } else if (mode === 'works') {
        if (modalBox) modalBox.classList.remove('modal-box--wide');
        if (postColPreview) postColPreview.style.display = 'none';
        if (mdToolbar) mdToolbar.style.display = 'none';
        if (contentStats) contentStats.style.display = 'none';
        if (leadHint) leadHint.style.display = 'none';
        if (photoCounter) photoCounter.style.display = 'none';
        if (mobileTabs) mobileTabs.style.display = 'none';
        
        $('#editField1').placeholder = 'Название работы';
        $('#editField2').placeholder = 'Описание';
        $('#editField2').style.display = 'block';
        $('#editFieldPlace').placeholder = 'Местоположение / Локация (напр. Вена, Австрия)';
        $('#editFieldPlace').style.display = 'block';
        $('#editFieldTags').placeholder = 'Теги (через запятую: Пейзаж, Архитектура, Снег...)';
        $('#editFieldTags').style.display = 'block';
        $('#editDateFieldRow').style.display = 'none';
        $('#editFieldDate').style.display = 'none';
        $('#editField3').style.display = 'none';
    } else if (mode === 'blog' || mode === 'posts') {
        if (modalBox) modalBox.classList.add('modal-box--wide');
        if (postColPreview) postColPreview.style.display = 'block';
        if (mdToolbar) mdToolbar.style.display = 'flex';
        if (contentStats) contentStats.style.display = 'block';
        if (leadHint) leadHint.style.display = 'block';
        if (photoCounter) photoCounter.style.display = 'inline';
        if (mobileTabs) mobileTabs.style.display = 'flex';
        
        // Сброс табов на мобильных к «Текст»
        $$('#postMobileTabs .btn-tab').forEach(b => b.classList.toggle('active', b.dataset.col === 'edit'));
        const editCol = $('.post-col-edit');
        if (editCol) editCol.classList.remove('tab-hidden');
        if (postColPreview) postColPreview.classList.add('tab-hidden');
        
        $('#editField1').placeholder = 'Заголовок поста';
        $('#editField2').placeholder = 'Краткое описание (лид)';
        $('#editField2').style.display = 'block';
        $('#editFieldPlace').style.display = 'none';
        $('#editFieldTags').style.display = 'none';
        $('#editDateFieldRow').style.display = 'flex';
        $('#editFieldDate').style.display = 'block';
        $('#editFieldDate').placeholder = 'Дата (напр. 15 АВГУСТА 2026)';
        $('#editField3').style.display = 'block';
        $('#editField3').placeholder = 'Полный текст записи блога...';
        
        updatePostPreview();
    }
}

$('#addHeroBtn').onclick = () => { currentMode = 'hero'; resetModal(); setupFieldsForMode('hero'); $('#modalTitle').textContent = 'Добавить слайд (Главная)'; openM($('#editModal')); };
$('#addWorkBtn').onclick = () => { currentMode = 'works'; resetModal(); setupFieldsForMode('works'); $('#modalTitle').textContent = 'Добавить работу (Портфолио)'; openM($('#editModal')); };
$('#addBlogBtn').onclick = () => {
    currentMode = 'posts';
    resetModal();
    setupFieldsForMode('posts');
    $('#modalTitle').textContent = 'Добавить пост';
    $('#editFieldDate').value = getTodayFormatted(currentAdminLang);
    restorePostDraftIfExists('new');
    openM($('#editModal'));
};

function openEdit(item, mode) {
    currentMode = mode;
    resetModal();
    setupFieldsForMode(mode);
    $('#editId').value = item.id;
    $('#modalTitle').textContent = mode === 'hero' ? 'Редактировать слайд' : (mode === 'works' ? 'Редактировать работу' : 'Редактировать пост');
    
    uploadUrls = item.images ? [...item.images] : (item.img || item.url ? [item.img || item.url] : []);
    renderUploadPreviews();

    if (mode === 'hero') {
        $('#editField1').value = item.title || '';
        $('#editField2').value = item.sub || '';
        $('#editFieldTags').value = (item.tags || []).join(', ');
    } else if (mode === 'works') {
        $('#editField1').value = item.title || '';
        $('#editField2').value = item.sub || '';
        $('#editFieldPlace').value = item.place || '';
        $('#editFieldTags').value = (item.tags || []).join(', ');
    } else if (mode === 'blog' || mode === 'posts') {
        $('#editField1').value = item.title || '';
        $('#editField2').value = item.excerpt || '';
        $('#editField3').value = item.content || '';
        $('#editFieldDate').value = item.date || getTodayFormatted(currentAdminLang);
        updatePostPreview();
        restorePostDraftIfExists(item.id, item);
    }
    
    setDirty(false);
    openM($('#editModal'));
}

// Дублирование карточки (только для блога)
async function duplicateItem(item, mode) {
    if (mode !== 'posts' && mode !== 'blog') return;
    const newId = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const otherLang = currentAdminLang === 'ru' ? 'en' : 'ru';
    
    const copyData = {
        ...item,
        id: newId,
        title: (item.title || '') + ' (копия)'
    };
    let otherCopyData = { ...copyData };
    try {
        const otherObj = await dbGetObj('posts_' + otherLang + '/' + item.id);
        if (otherObj) {
            otherCopyData = { ...otherObj, id: newId, title: (otherObj.title || '') + ' (копия)' };
        }
    } catch(e) {}
    
    await dbPut('posts_' + currentAdminLang, newId, copyData);
    await dbPut('posts_' + otherLang, newId, otherCopyData);
    
    await loadAllData();
    toast('Дубликат создан ✓');
}

// Перемещение порядка работ
async function moveWorkOrder(item, direction) {
    workItems.forEach((w, idx) => {
        if (typeof w.order !== 'number') w.order = idx;
    });
    
    const currentIndex = workItems.findIndex(w => w.id === item.id);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= workItems.length) return;
    
    const itemA = workItems[currentIndex];
    const itemB = workItems[targetIndex];
    
    const tempOrder = itemA.order;
    itemA.order = itemB.order;
    itemB.order = tempOrder;
    if (itemA.order === itemB.order) {
        itemA.order = targetIndex;
        itemB.order = currentIndex;
    }
    
    const otherLang = currentAdminLang === 'ru' ? 'en' : 'ru';
    await dbPut('works_' + currentAdminLang, itemA.id, itemA);
    await dbPut('works_' + currentAdminLang, itemB.id, itemB);
    
    try {
        const otherA = await dbGetObj('works_' + otherLang + '/' + itemA.id);
        if (otherA) {
            otherA.order = itemA.order;
            await dbPut('works_' + otherLang, itemA.id, otherA);
        } else {
            await dbPut('works_' + otherLang, itemA.id, itemA);
        }
    } catch(e) {}
    
    try {
        const otherB = await dbGetObj('works_' + otherLang + '/' + itemB.id);
        if (otherB) {
            otherB.order = itemB.order;
            await dbPut('works_' + otherLang, itemB.id, otherB);
        } else {
            await dbPut('works_' + otherLang, itemB.id, itemB);
        }
    } catch(e) {}
    
    workItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderWorksGrid();
    toast('Порядок обновлён ✓');
}

// Отменяемое удаление вместо confirm()
async function deleteItemWithUndo(item, mode) {
    const collectionPrefix = mode === 'hero' ? 'hero_slides' : (mode === 'works' ? 'works' : 'posts');
    
    let ruBackup = null;
    let enBackup = null;
    try { ruBackup = await dbGetObj(collectionPrefix + '_ru/' + item.id); } catch(e) {}
    try { enBackup = await dbGetObj(collectionPrefix + '_en/' + item.id); } catch(e) {}
    
    if (!ruBackup && currentAdminLang === 'ru') ruBackup = item;
    if (!enBackup && currentAdminLang === 'en') enBackup = item;
    
    await dbDel(collectionPrefix + '_ru', item.id);
    await dbDel(collectionPrefix + '_en', item.id);
    
    if (mode === 'hero') {
        heroItems = heroItems.filter(x => x.id !== item.id);
        renderHeroGrid();
    } else if (mode === 'works') {
        workItems = workItems.filter(x => x.id !== item.id);
        renderWorksGrid();
    } else {
        postItems = postItems.filter(x => x.id !== item.id);
        renderBlogGrid();
    }
    
    toastAction('Удалено', 'Отменить', async () => {
        if (ruBackup) await dbPut(collectionPrefix + '_ru', item.id, ruBackup);
        if (enBackup) await dbPut(collectionPrefix + '_en', item.id, enBackup);
        await loadAllData();
        toast('Восстановлено ✓');
    });
}

// Валидация и сохранение в модалке
$('#editForm').onsubmit = async (e) => {
    e.preventDefault();
    
    // Сброс классов ошибок
    $$('.inp.err, .ph-upload.err').forEach(el => el.classList.remove('err'));
    
    const editId = $('#editId').value;
    const isPosts = currentMode === 'posts' || currentMode === 'blog';
    
    // Валидация
    if (isPosts) {
        const titleVal = $('#editField1').value.trim();
        if (!titleVal) {
            $('#editField1').classList.add('err');
            $('#editField1').focus();
            return toast('Пожалуйста, укажите заголовок поста');
        }
        if (!uploadUrls.length) {
            $('#editImageBtn').classList.add('err');
            return toast('Пожалуйста, добавьте хотя бы одну фотографию');
        }
    } else {
        if (!uploadUrls.length) {
            $('#editImageBtn').classList.add('err');
            return toast('Пожалуйста, добавьте фото');
        }
    }

    const id = editId || ('item_' + Date.now());
    const finalUrl = uploadUrls.length > 0 ? uploadUrls[0] : '';
    let data = {};
    const otherLang = currentAdminLang === 'ru' ? 'en' : 'ru';

    if (currentMode === 'hero') {
        const title = $('#editField1').value;
        const sub = $('#editField2').value;
        const tags = $('#editFieldTags').value.split(',').map(s=>s.trim()).filter(Boolean);
        data = { id, title, sub, tags, url: finalUrl };
        
        await dbPut('hero_slides_' + currentAdminLang, id, data);
        if (!editId) {
            await dbPut('hero_slides_' + otherLang, id, data);
        } else {
            try {
                const other = await dbGetObj('hero_slides_' + otherLang + '/' + id);
                if (other) { other.url = finalUrl; await dbPut('hero_slides_' + otherLang, id, other); }
            } catch(e){}
        }
    } else if (currentMode === 'works') {
        const title = $('#editField1').value;
        const sub = $('#editField2').value;
        const place = $('#editFieldPlace').value;
        const tags = $('#editFieldTags').value.split(',').map(s=>s.trim()).filter(Boolean);
        
        if (editId) {
            const existing = workItems.find(w => w.id === editId);
            const order = existing && typeof existing.order === 'number' ? existing.order : 0;
            data = { id: editId, title, sub, place, tags, url: finalUrl, order };
            await dbPut('works_' + currentAdminLang, editId, data);
            try {
                const other = await dbGetObj('works_' + otherLang + '/' + editId);
                if (other) {
                    other.url = finalUrl;
                    other.order = order;
                    if (!other.place && place) other.place = place;
                    await dbPut('works_' + otherLang, editId, other);
                } else {
                    await dbPut('works_' + otherLang, editId, data);
                }
            } catch(e){}
        } else {
            const maxOrder = workItems.reduce((max, w) => Math.max(max, (typeof w.order === 'number' ? w.order : -1)), -1);
            let nextOrder = maxOrder + 1;
            for (const url of uploadUrls) {
                const newId = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                data = { id: newId, title, sub, place, tags, url: url, order: nextOrder++ };
                await dbPut('works_ru', newId, data);
                await dbPut('works_en', newId, data);
            }
        }
    } else {
        const contentText = $('#editField3').value;
        let excerpt = $('#editField2').value.trim();
        if (!excerpt && contentText) {
            excerpt = contentText.substring(0, 100).trim() + '...';
        }
        const date = $('#editFieldDate').value || getTodayFormatted(currentAdminLang);
        data = { 
            id, 
            date, 
            title: $('#editField1').value, 
            excerpt, 
            img: finalUrl,
            images: uploadUrls,
            content: contentText 
        };
        await dbPut('posts_' + currentAdminLang, id, data);
        if (!editId) {
            await dbPut('posts_' + otherLang, id, data);
        } else {
            try {
                const other = await dbGetObj('posts_' + otherLang + '/' + id);
                if (other) { other.img = finalUrl; other.images = uploadUrls; await dbPut('posts_' + otherLang, id, other); }
            } catch(e){}
        }
        
        // Удаляем черновик после успешного сохранения
        localStorage.removeItem('draft_post_' + (editId || 'new'));
        localStorage.removeItem('draft_post_new');
    }

    setDirty(false);
    closeM($('#editModal'));
    toast('Сохранено ✓');
    loadAllData();
};

// Рендеринг карточки
function createCard(item, mode, indexInSorted = 0, totalSorted = 0) {
    const el = document.createElement('div');
    el.className = 'card';
    
    let buttonsHtml = '';
    
    if (mode === 'works') {
        const isFirst = indexInSorted === 0;
        const isLast = indexInSorted === totalSorted - 1;
        buttonsHtml = `
            <button class="btn btn-outline btn-icon move-up" type="button" ${isFirst ? 'disabled' : ''} title="Поднять выше">↑</button>
            <button class="btn btn-outline btn-icon move-down" type="button" ${isLast ? 'disabled' : ''} title="Опустить ниже">↓</button>
            <button class="btn btn-outline edit-btn" type="button">Изменить</button>
            <button class="btn btn-outline del-btn" type="button" style="color:#ff4444; border-color:#ff4444">Удалить</button>
        `;
    } else if (mode === 'posts') {
        buttonsHtml = `
            <button class="btn btn-outline dup-btn" type="button">Дублировать</button>
            <button class="btn btn-outline edit-btn" type="button">Изменить</button>
            <button class="btn btn-outline del-btn" type="button" style="color:#ff4444; border-color:#ff4444">Удалить</button>
        `;
    } else {
        buttonsHtml = `
            <button class="btn btn-outline edit-btn" type="button">Изменить</button>
            <button class="btn btn-outline del-btn" type="button" style="color:#ff4444; border-color:#ff4444">Удалить</button>
        `;
    }
    
    el.innerHTML = `
        <img src="${opt(item.img || item.url)}" alt="">
        <div class="card-body">
            <h4>${item.title || '(Без названия)'}</h4>
            ${item.sub ? `<div style="font-size:12px; color:var(--text); opacity:0.8; margin-top:2px;">${item.sub}</div>` : ''}
            ${item.place ? `<div style="font-size:12px; color:var(--gray); margin-top:2px; display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${item.place}</div>` : ''}
            <p style="margin-top:4px;">${(item.tags || []).join(', ') || item.excerpt || ''}</p>
        </div>
        <div class="card-actions">
            ${buttonsHtml}
        </div>
    `;
    
    const editBtn = el.querySelector('.edit-btn');
    if (editBtn) editBtn.onclick = () => openEdit(item, mode);
    
    const delBtn = el.querySelector('.del-btn');
    if (delBtn) delBtn.onclick = () => deleteItemWithUndo(item, mode);
    
    const dupBtn = el.querySelector('.dup-btn');
    if (dupBtn) {
        dupBtn.onclick = () => duplicateItem(item, mode);
    }
    
    const upBtn = el.querySelector('.move-up');
    if (upBtn) {
        upBtn.onclick = () => moveWorkOrder(item, -1);
    }
    const downBtn = el.querySelector('.move-down');
    if (downBtn) {
        downBtn.onclick = () => moveWorkOrder(item, 1);
    }
    
    return el;
}

// Функции отрисовки сеток с фильтрацией
function renderHeroGrid() {
    const grid = $('#heroGrid');
    if (!grid) return;
    grid.innerHTML = '';
    heroItems.forEach(h => grid.appendChild(createCard(h, 'hero')));
}

function renderWorksGrid() {
    const grid = $('#worksGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    workItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Заполняем селект тегов
    const allTags = new Set();
    workItems.forEach(w => (w.tags || []).forEach(t => {
        if (t && t.trim()) allTags.add(t.trim());
    }));
    
    const tagSelect = $('#worksTagFilter');
    if (tagSelect) {
        const prevVal = worksSelectedTag;
        tagSelect.innerHTML = '<option value="">Все теги</option>' + [...allTags].sort().map(t => `<option value="${t}" ${t === prevVal ? 'selected' : ''}>${t}</option>`).join('');
    }
    
    const q = worksSearchQuery.toLowerCase().trim();
    const filtered = workItems.filter(w => {
        if (worksSelectedTag && !(w.tags || []).includes(worksSelectedTag)) return false;
        if (q) {
            const titleMatch = (w.title || '').toLowerCase().includes(q);
            const placeMatch = (w.place || '').toLowerCase().includes(q);
            if (!titleMatch && !placeMatch) return false;
        }
        return true;
    });
    
    filtered.forEach(w => {
        const sortedIndex = workItems.indexOf(w);
        grid.appendChild(createCard(w, 'works', sortedIndex, workItems.length));
    });
}

function renderBlogGrid() {
    const grid = $('#blogGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const q = blogSearchQuery.toLowerCase().trim();
    const filtered = postItems.filter(p => {
        if (q && !(p.title || '').toLowerCase().includes(q)) return false;
        return true;
    });
    
    filtered.forEach(p => grid.appendChild(createCard(p, 'posts')));
}

// Слушатели поиска и фильтрации
const worksSearchInp = $('#worksSearch');
if (worksSearchInp) {
    worksSearchInp.addEventListener('input', e => {
        worksSearchQuery = e.target.value;
        renderWorksGrid();
    });
}

const worksTagFilterSel = $('#worksTagFilter');
if (worksTagFilterSel) {
    worksTagFilterSel.addEventListener('change', e => {
        worksSelectedTag = e.target.value;
        renderWorksGrid();
    });
}

const blogSearchInp = $('#blogSearch');
if (blogSearchInp) {
    blogSearchInp.addEventListener('input', e => {
        blogSearchQuery = e.target.value;
        renderBlogGrid();
    });
}

// Загрузка всех данных
async function loadAllData() {
    heroItems = await dbAll('hero_slides_' + currentAdminLang);
    workItems = await dbAll('works_' + currentAdminLang);
    postItems = await dbAll('posts_' + currentAdminLang);

    renderHeroGrid();
    renderWorksGrid();
    renderBlogGrid();
}

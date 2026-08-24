const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

import { auth, dbPut, dbAll, dbDel, dbGetObj, dbSetObj } from './firebase.js?v=2';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

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

// Утилиты
const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); };
const openM = m => { m.classList.add('open'); };
const closeM = m => { m.classList.remove('open'); };
$$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeM(m); }));

// Сжатие фото
function compress(file) {
    return new Promise((res, rej) => {
        const url = URL.createObjectURL(file); const img = new Image();
        img.onload = () => {
            const max = 1920; let w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            res(c.toDataURL('image/jpeg', 0.85)); URL.revokeObjectURL(url);
        };
        img.onerror = rej; img.src = url;
    });
}

// Выбор фото
let uploadUrls = [];

function renderUploadPreviews() {
    if (uploadUrls.length === 0) {
        $('#uploadPreviewContainer').innerHTML = '';
        $('#uploadPreviewContainer').style.width = 'auto';
        $('#uploadText').style.display = 'block';
        return;
    }
    $('#uploadText').style.display = 'none';
    
    const isSingle = uploadUrls.length === 1;
    $('#uploadPreviewContainer').style.width = isSingle ? '100%' : 'auto';
    
    const sizeStyle = isSingle ? 'height: 180px; width: 100%; display: block;' : 'height: 90px; width: 90px; display: block;';
    const wrapStyle = isSingle ? 'width: 100%; display: block;' : 'display: inline-block;';
    
    $('#uploadPreviewContainer').innerHTML = uploadUrls.map((u, i) => `
        <div style="position:relative; margin: ${isSingle ? '0' : '6px'}; ${wrapStyle}">
            <img src="${u}" style="${sizeStyle} object-fit:cover; border-radius:8px;">
            <div data-index="${i}" class="del-thumb" style="position:absolute;top:-8px;right:-8px;background:#ff4444;color:white;width:24px;height:24px;border-radius:50%;text-align:center;line-height:20px;font-size:16px;cursor:pointer;font-weight:bold;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3)">×</div>
        </div>
    `).join('');
    
    $$('.del-thumb').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            uploadUrls.splice(idx, 1);
            renderUploadPreviews();
        };
    });
}

$('#editImageBtn').onclick = () => {
    $('#editFileInput').value = '';
    $('#editFileInput').multiple = (currentMode === 'blog' || currentMode === 'posts' || currentMode === 'works');
    $('#editFileInput').click();
};

$('#editFileInput').addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    $('#uploadText').textContent = 'Загрузка в облако...';
    $('#uploadText').style.display = 'block';
    
    // We don't reset uploadUrls here, we append!
    if (currentMode !== 'blog' && currentMode !== 'posts' && currentMode !== 'works') {
        uploadUrls = []; // Only allow multiple for blog and works
    }
    
    for (const f of files) {
        try {
            // Сжимаем локально перед отправкой для экономии места в Cloudinary
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
                uploadUrls.push(data.secure_url);
            } else {
                toast('Ошибка загрузки: ' + (data.error?.message || 'Неизвестная ошибка'));
            }
        } catch (err) {
            console.error(err);
            toast('Ошибка при загрузке фото');
        }
    }
    
    renderUploadPreviews();
});

// Авторизация
onAuthStateChanged(auth, user => {
    if (user) {
        $('#loginOverlay').classList.remove('active');
        $('#dashboard').style.display = 'flex';
        loadAllData();
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

// Табы
$$('.admin-nav a').forEach(a => {
    a.onclick = (e) => {
        e.preventDefault();
        $$('.admin-nav a').forEach(x => x.classList.remove('active'));
        $$('.tab-content').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        $('#tab-' + a.dataset.tab).classList.add('active');
    };
});

// Состояние модалки
let currentMode = ''; // 'hero', 'works', 'blog', 'expertise'
const resetModal = () => {
    $('#editForm').reset();
    uploadUrls = [];
    renderUploadPreviews();
    $('#uploadText').textContent = 'Загрузить фото';
    $('#uploadText').style.display = 'block';
    $('#editId').value = '';
    $('#editField1').style.display = 'block';
    $('#editField2').style.display = 'block';
    $('#editFieldPlace').style.display = 'none';
    $('#editFieldTags').style.display = 'block';
    $('#editFieldDate').style.display = 'none';
    $('#editField3').style.display = 'none';
};

function setupFieldsForMode(mode) {
    if (mode === 'hero') {
        $('#editField1').placeholder = 'Главный заголовок';
        $('#editField2').placeholder = 'Подзаголовок';
        $('#editField2').style.display = 'block';
        $('#editFieldPlace').style.display = 'none';
        $('#editFieldTags').placeholder = 'Теги (через запятую)';
        $('#editFieldTags').style.display = 'block';
        $('#editFieldDate').style.display = 'none';
        $('#editField3').style.display = 'none';
    } else if (mode === 'works') {
        $('#editField1').placeholder = 'Название работы';
        $('#editField2').placeholder = 'Описание';
        $('#editField2').style.display = 'block';
        $('#editFieldPlace').placeholder = 'Местоположение / Локация (напр. Вена, Австрия)';
        $('#editFieldPlace').style.display = 'block';
        $('#editFieldTags').placeholder = 'Теги (через запятую: Пейзаж, Архитектура, Снег...)';
        $('#editFieldTags').style.display = 'block';
        $('#editFieldDate').style.display = 'none';
        $('#editField3').style.display = 'none';
    } else if (mode === 'blog') {
        $('#editField1').placeholder = 'Заголовок поста';
        $('#editField2').placeholder = 'Краткое описание';
        $('#editField2').style.display = 'block';
        $('#editFieldPlace').style.display = 'none';
        $('#editFieldTags').style.display = 'none';
        $('#editFieldDate').style.display = 'block';
        $('#editField3').style.display = 'block';
    }
}

// Открытие модалки добавления
$('#addHeroBtn').onclick = () => { currentMode = 'hero'; resetModal(); setupFieldsForMode('hero'); $('#modalTitle').textContent = 'Добавить слайд (Главная)'; openM($('#editModal')); };
$('#addWorkBtn').onclick = () => { currentMode = 'works'; resetModal(); setupFieldsForMode('works'); $('#modalTitle').textContent = 'Добавить работу (Портфолио)'; openM($('#editModal')); };
$('#addBlogBtn').onclick = () => { currentMode = 'blog'; resetModal(); setupFieldsForMode('blog'); $('#modalTitle').textContent = 'Добавить пост'; openM($('#editModal')); };

// Открытие модалки редактирования
function openEdit(item, mode) {
    currentMode = mode;
    resetModal();
    setupFieldsForMode(mode);
    $('#editId').value = item.id;
    $('#modalTitle').textContent = 'Редактировать';
    
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
    } else {
        $('#editField1').value = item.title || '';
        $('#editField2').value = item.excerpt || '';
        $('#editField3').value = item.content || '';
        $('#editFieldDate').value = item.date || '';
    }
    openM($('#editModal'));
}

// Сохранение
$('#editForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!uploadUrls.length) return toast('Пожалуйста, добавьте фото');

    const id = $('#editId').value || ('item_' + Date.now());
    const finalUrl = uploadUrls.length > 0 ? uploadUrls[0] : '';
    let data = {};
    const otherLang = currentAdminLang === 'ru' ? 'en' : 'ru';

    if (currentMode === 'hero') {
        const title = $('#editField1').value;
        const sub = $('#editField2').value;
        const tags = $('#editFieldTags').value.split(',').map(s=>s.trim()).filter(Boolean);
        data = { id, title, sub, tags, url: finalUrl };
        
        await dbPut('hero_slides_' + currentAdminLang, id, data);
        if (!$('#editId').value) {
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
        const editId = $('#editId').value;
        
        if (editId) {
            data = { id: editId, title, sub, place, tags, url: finalUrl };
            await dbPut('works_' + currentAdminLang, editId, data);
            try {
                const other = await dbGetObj('works_' + otherLang + '/' + editId);
                if (other) {
                    other.url = finalUrl;
                    if (!other.place && place) other.place = place;
                    await dbPut('works_' + otherLang, editId, other);
                } else {
                    await dbPut('works_' + otherLang, editId, data);
                }
            } catch(e){}
        } else {
            for (const url of uploadUrls) {
                const newId = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                data = { id: newId, title, sub, place, tags, url: url };
                // Сохраняем в обе языковые версии
                await dbPut('works_ru', newId, data);
                await dbPut('works_en', newId, data);
            }
        }
    } else {
        const excerpt = $('#editField2').value || ($('#editField3').value.substring(0, 100) + '...');
        const date = $('#editFieldDate').value;
        data = { 
            id, 
            date, 
            title: $('#editField1').value, 
            excerpt, 
            img: finalUrl,
            images: uploadUrls,
            content: $('#editField3').value 
        };
        await dbPut('posts_' + currentAdminLang, id, data);
        if (!$('#editId').value) {
            await dbPut('posts_' + otherLang, id, data);
        } else {
            try {
                const other = await dbGetObj('posts_' + otherLang + '/' + id);
                if (other) { other.img = finalUrl; other.images = uploadUrls; await dbPut('posts_' + otherLang, id, other); }
            } catch(e){}
        }
    }

    closeM($('#editModal'));
    toast('Сохранено ✓');
    loadAllData(); // Перезагрузка
};

// Рендеринг и загрузка
function createCard(item, mode) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
        <img src="${item.img || item.url}" alt="">
        <div class="card-body">
            <h4>${item.title || '(Без названия)'}</h4>
            ${item.sub ? `<div style="font-size:12px; color:var(--text); opacity:0.8; margin-top:2px;">${item.sub}</div>` : ''}
            ${item.place ? `<div style="font-size:12px; color:var(--gray); margin-top:2px; display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${item.place}</div>` : ''}
            <p style="margin-top:4px;">${(item.tags || []).join(', ') || item.excerpt || ''}</p>
        </div>
        <div class="card-actions">
            <button class="btn btn-outline edit-btn">Изменить</button>
            <button class="btn btn-outline del-btn" style="color:#ff4444; border-color:#ff4444">Удалить</button>
        </div>
    `;
    el.querySelector('.edit-btn').onclick = () => openEdit(item, mode);
    el.querySelector('.del-btn').onclick = async () => {
        if (confirm('Точно удалить?')) {
            if (mode === 'hero') {
                await dbDel('hero_slides_ru', item.id);
                await dbDel('hero_slides_en', item.id);
            } else if (mode === 'works') {
                await dbDel('works_ru', item.id);
                await dbDel('works_en', item.id);
            } else {
                await dbDel('posts_ru', item.id);
                await dbDel('posts_en', item.id);
            }
            el.remove();
            toast('Удалено');
        }
    };
    return el;
}

async function loadAllData() {
    $('#heroGrid').innerHTML = '';
    $('#worksGrid').innerHTML = '';
    $('#blogGrid').innerHTML = '';

    const hero = await dbAll('hero_slides_' + currentAdminLang);
    hero.forEach(h => $('#heroGrid').appendChild(createCard(h, 'hero')));

    const works = await dbAll('works_' + currentAdminLang);
    works.forEach(w => $('#worksGrid').appendChild(createCard(w, 'works')));

    const posts = await dbAll('posts_' + currentAdminLang);
    posts.forEach(p => $('#blogGrid').appendChild(createCard(p, 'posts')));
    
    const settings = await dbGetObj('settings/main_' + currentAdminLang);
    if (settings) {
        for (const key of Object.keys(settings)) {
            const el = $('#s_' + key);
            if (el) el.value = settings[key];
        }
    }
}

$('#saveSettingsBtn').onclick = async (e) => {
    e.preventDefault();
    const btn = $('#saveSettingsBtn');
    const oldText = btn.textContent;
    btn.textContent = 'Сохранение...';
    
    const data = {
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
    
    try {
        await dbSetObj('settings/main_' + currentAdminLang, data);
        toast('Настройки сохранены');
    } catch (err) { toast('Ошибка сохранения'); }
    btn.textContent = oldText;
};

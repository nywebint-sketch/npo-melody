import * as db from '../db.js';
import { getDefaultLogoUrl, ASSET_PREFIX } from '../logoUrls.js';

/** Превью в админке: sentinel `logo.png` → theme-aware URL */
function resolvePosterPreview(p) {
  const v = String(p || '').trim();
  if (!v || v === 'logo.png') return getDefaultLogoUrl();
  return v;
}

/** Превью фото товара (короткие имена → microdropych/, полные URL как есть) */
function resolveMerchPreview(raw) {
  const s = String(raw || '').trim();
  if (!s || s === 'logo.png' || s === 'smile.png') return getDefaultLogoUrl();
  if (/^https?:\/\//i.test(s)) return s;
  if (!/[\\/]/.test(s)) {
    const fn = /\.(jpe?g|png|webp|gif)$/i.test(s) ? s : `${s}.jpeg`;
    return `${ASSET_PREFIX}microdropych/${fn}`;
  }
  return ASSET_PREFIX + s.replace(/^\/+/, '');
}

function merchStatusLabel(status) {
  const map = {
    active: 'В продаже',
    draft: 'Черновик',
    preorder: 'Предзаказ',
    archive: 'Архив'
  };
  return map[status] || status || '—';
}

function parseMerchImages(item) {
  let list = item?.images;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = [];
    }
  }
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

// ---- УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ ----

const loginScreen = document.getElementById('adminLoginScreen');
const loginForm = document.getElementById('adminLoginForm');
const loginError = document.getElementById('loginError');
const adminPanel = document.getElementById('adminPanel');
const logoutBtn = document.getElementById('adminLogoutBtn');
const currentUserEmail = document.getElementById('adminCurrentEmail');

async function checkAuth() {
  // Если разметка админки не нашлась (например, скрипт подключён не на той странице) — просто выходим
  if (!loginScreen || !adminPanel || !currentUserEmail) {
    return;
  }

  try {
    const session = await db.getSession();
    if (session) {
      const isAdmin = await db.checkIsAdmin();
      if (isAdmin) {
        loginScreen.classList.add('hidden');
        adminPanel.style.display = 'flex';
        currentUserEmail.textContent = session.user.email;
        loadDashboard();
      } else {
        await db.logout();
        if (loginError) {
          loginError.textContent = 'У вас нет прав администратора';
          loginError.style.display = 'block';
        }
        loginScreen.classList.remove('hidden');
        adminPanel.style.display = 'none';
      }
    } else {
      loginScreen.classList.remove('hidden');
      adminPanel.style.display = 'none';
    }
  } catch (err) {
    console.error(err);
    loginScreen.classList.remove('hidden');
    adminPanel.style.display = 'none';
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const pass = loginForm.password.value;
    loginError.style.display = 'none';

    try {
      const res = await db.login(email, pass);
      if (res) {
        await checkAuth();
      }
    } catch (err) {
      loginError.textContent = 'Неверный логин или пароль';
      loginError.style.display = 'block';
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await db.logout();
    checkAuth();
  });
}

// ---- НАВИГАЦИЯ И ВЬЮШКИ ----

const navItems = document.querySelectorAll('.nav-item');
const viewContainer = document.getElementById('viewContainer');
const pageTitle = document.getElementById('pageTitle');
const addBtn = document.getElementById('addBtn');

navItems.forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navItems.forEach((nav) => nav.classList.remove('active'));
    item.classList.add('active');

    const view = item.dataset.view;
    const titles = {
      dashboard: 'Дашборд',
      users: 'Пользователи',
      events: 'Афиша (События)',
      releases: 'Релизы',
      podcasts: 'Подкасты',
      streams: 'Стримы',
      live: 'НПО РАДИО',
      merch: 'Магазин'
    };
    pageTitle.textContent = titles[view] || view;

    if (view === 'dashboard') loadDashboard();
    if (view === 'users') loadUsersView();
    if (view === 'events') loadEventsView();
    if (view === 'releases') loadReleasesView();
    if (view === 'podcasts') loadPodcastsView();
    if (view === 'streams') loadStreamsView();
    if (view === 'live') loadLiveView();
    if (view === 'merch') loadMerchView();
  });
});

// ---- ДАШБОРД ----

async function loadDashboard() {
  addBtn.style.display = 'none';
  const users = await db.getUsers();
  const events = await db.getEvents();
  const merch = await db.getMerch();
  const liveItems = await db.getLiveItems();

  viewContainer.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;">
      <div class="card pad" style="background:rgba(255,255,255,0.05)">
        <h3>Пользователей</h3>
        <p style="font-size:32px;font-weight:bold;margin:10px 0;">${users.length}</p>
      </div>
      <div class="card pad" style="background:rgba(255,255,255,0.05)">
        <h3>Афиша</h3>
        <p style="font-size:32px;font-weight:bold;margin:10px 0;">${events.length}</p>
      </div>
      <div class="card pad" style="background:rgba(255,255,255,0.05)">
        <h3>НПО РАДИО (эфиры)</h3>
        <p style="font-size:32px;font-weight:bold;margin:10px 0;">${liveItems.length}</p>
      </div>
      <div class="card pad" style="background:rgba(255,255,255,0.05)">
        <h3>Товаров (магазин)</h3>
        <p style="font-size:32px;font-weight:bold;margin:10px 0;">${merch.length}</p>
      </div>
    </div>
  `;
}

// ---- ПОЛЬЗОВАТЕЛИ ----

async function loadUsersView() {
  addBtn.style.display = 'none';
  const rawUsers = await db.getUsers();
  const users = (rawUsers || []).filter(Boolean);
  const session = await db.getSession();
  const currentId = session?.user?.id || '';

  let rows = '';
  for (const u of users) {
    const email = u.email || '—';
    const name = u.name || '—';
    const role = u.role || 'user';
    const userId = u.id || u.user_id;
    const createdSource = u.created_at !== undefined ? u.created_at : u.createdAt;
    let created = '—';
    if (createdSource) {
      const s = String(createdSource);
      created = s.slice(0, 10);
    }
    const bg = role === 'admin' ? '#fff' : 'rgba(255,255,255,0.1)';
    const color = role === 'admin' ? '#000' : '#fff';
    const isSelf = Boolean(currentId && userId && String(userId) === String(currentId));
    let actionCell = '';
    if (!userId) {
      actionCell = '<span class="muted">Нет id профиля</span>';
    } else if (role === 'admin') {
      if (isSelf) {
        actionCell = '<span class="muted">Текущий аккаунт</span>';
      } else {
        actionCell =
          '<button type="button" class="btn-sm danger" data-admin-action="remove-admin" data-id="' +
          String(userId) +
          '">Снять роль админа</button>';
      }
    } else {
      actionCell =
        '<button type="button" class="btn-sm" data-admin-action="make-admin" data-id="' +
        String(userId) +
        '">Сделать админом</button>';
    }

    rows +=
      '<tr>' +
      '<td>' + email + '</td>' +
      '<td>' + name + '</td>' +
      '<td><span class="tag" style="background:' + bg + ';color:' + color + '">' + role + '</span></td>' +
      '<td>' + created + '</td>' +
      '<td><div class="actions">' +
      actionCell +
      '</div></td>' +
      '</tr>';
  }

  viewContainer.innerHTML =
    '<div class="admin-table-wrap">' +
    '<table class="admin-table">' +
    '<thead><tr><th>Email</th><th>Имя</th><th>Роль</th><th>Дата рег.</th><th>Действия</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '</div>';

  wireUserRoleActionButtons();
}

/** Прямая привязка к кнопкам ролей (не полагаемся только на всплытие). */
function wireUserRoleActionButtons() {
  if (!viewContainer) return;
  viewContainer.querySelectorAll('button[data-admin-action="make-admin"], button[data-admin-action="remove-admin"]').forEach((btn) => {
    btn.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-admin-action');
        if (!id) return;
        if (action === 'make-admin') void window.app.makeAdmin(id);
        else if (action === 'remove-admin') void window.app.removeAdmin(id);
      },
      { capture: true }
    );
  });
}

window.app = {
  makeAdmin: async (id) => {
    if (!confirm('Сделать пользователя администратором?')) return;
    try {
      await db.updateUserRole(id, 'admin');
      await loadUsersView();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Не удалось назначить администратора');
    }
  },
  removeAdmin: async (id) => {
    if (!confirm('Снять роль администратора с этого пользователя?')) return;
    try {
      await db.updateUserRole(id, 'user');
      await loadUsersView();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Не удалось снять роль');
    }
  }
};

// ---- СОБЫТИЯ (АФИША) ----

const adminModal = document.getElementById('adminModal');
const editorTitle = document.getElementById('editorTitle');
const editorBody = document.getElementById('editorBody');
const editorClose = document.getElementById('editorClose');

if (editorClose && adminModal) {
  editorClose.addEventListener('click', () => {
    adminModal.style.display = 'none';
  });
}

async function loadEventsView() {
  addBtn.style.display = 'block';
  addBtn.textContent = '+ Добавить событие';
  addBtn.onclick = () => openEventEditor();

  const events = await (db.getEventsAdmin ? db.getEventsAdmin() : db.getEvents());
  // Надёжная сортировка "по новизне добавления" на клиенте.
  // Даже если сервер вернул в другом порядке, приведём к `created_at` desc.
  events.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const rows = events.map((e) => `
    <tr>
      <td><b>${e.title}</b></td>
      <td>${e.date?.replace ? e.date.replace('T', ' ') : e.date}</td>
      <td>${e.place || '—'}</td>
      <td>${e.status || '—'}</td>
      <td>
        <div class="actions">
          <button type="button" class="btn-sm" data-admin-action="edit-event" data-id="${e.id}">Изменить</button>
        </div>
      </td>
    </tr>
  `).join('');

  viewContainer.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Название</th><th>Дата</th><th>Площадка</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function openEventEditor(id = null) {
  let event = {
    title: '',
    date: '',
    place: 'НПО Мелодия',
    status: 'tickets',
    about: '',
    lineup: [],
    tags: [],
    // Ссылка на билеты может храниться в разных колонках — нормализуем
    ticketUrl: '',
    ticket_url: '',
    stream_url: ''
  };
  let isEdit = false;

  if (id) {
    const events = await (db.getEventsAdmin ? db.getEventsAdmin() : db.getEvents());
    const found = events.find((e) => e.id === id);
    if (found) {
      const ticket =
        found.ticketUrl ||
        found.ticket_url ||
        found.ticketsUrl ||
        found.tickets_url ||
        found.ticket ||
        found.tickets ||
        '';
      event = {
        ...event,
        ...found,
        ticketUrl: ticket,
        stream_url: found.stream_url || found.streamUrl || ''
      };
    }
    isEdit = true;
  }

  editorTitle.textContent = isEdit ? 'Редактировать событие' : 'Новое событие';
  const eventSubmitLabel = isEdit ? 'Сохранить' : 'Добавить событие';

  editorBody.innerHTML = `
    <form id="editorForm" class="editor-form">
      <div class="form-group">
        <label>Название</label>
        <input type="text" name="title" value="${event.title}" required>
      </div>
      <div class="form-group">
        <label>Дата и время (YYYY-MM-DDTHH:MM)</label>
        <input type="datetime-local" name="date" value="${event.date}" required>
      </div>
      <div class="form-group">
        <label>Статус</label>
        <select name="status">
          <option value="tickets" ${event.status === 'tickets' ? 'selected' : ''}>Билеты в продаже</option>
          <option value="archive" ${event.status === 'archive' ? 'selected' : ''}>Архив</option>
          <option value="announce" ${event.status === 'announce' ? 'selected' : ''}>Анонс (скоро)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ссылка на билеты (https://...)</label>
        <input type="url" name="ticket_url" value="${event.ticketUrl || ''}" placeholder="https://...">
      </div>
      <div class="form-group">
        <label>Ссылка на трансляцию (YouTube, Vimeo, Rutube, mp4 — для кнопки «Смотреть» в НПО РАДИО)</label>
        <input type="url" name="stream_url" value="${event.stream_url || event.streamUrl || ''}" placeholder="https://...">
      </div>
      <div class="form-group">
        <label>Описание</label>
        <textarea name="about">${event.about || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Лайнап (через запятую)</label>
        <textarea name="lineup">${(event.lineup || []).join(', ')}</textarea>
      </div>
      <div class="form-group">
        <label>Обложка / Фото</label>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
          ${event.poster ? `<img src="${resolvePosterPreview(event.poster)}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;">` : `<div style="width:40px;height:40px;background:rgba(255,255,255,0.1);border-radius:4px;"></div>`}
          <input type="file" name="posterFile" accept="image/*" style="font-size:14px;">
        </div>
        <div class="muted" style="font-size:12px;">Оставьте пустым, чтобы не менять текущую картинку.</div>
      </div>
      <div class="editor-actions${isEdit ? ' editor-actions--spread' : ''}">
        ${isEdit ? `<button type="button" class="btn-sm danger" data-admin-action="delete-event" data-id="${id}">Удалить событие</button>` : ''}
        <div class="editor-actions-main">
          <button type="button" class="btn ghost" data-admin-action="close-modal">Отмена</button>
          <button type="submit" class="btn primary" id="saveEventBtn">${eventSubmitLabel}</button>
        </div>
      </div>
    </form>
  `;

  adminModal.style.display = 'flex';

  document.getElementById('editorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveEventBtn');
    btn.textContent = 'Сохранение...';
    btn.disabled = true;

    const fd = new FormData(e.target);
    const file = fd.get('posterFile');
    let posterUrl = event.poster || 'logo.png';

    if (file && file.size > 0) {
      try {
        posterUrl = await db.uploadImage(file);
      } catch (err) {
        alert('Ошибка при загрузке картинки!');
        btn.textContent = eventSubmitLabel;
        btn.disabled = false;
        return;
      }
    }

    const data = {
      title: fd.get('title'),
      date: fd.get('date'),
      status: fd.get('status'),
      about: fd.get('about'),
      lineup: fd.get('lineup').split(',').map((s) => s.trim()).filter(Boolean),
      place: event.place,
      poster: posterUrl,
      // Пишем в snake_case колонку Supabase
      ticket_url: (fd.get('ticket_url') || '').trim(),
      stream_url: (fd.get('stream_url') || '').trim()
    };

    if (isEdit) {
      await db.updateEvent(id, data);
    } else {
      await db.addEvent(data);
    }

    adminModal.style.display = 'none';
    loadEventsView();
  });
}

async function deleteEventById(id) {
  if (confirm('Точно удалить?')) {
    await db.deleteEvent(id);
    loadEventsView();
    if (adminModal) adminModal.style.display = 'none';
  }
}

// --- РЕЛИЗЫ ---

async function loadReleasesView() {
  addBtn.style.display = 'block';
  addBtn.onclick = () => alert('Редактор релизов пока в разработке');

  const releases = await db.getReleases();
  const rows = releases.map((r) => `
    <tr>
      <td>${r.title}</td>
      <td>${r.date}</td>
      <td>${r.format}</td>
    </tr>
  `).join('');

  viewContainer.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Название</th><th>Дата</th><th>Формат</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// --- ПОДКАСТЫ ---

async function loadPodcastsView() {
  addBtn.style.display = 'block';
  addBtn.onclick = () => alert('Редактор подкастов пока в разработке');

  const podcasts = await db.getPodcasts();
  const rows = podcasts.map((p) => `
    <tr>
      <td>${p.title}</td>
      <td>${p.date}</td>
    </tr>
  `).join('');

  viewContainer.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Название</th><th>Дата</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// --- СТРИМЫ ---

async function loadStreamsView() {
  addBtn.style.display = 'block';
  addBtn.onclick = () => alert('Редактор стримов пока в разработке');

  const streams = await db.getStreams();
  const rows = streams.map((s) => `
    <tr>
      <td>${s.title}</td>
      <td>${s.date}</td>
    </tr>
  `).join('');

  viewContainer.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Название</th><th>Дата</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// --- LIVE (эфиры на главной) ---

async function loadLiveView() {
  addBtn.style.display = 'block';
  addBtn.textContent = '+ Добавить эфир';
  addBtn.onclick = () => openLiveEditor();

  const items = await db.getLiveItemsAdmin();
  items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const rows = items.map((item) => `
    <tr>
      <td><b>${item.title}</b></td>
      <td>${item.date?.replace ? item.date.replace('T', ' ') : item.date}</td>
      <td>${item.place || '—'}</td>
      <td>
        <div class="actions">
          <button type="button" class="btn-sm" data-admin-action="edit-live-item" data-id="${item.id}">Изменить</button>
        </div>
      </td>
    </tr>
  `).join('');

  viewContainer.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Название</th><th>Дата</th><th>Площадка</th><th>Действия</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

const toDatetimeLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

async function openLiveEditor(id = null) {
  let live = {
    title: '',
    date: '',
    place: 'НПО Мелодия',
    about: '',
    lineup: [],
    poster: 'logo.png',
    stream_url: ''
  };
  let isEdit = false;

  if (id) {
    const items = await db.getLiveItemsAdmin();
    const found = items.find((x) => x.id === id);
    if (found) {
      const lineupRaw = found.lineup;
      const lineupArr = Array.isArray(lineupRaw) ? lineupRaw : [];
      live = {
        ...live,
        ...found,
        lineup: lineupArr,
        stream_url: found.stream_url || found.streamUrl || '',
        date: toDatetimeLocalInput(found.date)
      };
    }
    isEdit = true;
  }

  editorTitle.textContent = isEdit ? 'Редактировать эфир (НПО РАДИО)' : 'Новый эфир (НПО РАДИО)';
  const submitLabel = isEdit ? 'Сохранить' : 'Добавить эфир';

  editorBody.innerHTML = `
    <form id="editorForm" class="editor-form">
      <div class="form-group">
        <label>Название</label>
        <input type="text" name="title" value="${live.title}" required>
      </div>
      <div class="form-group">
        <label>Дата и время</label>
        <input type="datetime-local" name="date" value="${live.date}" required>
      </div>
      <div class="form-group">
        <label>Площадка</label>
        <input type="text" name="place" value="${live.place || ''}">
      </div>
      <div class="form-group">
        <label>Ссылка на видео / аудио (YouTube, Rutube, SoundCloud, VK, Kinescope, HLS .m3u8)</label>
        <input type="url" name="stream_url" value="${live.stream_url || ''}" placeholder="https://rutube.ru/video/... или YouTube / SoundCloud">
        <div class="muted" style="font-size:12px;margin-top:6px;">Для больших файлов (от ~500 МБ) загрузите видео на Rutube или YouTube и вставьте ссылку — так воспроизведение будет с адаптивным качеством, как на YouTube.</div>
      </div>
      <div class="form-group">
        <label>Описание</label>
        <textarea name="about">${live.about || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Лайнап (через запятую)</label>
        <textarea name="lineup">${(live.lineup || []).join(', ')}</textarea>
      </div>
      <div class="form-group">
        <label>Обложка / постер</label>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
          ${live.poster ? `<img src="${resolvePosterPreview(live.poster)}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;">` : `<div style="width:40px;height:40px;background:rgba(255,255,255,0.1);border-radius:4px;"></div>`}
          <input type="file" name="posterFile" accept="image/*" style="font-size:14px;">
        </div>
        <div class="muted" style="font-size:12px;">Оставьте пустым, чтобы не менять текущую картинку.</div>
      </div>
      <div class="editor-actions${isEdit ? ' editor-actions--spread' : ''}">
        ${isEdit ? `<button type="button" class="btn-sm danger" data-admin-action="delete-live-item" data-id="${id}">Удалить</button>` : ''}
        <div class="editor-actions-main">
          <button type="button" class="btn ghost" data-admin-action="close-modal">Отмена</button>
          <button type="submit" class="btn primary" id="saveLiveBtn">${submitLabel}</button>
        </div>
      </div>
    </form>
  `;

  adminModal.style.display = 'flex';

  document.getElementById('editorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveLiveBtn');
    btn.textContent = 'Сохранение...';
    btn.disabled = true;

    const fd = new FormData(e.target);
    const file = fd.get('posterFile');
    let posterUrl = live.poster || 'logo.png';

    if (file && file.size > 0) {
      try {
        posterUrl = await db.uploadImage(file);
      } catch (err) {
        alert('Ошибка при загрузке картинки!');
        btn.textContent = submitLabel;
        btn.disabled = false;
        return;
      }
    }

    const data = {
      title: fd.get('title'),
      date: fd.get('date'),
      place: (fd.get('place') || '').trim() || null,
      about: fd.get('about'),
      lineup: String(fd.get('lineup') || '').split(',').map((s) => s.trim()).filter(Boolean),
      poster: posterUrl,
      stream_url: (fd.get('stream_url') || '').trim()
    };

    if (isEdit) {
      await db.updateLiveItem(id, data);
    } else {
      await db.addLiveItem(data);
    }

    adminModal.style.display = 'none';
    loadLiveView();
  });
}

async function deleteLiveById(id) {
  if (confirm('Точно удалить?')) {
    await db.deleteLiveItem(id);
    loadLiveView();
    if (adminModal) adminModal.style.display = 'none';
  }
}

// --- Магазин (таблица merch) ---

async function loadMerchView() {
  addBtn.style.display = 'block';
  addBtn.textContent = '+ Добавить товар';
  addBtn.onclick = () => openMerchEditor();

  const merch = await db.getMerch();
  const rows = merch.map((m) => {
    const thumb = m.poster || m.image || parseMerchImages(m)[0] || '';
    const thumbSrc = thumb ? resolveMerchPreview(thumb) : getDefaultLogoUrl();
    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${thumbSrc}" alt="" style="width:36px;height:36px;border-radius:4px;object-fit:cover;flex-shrink:0;">
          <b>${m.title || '—'}</b>
        </div>
      </td>
      <td>${m.price || '—'}</td>
      <td>${merchStatusLabel(m.status)}</td>
      <td>
        <div class="actions">
          <button type="button" class="btn-sm" data-admin-action="edit-merch" data-id="${m.id}">Изменить</button>
        </div>
      </td>
    </tr>
  `;
  }).join('');

  viewContainer.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Название</th><th>Цена</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="muted">Товаров пока нет</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

async function openMerchEditor(id = null) {
  let item = {
    title: '',
    price: '',
    desc: '',
    status: 'active',
    poster: 'logo.png',
    images: [],
    preorder_url: ''
  };
  let isEdit = false;

  if (id) {
    const list = await db.getMerch();
    const found = list.find((m) => m.id === id);
    if (found) {
      const desc =
        found.desc != null && String(found.desc).trim() !== ''
          ? String(found.desc)
          : found.description != null
            ? String(found.description)
            : '';
      item = {
        ...item,
        ...found,
        desc,
        preorder_url: found.preorder_url || found.preorderUrl || '',
        images: parseMerchImages(found)
      };
    }
    isEdit = true;
  }

  const previewSrc = item.poster && item.poster !== 'logo.png'
    ? resolveMerchPreview(item.poster)
    : (item.images[0] ? resolveMerchPreview(item.images[0]) : null);

  const mainPoster = item.poster && item.poster !== 'logo.png' ? item.poster : null;
  const extraPreviews = parseMerchImages(item)
    .filter((url) => !mainPoster || url !== mainPoster)
    .map((url) => resolveMerchPreview(url));

  editorTitle.textContent = isEdit ? 'Редактировать товар' : 'Новый товар';
  const submitLabel = isEdit ? 'Сохранить' : 'Добавить товар';

  editorBody.innerHTML = `
    <form id="editorForm" class="editor-form">
      <div class="form-group">
        <label>Название</label>
        <input type="text" name="title" value="${item.title}" required>
      </div>
      <div class="form-group">
        <label>Цена</label>
        <input type="text" name="price" value="${item.price || ''}" placeholder="например: 3 500 ₽">
      </div>
      <div class="form-group">
        <label>Статус</label>
        <select name="status">
          <option value="active" ${item.status === 'active' ? 'selected' : ''}>В продаже</option>
          <option value="preorder" ${item.status === 'preorder' ? 'selected' : ''}>Предзаказ</option>
          <option value="draft" ${item.status === 'draft' ? 'selected' : ''}>Черновик</option>
          <option value="archive" ${item.status === 'archive' ? 'selected' : ''}>Архив</option>
        </select>
      </div>
      <div class="form-group">
        <label>Описание</label>
        <textarea name="desc" rows="5">${item.desc || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Главное фото</label>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
          ${previewSrc ? `<img src="${previewSrc}" style="width:48px;height:48px;border-radius:4px;object-fit:cover;">` : `<div style="width:48px;height:48px;background:rgba(255,255,255,0.1);border-radius:4px;"></div>`}
          <input type="file" name="posterFile" accept="image/*" style="font-size:14px;">
        </div>
        <div class="muted" style="font-size:12px;">Оставьте пустым, чтобы не менять текущее фото.</div>
      </div>
      <div class="form-group">
        <label>Дополнительные фото (карусель на сайте)</label>
        ${extraPreviews.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">${extraPreviews.map((u) => `<img src="${u}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;">`).join('')}</div>` : ''}
        <input type="file" name="extraFiles" accept="image/*" multiple style="font-size:14px;">
        <div class="muted" style="font-size:12px;margin-top:6px;">Новые файлы добавятся к существующим. Загрузите снова главное фото, чтобы заменить обложку.</div>
      </div>
      <div class="form-group">
        <label>Ссылка на предзаказ (необязательно)</label>
        <input type="url" name="preorder_url" value="${item.preorder_url || ''}" placeholder="https://...">
      </div>
      <div class="editor-actions${isEdit ? ' editor-actions--spread' : ''}">
        ${isEdit ? `<button type="button" class="btn-sm danger" data-admin-action="delete-merch" data-id="${id}">Удалить товар</button>` : ''}
        <div class="editor-actions-main">
          <button type="button" class="btn ghost" data-admin-action="close-modal">Отмена</button>
          <button type="submit" class="btn primary" id="saveMerchBtn">${submitLabel}</button>
        </div>
      </div>
    </form>
  `;

  adminModal.style.display = 'flex';

  document.getElementById('editorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveMerchBtn');
    btn.textContent = 'Сохранение...';
    btn.disabled = true;

    const fd = new FormData(e.target);
    let posterUrl = item.poster || 'logo.png';
    const posterFile = fd.get('posterFile');
    const extraFiles = fd.getAll('extraFiles').filter((f) => f && f.size > 0);

    if (posterFile && posterFile.size > 0) {
      try {
        posterUrl = await db.uploadImage(posterFile);
      } catch (err) {
        alert('Ошибка при загрузке главного фото!');
        btn.textContent = submitLabel;
        btn.disabled = false;
        return;
      }
    }

    let images = [...parseMerchImages(item)];
    if (posterUrl && posterUrl !== 'logo.png') {
      images = [posterUrl, ...images.filter((u) => u !== posterUrl)];
    }

    for (const file of extraFiles) {
      try {
        const url = await db.uploadImage(file);
        if (url) images.push(url);
      } catch (err) {
        alert('Ошибка при загрузке дополнительного фото!');
        btn.textContent = submitLabel;
        btn.disabled = false;
        return;
      }
    }

    images = [...new Set(images.map((u) => String(u || '').trim()).filter(Boolean))];
    if (!images.length && posterUrl && posterUrl !== 'logo.png') {
      images = [posterUrl];
    }

    const data = {
      title: (fd.get('title') || '').trim(),
      price: (fd.get('price') || '').trim() || null,
      status: fd.get('status') || 'active',
      desc: (fd.get('desc') || '').trim() || null,
      poster: posterUrl,
      images: images.length ? images : null,
      preorder_url: (fd.get('preorder_url') || '').trim() || null
    };

    try {
      if (isEdit) {
        await db.updateMerch(id, data);
      } else {
        await db.addMerch(data);
      }
      adminModal.style.display = 'none';
      loadMerchView();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Не удалось сохранить товар');
      btn.textContent = submitLabel;
      btn.disabled = false;
    }
  });
}

async function deleteMerchById(id) {
  if (confirm('Точно удалить этот товар?')) {
    await db.deleteMerch(id);
    loadMerchView();
    if (adminModal) adminModal.style.display = 'none';
  }
}

// ---- ИНИЦИАЛИЗАЦИЯ ----

/*
  CSP в admin.html (script-src без 'unsafe-inline') блокирует inline onclick.
  Делегирование кликов по data-admin-action.
  target может быть Text-узлом внутри кнопки — у него нет .closest(), обрабатываем через родителя.
*/
function adminActionElementFromEvent(ev) {
  const t = ev.target;
  const el = t instanceof Element ? t : t.parentElement;
  return el?.closest?.('[data-admin-action]') ?? null;
}

/* Фаза capture: срабатывает до всплытия и не зависит от перехвата кликов дочерними слоями */
if (adminPanel) {
  document.addEventListener(
    'click',
    (ev) => {
      const btn = adminActionElementFromEvent(ev);
      if (!btn || btn.disabled) return;
      if (!adminPanel.contains(btn)) return;
      const action = btn.getAttribute('data-admin-action');
      const id = btn.getAttribute('data-id');
      if (action === 'make-admin' || action === 'remove-admin') {
        return;
      }
      if (action === 'edit-event' && id) {
        ev.preventDefault();
        void openEventEditor(id);
      } else if (action === 'edit-live-item' && id) {
        ev.preventDefault();
        void openLiveEditor(id);
      } else if (action === 'edit-merch' && id) {
        ev.preventDefault();
        void openMerchEditor(id);
      }
    },
    true
  );
}

if (adminModal) {
  adminModal.addEventListener('click', (ev) => {
    const btn = adminActionElementFromEvent(ev);
    if (!btn || btn.disabled) return;
    const action = btn.getAttribute('data-admin-action');
    const id = btn.getAttribute('data-id');
    if (action === 'close-modal') {
      adminModal.style.display = 'none';
      return;
    }
    if (action === 'delete-event' && id) void deleteEventById(id);
    if (action === 'delete-live-item' && id) void deleteLiveById(id);
    if (action === 'delete-merch' && id) void deleteMerchById(id);
  });
}

checkAuth();


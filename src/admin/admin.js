import * as db from '../db.js';

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
      artists: 'Артисты',
      releases: 'Релизы',
      podcasts: 'Подкасты',
      streams: 'Стримы',
      merch: 'Мерч'
    };
    pageTitle.textContent = titles[view] || view;

    if (view === 'dashboard') loadDashboard();
    if (view === 'users') loadUsersView();
    if (view === 'events') loadEventsView();
    if (view === 'artists') loadArtistsView();
    if (view === 'releases') loadReleasesView();
    if (view === 'podcasts') loadPodcastsView();
    if (view === 'streams') loadStreamsView();
    if (view === 'merch') loadMerchView();
  });
});

// ---- ДАШБОРД ----

async function loadDashboard() {
  addBtn.style.display = 'none';
  const users = await db.getUsers();
  const events = await db.getEvents();
  const artists = await db.getArtists();
  const merch = await db.getMerch();

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
        <h3>Артистов</h3>
        <p style="font-size:32px;font-weight:bold;margin:10px 0;">${artists.length}</p>
      </div>
      <div class="card pad" style="background:rgba(255,255,255,0.05)">
        <h3>Товаров (Мерч)</h3>
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

  let rows = '';
  for (const u of users) {
    const email = u.email || '—';
    const name = u.name || '—';
    const role = u.role || 'member';
    const createdSource = u.created_at !== undefined ? u.created_at : u.createdAt;
    let created = '—';
    if (createdSource) {
      const s = String(createdSource);
      created = s.slice(0, 10);
    }
    const bg = role === 'admin' ? '#fff' : 'rgba(255,255,255,0.1)';
    const color = role === 'admin' ? '#000' : '#fff';
    const disabled = role === 'admin' ? 'disabled style="opacity:0.3"' : '';

    rows +=
      '<tr>' +
      '<td>' + email + '</td>' +
      '<td>' + name + '</td>' +
      '<td><span class="tag" style="background:' + bg + ';color:' + color + '">' + role + '</span></td>' +
      '<td>' + created + '</td>' +
      '<td><div class="actions">' +
      '<button class="btn-sm" onclick="app.makeAdmin(\'' + u.id + '\')" ' + disabled + '>Сделать админом</button>' +
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
}

window.app = {
  makeAdmin: async (id) => {
    if (confirm('Сделать пользователя администратором?')) {
      await db.updateUserRole(id, 'admin');
      loadUsersView();
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
          <button class="btn-sm" onclick="app.editEvent('${e.id}')">Изменить</button>
          <button class="btn-sm danger" onclick="app.deleteEvent('${e.id}')">Удалить</button>
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
    ticket_url: ''
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
      event = { ...event, ...found, ticketUrl: ticket };
    }
    isEdit = true;
  }

  editorTitle.textContent = isEdit ? 'Редактировать событие' : 'Новое событие';

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
          ${event.poster ? `<img src="${event.poster}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;">` : `<div style="width:40px;height:40px;background:rgba(255,255,255,0.1);border-radius:4px;"></div>`}
          <input type="file" name="posterFile" accept="image/*" style="font-size:14px;">
        </div>
        <div class="muted" style="font-size:12px;">Оставьте пустым, чтобы не менять текущую картинку.</div>
      </div>
      <div class="editor-actions">
        <button type="button" class="btn ghost" onclick="document.getElementById('adminModal').style.display='none'">Отмена</button>
        <button type="submit" class="btn primary" id="saveEventBtn">Сохранить</button>
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
        btn.textContent = 'Сохранить';
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
      ticket_url: (fd.get('ticket_url') || '').trim()
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

window.app.editEvent = openEventEditor;
window.app.deleteEvent = async (id) => {
  if (confirm('Точно удалить событие?')) {
    await db.deleteEvent(id);
    loadEventsView();
  }
};

// ---- АРТИСТЫ ----

async function loadArtistsView() {
  addBtn.style.display = 'block';
  addBtn.textContent = '+ Добавить артиста';
  addBtn.onclick = () => openArtistEditor();

  const artists = await db.getArtists();
  const rows = artists.map((a) => `
    <tr>
      <td><b>${a.name}</b></td>
      <td>${a.role || '—'}</td>
      <td>${a.bookable ? 'Да' : 'Нет'}</td>
      <td>
        <div class="actions">
          <button class="btn-sm" onclick="app.editArtist('${a.id}')">Изменить</button>
          <button class="btn-sm danger" onclick="app.deleteArtist('${a.id}')">Удалить</button>
        </div>
      </td>
    </tr>
  `).join('');

  viewContainer.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Имя</th><th>Роль</th><th>Букинг</th><th>Действия</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function openArtistEditor(id = null) {
  let artist = { name: '', role: 'DJ', bookable: true, bio: '', tags: [], poster: '' };
  let isEdit = false;

  if (id) {
    const artists = await db.getArtists();
    artist = artists.find((a) => a.id === id) || artist;
    isEdit = true;
  }

  editorTitle.textContent = isEdit ? 'Редактировать артиста' : 'Новый артист';

  editorBody.innerHTML = `
    <form id="editorForm" class="editor-form">
      <div class="form-group">
        <label>Имя артиста</label>
        <input type="text" name="name" value="${artist.name}" required>
      </div>
      <div class="form-group">
        <label>Роль</label>
        <input type="text" name="role" value="${artist.role || ''}">
      </div>
      <div class="form-group">
        <label>Описание (Bio)</label>
        <textarea name="bio">${artist.bio || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Доступен для букинга</label>
        <select name="bookable">
          <option value="true" ${artist.bookable ? 'selected' : ''}>Да</option>
          <option value="false" ${!artist.bookable ? 'selected' : ''}>Нет</option>
        </select>
      </div>
      <div class="form-group">
        <label>Обложка / Фото</label>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
          ${artist.poster ? `<img src="${artist.poster}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;">` : `<div style="width:40px;height:40px;background:rgba(255,255,255,0.1);border-radius:4px;"></div>`}
          <input type="file" name="posterFile" accept="image/*" style="font-size:14px;">
        </div>
        <div class="muted" style="font-size:12px;">Оставьте пустым, чтобы не менять текущую картинку.</div>
      </div>
      <div class="editor-actions">
        <button type="button" class="btn ghost" onclick="document.getElementById('adminModal').style.display='none'">Отмена</button>
        <button type="submit" class="btn primary" id="saveArtistBtn">Сохранить</button>
      </div>
    </form>
  `;

  adminModal.style.display = 'flex';

  document.getElementById('editorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveArtistBtn');
    btn.textContent = 'Сохранение...';
    btn.disabled = true;

    const fd = new FormData(e.target);
    const file = fd.get('posterFile');
    let posterUrl = artist.poster || 'logo.png';

    if (file && file.size > 0) {
      try {
        posterUrl = await db.uploadImage(file);
      } catch (err) {
        alert('Ошибка при загрузке картинки!');
        btn.textContent = 'Сохранить';
        btn.disabled = false;
        return;
      }
    }

    const data = {
      name: fd.get('name'),
      role: fd.get('role'),
      bio: fd.get('bio'),
      bookable: fd.get('bookable') === 'true',
      tags: artist.tags,
      poster: posterUrl
    };

    if (isEdit) {
      await db.updateArtist(id, data);
    } else {
      await db.addArtist(data);
    }

    adminModal.style.display = 'none';
    loadArtistsView();
  });
}

window.app.editArtist = openArtistEditor;
window.app.deleteArtist = async (id) => {
  if (confirm('Точно удалить артиста?')) {
    await db.deleteArtist(id);
    loadArtistsView();
  }
};

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

// --- МЕРЧ ---

async function loadMerchView() {
  addBtn.style.display = 'block';
  addBtn.onclick = () => alert('Редактор мерча пока в разработке');

  const merch = await db.getMerch();
  const rows = merch.map((m) => `
    <tr>
      <td>${m.title}</td>
      <td>${m.price}</td>
      <td>${m.status}</td>
    </tr>
  `).join('');

  viewContainer.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Название</th><th>Цена</th><th>Статус</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ---- ИНИЦИАЛИЗАЦИЯ ----

checkAuth();


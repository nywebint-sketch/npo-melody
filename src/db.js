/**
 * Слой данных (Data Layer) — Supabase Integration
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rvswpgsxutfcpgvmzonr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3dwZ3N4dXRmY3Bndm16b25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQ1MTEsImV4cCI6MjA4ODY2MDUxMX0.I_XagunD2zgTVmpaOrt4SvbJbJFHAJAd2j7JpYb26oY';
const STORAGE_BUCKET = 'images';

let supabaseClt = null;
let dbHealth = {
  hasNetworkIssue: false,
  lastErrorMessage: '',
  lastErrorAt: 0,
  errorCount: 0
};
let lastLoggedNetworkErrorAt = 0;
let lastLoggedNetworkErrorMsg = '';
const NETWORK_ERROR_LOG_DEBOUNCE_MS = 15000;

const NETWORK_ERROR_RE = /Failed to fetch|NetworkError|ERR_NAME_NOT_RESOLVED|Could not resolve host|Load failed|fetch/i;

const toErrorMessage = (errorLike) => {
  if (!errorLike) return '';
  const message = errorLike.message || errorLike.details || errorLike.hint || '';
  if (message) return String(message);
  try {
    return JSON.stringify(errorLike);
  } catch {
    return String(errorLike);
  }
};

const emitDbHealth = () => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('db:health', { detail: { ...dbHealth } }));
};

const markDbError = (errorLike) => {
  const msg = toErrorMessage(errorLike);
  dbHealth = {
    hasNetworkIssue: NETWORK_ERROR_RE.test(msg),
    lastErrorMessage: msg,
    lastErrorAt: Date.now(),
    errorCount: dbHealth.errorCount + 1
  };
  emitDbHealth();
};

const reportDbError = (errorLike) => {
  const msg = toErrorMessage(errorLike);
  const isNetworkError = NETWORK_ERROR_RE.test(msg);
  if (!isNetworkError) {
    console.error(errorLike);
    return;
  }
  const now = Date.now();
  const isSameAsLast = msg === lastLoggedNetworkErrorMsg;
  if (isSameAsLast && now - lastLoggedNetworkErrorAt < NETWORK_ERROR_LOG_DEBOUNCE_MS) return;
  lastLoggedNetworkErrorAt = now;
  lastLoggedNetworkErrorMsg = msg;
  console.warn('[db] Supabase network/DNS is unavailable:', msg);
};

const markDbSuccess = () => {
  if (!dbHealth.hasNetworkIssue && !dbHealth.lastErrorMessage) return;
  dbHealth = {
    hasNetworkIssue: false,
    lastErrorMessage: '',
    lastErrorAt: dbHealth.lastErrorAt,
    errorCount: dbHealth.errorCount
  };
  emitDbHealth();
};

const getDbHealth = () => ({ ...dbHealth });

/**
 * GoTrue по умолчанию использует Navigator Locks для localStorage-сессии.
 * Параллельные getSession/getUser (например при init) дают в консоли предупреждения
 * «Lock … was not released» / «stolen». Для одной вкладки достаточно выполнять
 * операции без глобальной блокировки (как в @supabase/auth-js lock: noop для RN).
 */
const authLockNoop = async (_name, _acquireTimeout, fn) => fn();

const SUPABASE_OPTIONS = {
  auth: {
    lock: authLockNoop
  }
};

const clearStaleAuth = (client) => {
  // После createClient внутри уже идёт инициализация сессии — отложим, чтобы не бить второй запрос в ту же миллисекунду.
  queueMicrotask(() => {
    client.auth.getUser().then(({ error }) => {
      if (!error) return;
      const msg = String(error.message || '');
      if (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found')) {
        client.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    });
  });
};

const initSupabase = () => {
  if (!supabaseClt) {
    supabaseClt = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_OPTIONS);
    clearStaleAuth(supabaseClt);
  }
  return supabaseClt;
};

const safeArray = (data, error) => {
  if (error) {
    reportDbError(error);
    markDbError(error);
    return [];
  }
  markDbSuccess();
  return Array.isArray(data) ? data : [];
};

const withClient = async (fn, fallback = null) => {
  const client = initSupabase();
  if (!client) return fallback;
  try {
    return await fn(client);
  } catch (error) {
    reportDbError(error);
    markDbError(error);
    return fallback;
  }
};

const getEvents = async () => withClient(async (client) => {
  const { data, error } = await client.from('events').select('*').order('date', { ascending: true });
  return safeArray(data, error);
}, []);

// Админка: показываем "самое недавно добавленное" сверху.
// Поле создаётся Supabase автоматически (`created_at`), поэтому сортируем по нему.
const getEventsAdmin = async () =>
  withClient(async (client) => {
    const { data, error } = await client.from('events').select('*').order('created_at', { ascending: false });
    return safeArray(data, error);
  }, []);

const getArtists = async () => withClient(async (client) => {
  const { data, error } = await client.from('artists').select('*').order('name', { ascending: true });
  return safeArray(data, error);
}, []);

const getReleases = async () => withClient(async (client) => {
  const { data, error } = await client.from('releases').select('*').order('date', { ascending: false });
  return safeArray(data, error);
}, []);

const getPodcasts = async () => withClient(async (client) => {
  const { data, error } = await client.from('podcasts').select('*').order('date', { ascending: false });
  return safeArray(data, error);
}, []);

const getStreams = async () => withClient(async (client) => {
  const { data, error } = await client.from('streams').select('*').order('date', { ascending: false });
  return safeArray(data, error);
}, []);

const getLiveItems = async () => withClient(async (client) => {
  const { data, error } = await client.from('live_items').select('*').order('date', { ascending: true });
  return safeArray(data, error);
}, []);

const getLiveItemsAdmin = async () =>
  withClient(async (client) => {
    const { data, error } = await client.from('live_items').select('*').order('created_at', { ascending: false });
    return safeArray(data, error);
  }, []);

const getMerch = async () => withClient(async (client) => {
  const { data, error } = await client.from('merch').select('*').order('title', { ascending: true });
  return safeArray(data, error);
}, []);

const getFooterSocials = async () => withClient(async (client) => {
  const { data, error } = await client
    .from('footer_socials')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return safeArray(data, error);
}, []);

const getSession = async () => withClient(async (client) => {
  const { data: { session }, error } = await client.auth.getSession();
  if (error) {
    reportDbError(error);
    markDbError(error);
    return null;
  }
  markDbSuccess();
  return session;
}, null);

const login = async (email, password) => {
  const client = initSupabase();
  if (!client) throw new Error('Supabase client is not initialized');
  return client.auth.signInWithPassword({ email, password });
};

const register = async (email, password, name) => {
  const client = initSupabase();
  if (!client) throw new Error('Supabase client is not initialized');
  return client.auth.signUp({ email, password, options: { data: { name } } });
};

const logout = async () => {
  const client = initSupabase();
  if (!client) return null;
  return client.auth.signOut();
};

// Используем таблицу profiles как источник пользователей (email / name / role)
const getUsers = async () => withClient(async (client) => {
  const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
  const rows = safeArray(data, error);
  // В части схем вместо `id` используется `user_id` (тот же UUID, что в auth.users)
  return rows.map((row) => {
    if (!row || row.id) return row;
    if (row.user_id) return { ...row, id: row.user_id };
    return row;
  });
}, []);

const checkIsAdmin = async () => {
  const session = await getSession();
  if (!session?.user?.id) return false;
  const users = await getUsers();
  const me = users.find((user) => user.id === session.user.id || user.email === session.user.email);
  return me?.role === 'admin';
};

const updateUserRole = async (id, role) => {
  const client = initSupabase();
  if (!client) throw new Error('Supabase client is not initialized');
  const tryUpdate = async (column) => {
    const { data, error } = await client.from('profiles').update({ role }).eq(column, id).select();
    if (error) throw error;
    return data;
  };
  let rows = await tryUpdate('id');
  if (!rows?.length) {
    try {
      rows = await tryUpdate('user_id');
    } catch (e) {
      const msg = String(e?.message || e?.details || '');
      // колонка `user_id` может отсутствовать в схеме
      if (!/column|does not exist|Could not find|user_id/i.test(msg)) throw e;
    }
  }
  if (!rows?.length) {
    throw new Error('Профиль не найден или нет прав на изменение (проверьте RLS в Supabase).');
  }
  return rows[0];
};

const uploadImage = async (file) => withClient(async (client) => {
  if (!file) throw new Error('Файл не передан');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `uploads/${fileName}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw error;
  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || '';
}, '');

const createEvent = async (payload) => withClient(async (client) => {
  const { data, error } = await client.from('events').insert(payload).select().single();
  if (error) throw error;
  return data;
}, null);

// Совместимость с админкой, которая вызывает db.addEvent/db.addArtist
const addEvent = createEvent;

const updateEvent = async (id, payload) => withClient(async (client) => {
  const { data, error } = await client.from('events').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}, null);

const deleteEvent = async (id) => withClient(async (client) => {
  const { error } = await client.from('events').delete().eq('id', id);
  if (error) throw error;
  return true;
}, false);

const createArtist = async (payload) => withClient(async (client) => {
  const { data, error } = await client.from('artists').insert(payload).select().single();
  if (error) throw error;
  return data;
}, null);

const addArtist = createArtist;

const updateArtist = async (id, payload) => withClient(async (client) => {
  const { data, error } = await client.from('artists').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}, null);

const deleteArtist = async (id) => withClient(async (client) => {
  const { error } = await client.from('artists').delete().eq('id', id);
  if (error) throw error;
  return true;
}, false);

const createLiveItem = async (payload) => withClient(async (client) => {
  const { data, error } = await client.from('live_items').insert(payload).select().single();
  if (error) throw error;
  return data;
}, null);

const addLiveItem = createLiveItem;

const updateLiveItem = async (id, payload) => withClient(async (client) => {
  const { data, error } = await client.from('live_items').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}, null);

const deleteLiveItem = async (id) => withClient(async (client) => {
  const { error } = await client.from('live_items').delete().eq('id', id);
  if (error) throw error;
  return true;
}, false);

const syncDefaultData = async () => true;

const api = {
  initSupabase,
  getDbHealth,
  getEvents, getEventsAdmin, getArtists, getReleases, getPodcasts, getStreams, getLiveItems, getLiveItemsAdmin, getMerch, getFooterSocials,
  getSession, login, register, logout, syncDefaultData,
  getUsers, checkIsAdmin, updateUserRole, uploadImage,
  createEvent, updateEvent, deleteEvent, addEvent,
  createArtist, updateArtist, deleteArtist, addArtist,
  createLiveItem, updateLiveItem, deleteLiveItem, addLiveItem
};

window.dbLayer = api;

export {
  initSupabase,
  getDbHealth,
  getEvents, getEventsAdmin,
  getArtists, getReleases, getPodcasts, getStreams, getLiveItems, getLiveItemsAdmin, getMerch, getFooterSocials,
  getSession, login, register, logout, syncDefaultData,
  getUsers, checkIsAdmin, updateUserRole, uploadImage,
  createEvent, updateEvent, deleteEvent, addEvent,
  createArtist, updateArtist, deleteArtist, addArtist,
  createLiveItem, updateLiveItem, deleteLiveItem, addLiveItem
};


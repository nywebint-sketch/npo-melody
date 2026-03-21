/**
 * Слой данных (Data Layer) — Supabase Integration
 */
const SUPABASE_URL = 'https://rvswpgsxutfcpgvmzonr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3dwZ3N4dXRmY3Bndm16b25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQ1MTEsImV4cCI6MjA4ODY2MDUxMX0.I_XagunD2zgTVmpaOrt4SvbJbJFHAJAd2j7JpYb26oY';
const STORAGE_BUCKET = 'images';

let supabaseClt = null;

const clearStaleAuth = (client) => {
  client.auth.getUser().then(({ error }) => {
    if (!error) return;
    const msg = String(error.message || '');
    if (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found')) {
      client.auth.signOut({ scope: 'local' }).catch(() => {});
    }
  });
};

const initSupabase = () => {
  if (!window.supabase) return null;
  if (!supabaseClt) {
    supabaseClt = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    clearStaleAuth(supabaseClt);
  }
  return supabaseClt;
};

const safeArray = (data, error) => {
  if (error) {
    console.error(error);
    return [];
  }
  return Array.isArray(data) ? data : [];
};

const withClient = async (fn, fallback = null) => {
  const client = initSupabase();
  if (!client) return fallback;
  try {
    return await fn(client);
  } catch (error) {
    console.error(error);
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

const getMerch = async () => withClient(async (client) => {
  const { data, error } = await client.from('merch').select('*').order('title', { ascending: true });
  return safeArray(data, error);
}, []);

const getSession = async () => withClient(async (client) => {
  const { data: { session } } = await client.auth.getSession();
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
  return safeArray(data, error);
}, []);

const checkIsAdmin = async () => {
  const session = await getSession();
  if (!session?.user?.id) return false;
  const users = await getUsers();
  const me = users.find((user) => user.id === session.user.id || user.email === session.user.email);
  return me?.role === 'admin';
};

const updateUserRole = async (id, role) => withClient(async (client) => {
  const { data, error } = await client.from('profiles').update({ role }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}, null);

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

const syncDefaultData = async () => true;

const api = {
  initSupabase,
  getEvents, getEventsAdmin, getArtists, getReleases, getPodcasts, getStreams, getMerch,
  getSession, login, register, logout, syncDefaultData,
  getUsers, checkIsAdmin, updateUserRole, uploadImage,
  createEvent, updateEvent, deleteEvent, addEvent,
  createArtist, updateArtist, deleteArtist, addArtist
};

window.dbLayer = api;

export {
  initSupabase,
  getEvents, getEventsAdmin,
  getArtists, getReleases, getPodcasts, getStreams, getMerch,
  getSession, login, register, logout, syncDefaultData,
  getUsers, checkIsAdmin, updateUserRole, uploadImage,
  createEvent, updateEvent, deleteEvent, addEvent,
  createArtist, updateArtist, deleteArtist, addArtist
};


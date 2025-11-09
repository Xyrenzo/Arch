export async function apiFetch(path, opts = {}) {
  const base = 'https://arch-lpaw.onrender.com';
  const headers = opts.headers || {};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(base + path, { ...opts, headers, credentials: 'include' });
  if (!res.ok) throw res;
  return res.json();
}

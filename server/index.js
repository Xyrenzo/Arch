import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { initDB, getDB, saveDb, queryAll, queryOne } from './db.js';
import { stringify } from 'csv-stringify';

dotenv.config();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive:true });

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 30*1024*1024 } });
const app = express();
app.use(cors({ origin:'https://arch-community.onrender.com', credentials:true }));
app.use(express.json());
app.use(cookieParser());
app.use('/seed', express.static(path.join(process.cwd(), '../client/public/seed')));
app.use('/uploads', express.static(path.join(process.cwd(), UPLOAD_DIR)));

await initDB();
const db = getDB();

function signAccess(user){
  return jwt.sign({ sub:user.id, role:user.role }, ACCESS_SECRET, { expiresIn:'20m' });
}

function signRefresh(user){
  return jwt.sign({ sub:user.id }, REFRESH_SECRET, { expiresIn:'30d' });
}

function authMiddleware(req,res,next){
  const header = req.headers.authorization;
  if(!header) return res.status(401).json({ error:'no auth' });
  const token = header.replace('Bearer ','');
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = payload;
    next();
  } catch(e) { res.status(401).json({ error:'invalid token' }); }
}

function adminOnly(req,res,next){
  if(!req.user || req.user.role!=='admin') return res.status(403).json({ error:'forbidden' });
  next();
}

function insideAktau(lat,lng){
  const minLat=43.62, maxLat=43.68, minLng=51.12, maxLng=51.20;
  return lat>=minLat && lat<=maxLat && lng>=minLng && lng<=maxLng;
}

app.post('/api/auth/register', async (req,res)=>{
  const { username,email,password } = req.body;
  if(!username||!password) return res.status(400).json({ error:'missing' });
  const hash = await bcrypt.hash(password,10);
  try{
    db.run('INSERT INTO users (username,email,password_hash) VALUES (?,?,?)',[username,email||null,hash]);
    
    const newUser = queryOne('SELECT id FROM users WHERE username=?', [username]);
    if(newUser) {
      db.run('INSERT INTO user_profiles (user_id) VALUES (?)', [newUser.id]);
    }
    
    saveDb();
    res.status(201).json({ ok:true });
  } catch(e){ res.status(400).json({ error:'user exists' }); }
});

app.post('/api/auth/login', async (req,res)=>{
  const { username,password } = req.body;
  if(!username||!password) return res.status(400).json({ error:'missing' });
  const row = queryOne('SELECT * FROM users WHERE username=?',[username]);
  if(!row) return res.status(401).json({ error:'invalid' });
  const ok = await bcrypt.compare(password,row.password_hash);
  if(!ok) return res.status(401).json({ error:'invalid' });
  const access = signAccess(row);
  const refresh = signRefresh(row);
  res.cookie('refresh',refresh,{ httpOnly:true, sameSite:'lax' });
  res.json({ access, user:{ id:row.id, username:row.username, role:row.role } });
});

app.post('/api/auth/logout',(req,res)=>{
  res.clearCookie('refresh');
  res.json({ ok:true });
});

app.post('/api/auth/refresh',(req,res)=>{
  const token = req.cookies.refresh;
  if(!token) return res.status(401).json({ error:'no refresh' });
  try{
    const payload = jwt.verify(token, REFRESH_SECRET);
    const row = queryOne('SELECT id, username, role FROM users WHERE id=?',[payload.sub]);
    if(!row) return res.status(401).json({ error:'invalid' });
    const access = jwt.sign({ sub:row.id, role:row.role }, ACCESS_SECRET, { expiresIn:'20m' });
    res.json({ access, user:row });
  } catch(e){ res.status(401).json({ error:'invalid' }); }
});

app.get('/api/markers',(req,res)=>{
  const { categories, subcategories, status, bbox } = req.query;
  let sql = 'SELECT * FROM markers';
  const cond=[]; const params=[];
  if(categories){ const cats=categories.split(','); cond.push(`category IN (${cats.map(()=>'?').join(',')})`); params.push(...cats); }
  if(subcategories){ const subs=subcategories.split(','); cond.push(`subcategory IN (${subs.map(()=>'?').join(',')})`); params.push(...subs); }
  if(status){ const sts=status.split(','); cond.push(`status IN (${sts.map(()=>'?').join(',')})`); params.push(...sts); }
  if(bbox){ const [minLat,minLng,maxLat,maxLng] = bbox.split(',').map(Number); cond.push('latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?'); params.push(minLat,maxLat,minLng,maxLng); }
  if(cond.length) sql+=' WHERE '+cond.join(' AND ');
  const rows = queryAll(sql, params);
  res.json(rows);
});

app.get('/api/markers/:id',(req,res)=>{
  const id = Number(req.params.id);
  const row = queryOne('SELECT * FROM markers WHERE id=?',[id]);
  if(!row) return res.status(404).json({ error:'not found' });
  res.json(row);
});

app.post('/api/markers', authMiddleware, upload.array('media',6), (req,res)=>{
  const { title, description, category, subcategory, latitude, longitude, event_start, event_end } = req.body;
  const lat = Number(latitude), lng = Number(longitude);
  if(!insideAktau(lat,lng)) return res.status(400).json({ error:'out of bounds' });

  const files = (req.files||[]).map(f=>({ type:f.mimetype.startsWith('video')?'video':'image', url:`/uploads/${f.filename}` }));
  db.run(
    'INSERT INTO markers (title,description,category,subcategory,latitude,longitude,reporter_id,media,event_start,event_end, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [title||null, description||null, category, subcategory||null, lat, lng, req.user.sub, JSON.stringify(files), event_start||null, event_end||null, 'sent']
  );
  saveDb();
  res.status(201).json({ ok:true });
});

app.delete('/api/markers/:id', authMiddleware, (req,res)=>{
  const id = Number(req.params.id);
  const marker = queryOne('SELECT * FROM markers WHERE id=?',[id]);
  if(!marker) return res.status(404).json({ error:'not found' });
  if(marker.reporter_id!==req.user.sub && req.user.role!=='admin') return res.status(403).json({ error:'forbidden' });
  db.run('DELETE FROM markers WHERE id=?',[id]);
  saveDb();
  res.json({ ok:true });
});

app.patch('/api/markers/:id/status', authMiddleware, adminOnly, (req,res)=>{
  const id = Number(req.params.id);
  const { status } = req.body;
  const prev = queryOne('SELECT status FROM markers WHERE id=?',[id]);
  if(!prev) return res.status(404).json({ error:'not found' });
  db.run('UPDATE markers SET status=? WHERE id=?',[status,id]);
  db.run('INSERT INTO marker_history (marker_id,prev_status,new_status,changed_by) VALUES (?,?,?,?)',[id, prev.status, status, req.user.sub]);
  saveDb();
  res.json({ ok:true });
});

app.get('/api/markers/:id/like', authMiddleware, (req, res) => {
  const markerId = Number(req.params.id);
  const userId = req.user.sub;
  
  const like = queryOne('SELECT * FROM marker_likes WHERE marker_id=? AND user_id=?', [markerId, userId]);
  const likesCount = queryOne('SELECT COUNT(*) as c FROM marker_likes WHERE marker_id=?', [markerId]).c;
  
  res.json({ liked: !!like, likesCount });
});

app.post('/api/markers/:id/like', authMiddleware, (req, res) => {
  const markerId = Number(req.params.id);
  const userId = req.user.sub;
  
  const existingLike = queryOne('SELECT * FROM marker_likes WHERE marker_id=? AND user_id=?', [markerId, userId]);
  
  if (existingLike) {
    db.run('DELETE FROM marker_likes WHERE marker_id=? AND user_id=?', [markerId, userId]);
  } else {
    db.run('INSERT INTO marker_likes (marker_id, user_id) VALUES (?,?)', [markerId, userId]);
  }
  
  saveDb();
  
  const likesCount = queryOne('SELECT COUNT(*) as c FROM marker_likes WHERE marker_id=?', [markerId]).c;
  res.json({ liked: !existingLike, likesCount });
});

app.post('/api/users/:id/follow', authMiddleware, (req, res) => {
  const targetUserId = Number(req.params.id);
  const followerId = req.user.sub;
  
  if (targetUserId === followerId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  
  const targetUser = queryOne('SELECT * FROM user_profiles WHERE user_id=?', [targetUserId]);
  const status = targetUser?.is_private ? 'pending' : 'accepted';
  
  try {
    db.run('INSERT OR REPLACE INTO followers (follower_id, following_id, status) VALUES (?,?,?)', 
      [followerId, targetUserId, status]);
    saveDb();
    res.json({ status });
  } catch (e) {
    res.status(400).json({ error: 'Already following' });
  }
});

app.get('/api/users/:id', authMiddleware, (req, res) => {
  const userId = Number(req.params.id);
  const user = queryOne('SELECT id, username, email, role, created_at FROM users WHERE id=?', [userId]);
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const profile = queryOne('SELECT * FROM user_profiles WHERE user_id=?', [userId]) || {};
  res.json({ ...user, ...profile });
});

app.get('/api/users/:id/markers', authMiddleware, (req, res) => {
  const userId = Number(req.params.id);
  const targetUser = queryOne('SELECT * FROM user_profiles WHERE user_id=?', [userId]);
  
  if (targetUser?.is_private && req.user.sub !== userId) {
    const follow = queryOne('SELECT * FROM followers WHERE follower_id=? AND following_id=? AND status="accepted"', [req.user.sub, userId]);
    if (!follow) {
      return res.status(403).json({ error: 'Private account' });
    }
  }
  
  const markers = queryAll('SELECT * FROM markers WHERE reporter_id=? ORDER BY created_at DESC', [userId]);
  res.json(markers);
});

app.get('/api/users/:id/follow-status', authMiddleware, (req, res) => {
  const targetUserId = Number(req.params.id);
  const follow = queryOne('SELECT * FROM followers WHERE follower_id=? AND following_id=?', [req.user.sub, targetUserId]);
  
  res.json({ status: follow?.status || null });
});

app.post('/api/users/:id/follow', authMiddleware, (req, res) => {
  const targetUserId = Number(req.params.id);
  
  if (targetUserId === req.user.sub) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  
  const targetUser = queryOne('SELECT * FROM user_profiles WHERE user_id=?', [targetUserId]);
  const status = targetUser?.is_private ? 'pending' : 'accepted';
  
  try {
    db.run('INSERT OR REPLACE INTO followers (follower_id, following_id, status) VALUES (?,?,?)', 
      [req.user.sub, targetUserId, status]);
    saveDb();
    res.json({ status });
  } catch (e) {
    res.status(400).json({ error: 'Already following' });
  }
});

app.delete('/api/users/:id/follow', authMiddleware, (req, res) => {
  const targetUserId = Number(req.params.id);
  
  db.run('DELETE FROM followers WHERE follower_id=? AND following_id=?', [req.user.sub, targetUserId]);
  saveDb();
  res.json({ ok: true });
});

app.get('/api/users/:id/followers', authMiddleware, (req, res) => {
  const userId = Number(req.params.id);
  const targetUser = queryOne('SELECT * FROM user_profiles WHERE user_id=?', [userId]);
  
  if (targetUser?.hide_followers && req.user.sub !== userId) {
    return res.status(403).json({ error: 'Followers hidden' });
  }
  
  const followers = queryAll(`
    SELECT u.id, u.username, u.email 
    FROM users u
    JOIN followers f ON u.id = f.follower_id
    WHERE f.following_id = ? AND f.status = 'accepted'
  `, [userId]);
  
  res.json(followers);
});

app.get('/api/users/:id/following', authMiddleware, (req, res) => {
  const userId = Number(req.params.id);
  const targetUser = queryOne('SELECT * FROM user_profiles WHERE user_id=?', [userId]);
  
  if (targetUser?.hide_following && req.user.sub !== userId) {
    return res.status(403).json({ error: 'Following hidden' });
  }
  
  const following = queryAll(`
    SELECT u.id, u.username, u.email 
    FROM users u
    JOIN followers f ON u.id = f.following_id
    WHERE f.follower_id = ? AND f.status = 'accepted'
  `, [userId]);
  
  res.json(following);
});

const adminCount = queryOne('SELECT COUNT(*) as c FROM users WHERE role="admin"').c;
if(adminCount === 0){
  const adminHash = await bcrypt.hash('admin123', 10);
  db.run('INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)', 
    ['admin', 'admin@aktau.kz', adminHash, 'admin']);
  
  const adminUser = queryOne('SELECT id FROM users WHERE username="admin"');
  if(adminUser) {
    db.run('INSERT INTO user_profiles (user_id) VALUES (?)', [adminUser.id]);
  }
  
  saveDb();
  console.log('Admin user created: admin / admin123');
}

const profileCount = queryOne('SELECT COUNT(*) as c FROM user_profiles').c;
if(profileCount === 0){
  const users = queryAll('SELECT id FROM users');
  users.forEach(user => {
    db.run('INSERT INTO user_profiles (user_id) VALUES (?)', [user.id]);
  });
  saveDb();
  console.log('Created user profiles for existing users');
}

app.patch('/api/users/:id', authMiddleware, async (req, res) => {
  const userId = Number(req.params.id);
  if (req.user.sub !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { username, email, password } = req.body;
  const updates = [];
  const params = [];

  if (username && username !== req.user.username) {
    updates.push('username = ?');
    params.push(username);
  }

  if (email) {
    updates.push('email = ?');
    params.push(email);
  }

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?');
    params.push(hash);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No changes provided' });
  }

  params.push(userId);

  try {
    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    saveDb();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Update failed' });
  }
});

app.post('/api/users/:id/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  const userId = Number(req.params.id);
  if (req.user.sub !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const avatarUrl = `/uploads/${req.file.filename}`;
  
  db.run('UPDATE user_profiles SET avatar_url = ? WHERE user_id = ?', [avatarUrl, userId]);
  saveDb();
  
  res.json({ ok: true, avatarUrl });
});

app.get('/api/admin/check', authMiddleware, (req, res) => {
  res.json({ isAdmin: req.user.role === 'admin' });
});

app.get('/api/admin/metrics', authMiddleware, adminOnly, (req,res)=>{
  const total = queryOne('SELECT COUNT(*) as c FROM markers').c;
  const byStatus = queryAll('SELECT status, COUNT(*) as c FROM markers GROUP BY status');
  res.json({ total, byStatus });
});

app.get('/api/admin/export.csv', authMiddleware, adminOnly, (req,res)=>{
  const rows = queryAll('SELECT * FROM markers');
  res.setHeader('Content-Type','text/csv');
  const columns = Object.keys(rows[0]||{});
  stringify(rows, { header:true, columns }).pipe(res);
});

app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
  const users = queryAll(`
    SELECT u.*, 
           up.is_private,
           up.hide_posts,
           up.hide_following,
           up.hide_followers,
           (SELECT COUNT(*) FROM markers m WHERE m.reporter_id = u.id) as markers_count
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    ORDER BY u.created_at DESC
  `);
  res.json(users);
});

app.delete('/api/admin/users/:id', authMiddleware, adminOnly, (req, res) => {
  const userId = Number(req.params.id);
  const user = queryOne('SELECT * FROM users WHERE id=?', [userId]);
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin' });
  
  db.run('DELETE FROM users WHERE id=?', [userId]);
  saveDb();
  res.json({ ok: true });
});

app.get('/api/admin/check', authMiddleware, (req, res) => {
  res.json({ isAdmin: req.user.role === 'admin' });
});


app.patch('/api/users/:id', authMiddleware, async (req, res) => {
  const userId = Number(req.params.id);
  if (req.user.sub !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { username, email, password } = req.body;
  const updates = [];
  const params = [];

  if (username) {
    updates.push('username = ?');
    params.push(username);
  }

  if (email) {
    updates.push('email = ?');
    params.push(email);
  }

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?');
    params.push(hash);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No changes provided' });
  }

  params.push(userId);

  try {
    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    saveDb();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Update failed' });
  }
});

app.get('/api/users/:id/likes', authMiddleware, (req, res) => {
  const userId = Number(req.params.id);
  
  const markers = queryAll(`
    SELECT m.* 
    FROM markers m
    JOIN marker_likes ml ON m.id = ml.marker_id
    WHERE ml.user_id = ?
    ORDER BY ml.created_at DESC
  `, [userId]);
  
  res.json(markers);
});


app.post('/api/users/:id/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  const userId = Number(req.params.id);
  if (req.user.sub !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const avatarUrl = `/uploads/${req.file.filename}`;
  
  
  const profile = queryOne('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  if (!profile) {
    db.run('INSERT INTO user_profiles (user_id, avatar_url) VALUES (?, ?)', [userId, avatarUrl]);
  } else {
    db.run('UPDATE user_profiles SET avatar_url = ? WHERE user_id = ?', [avatarUrl, userId]);
  }
  
  saveDb();
  
  res.json({ ok: true, avatarUrl });
});


app.get('/api/markers-with-likes', authMiddleware, (req, res) => {
  const { categories, subcategories } = req.query;
  let sql = `
    SELECT m.*, 
           COUNT(ml.id) as likes_count,
           EXISTS(SELECT 1 FROM marker_likes ml2 WHERE ml2.marker_id = m.id AND ml2.user_id = ?) as user_liked
    FROM markers m
    LEFT JOIN marker_likes ml ON m.id = ml.marker_id
  `;
  
  const params = [req.user.sub];
  const cond = [];
  
  if (categories) { 
    const cats = categories.split(','); 
    cond.push(`m.category IN (${cats.map(() => '?').join(',')})`); 
    params.push(...cats); 
  }
  
  if (subcategories) { 
    const subs = subcategories.split(','); 
    cond.push(`m.subcategory IN (${subs.map(() => '?').join(',')})`); 
    params.push(...subs); 
  }
  
  if (cond.length) sql += ' WHERE ' + cond.join(' AND ');
  sql += ' GROUP BY m.id ORDER BY m.created_at DESC';
  
  const rows = queryAll(sql, params);
  res.json(rows);
});

const seedCount = queryOne('SELECT COUNT(*) as c FROM markers').c;
if(seedCount===0){
  const seed = [
    ['Пожар на свалке','Горит мусор на окраине города, сильный дым','emergencies','fire',43.6423,51.1589,'sent','[{"type":"image","url":"/seed/fire1.jpg"}]'],
    ['Авария на трассе','Столкновение двух автомобилей, есть пострадавшие','emergencies','ambulance',43.6487,51.1723,'processing','[{"type":"image","url":"/seed/event1.jpg"}]'],
    ['Ограбление магазина','Вооруженное ограбление в центре города','emergencies','police',43.6534,51.1651,'sent','[{"type":"video","url":"/seed/conflict1.mp4"}]'],
    ['Утечка газа','Запах газа в жилом доме','emergencies','fire',43.6472,51.1618,'resolved','[]'],
    ['Свалка мусора в парке','Куча строительного мусора в центральном парке','problems','environmental',43.6512,51.1594,'sent','[{"type":"image","url":"/seed/event1.jpg"}]'],
    ['Загрязнение пляжа','Пластик и мусор на побережье','problems','environmental',43.6398,51.1527,'processing','[{"type":"image","url":"/seed/event1.jpg"}]'],
    ['Незаконная свалка','Строительные отходы в лесополосе','problems','environmental',43.6456,51.1689,'sent','[{"type":"image","url":"/seed/fire1.jpg"}]'],
    ['Драка у бара','Массовая драка после футбольного матча','problems','conflicts',43.6567,51.1632,'sent','[{"type":"video","url":"/seed/conflict1.mp4"}]'],
    ['Соседский конфликт','Постоянный шум и скандалы ночью','problems','conflicts',43.6493,51.1576,'processing','[]'],
    ['Конфликт на рынке','Спор между продавцами из-за места','problems','conflicts',43.6521,51.1714,'resolved','[]'],
    ['Сломанная скамейка','Спинка оторвана, опасно сидеть','problems','infrastructure',43.6548,51.1601,'sent','[{"type":"image","url":"/seed/event1.jpg"}]'],
    ['Яма на дороге','Большая яма на главной улице','problems','infrastructure',43.6479,51.1643,'processing','[{"type":"image","url":"/seed/fire1.jpg"}]'],
    ['Не работает фонарь','Темно вечером, опасно ходить','problems','infrastructure',43.6515,51.1582,'sent','[{"type":"image","url":"/seed/fire1.jpg"}]'],
    ['Шумные соседи','Громкая музыка после 23:00','problems','complaints',43.6484,51.1627,'sent','[]'],
    ['Парковка на газоне','Машины паркуются на зеленой зоне','problems','complaints',43.6537,51.1669,'processing','[{"type":"image","url":"/seed/fire1.jpg"}]'],
    ['Бродячие собаки','Стая собак возле детской площадки','problems','complaints',43.6502,51.1598,'sent','[{"type":"image","url":"/seed/event1.jpg"}]'],
    ['Автобус №12 сломался','Задерживается рейс на маршруте','transport','buses',43.6551,51.1673,'sent','[{"type":"video","url":"/seed/conflict1.mp4"}]'],
    ['Отсутствует расписание','Нет информации об автобусе №7','transport','buses',43.6498,51.1615,'processing','[]'],
    ['Переполненный автобус','В час пик не хватает мест','transport','buses',43.6529,51.1642,'sent','[{"type":"video","url":"/seed/conflict1.mp4"}]'],
    ['Самокаты блокируют тротуар','Нельзя пройти пешеходам','transport','scooters',43.6543,51.1621,'sent','[{"type":"image","url":"/seed/event1.jpg"}]'],
    ['Сломанный самокат','Не работает тормоз, опасно','transport','scooters',43.6481,51.1593,'processing','[{"type":"image","url":"/seed/event1.jpg"}]'],
    ['Самокаты в море','Вандалы бросили в воду','transport','scooters',43.6467,51.1558,'sent','[{"type":"video","url":"/seed/conflict1.mp4"}]'],
    ['Задержка электрички','Опаздывает на 15 минут','transport','trains',43.6432,51.1694,'sent','[]'],
    ['Грязный вагон','Требуется уборка в поезде','transport','trains',43.6418,51.1671,'processing','[{"type":"image","url":"/seed/fire1.jpg"}]'],
    ['Не работает кондиционер','В вагоне очень жарко','transport','trains',43.6445,51.1659,'sent','[]'],
    ['Распродажа в супермаркете','Скидки 50% на все товары','events','promotion',43.6532,51.1687,'sent','[{"type":"image","url":"/seed/fire1.jpg"}]'],
    ['Акция в кофейне','Бесплатный кофе при покупке выпечки','events','promotion',43.6509,51.1634,'processing','[{"type":"image","url":"/seed/event1.jpg"}]'],
    ['Скидки на одежду','Распродажа зимней коллекции','events','promotion',43.6473,51.1602,'sent','[{"type":"video","url":"/seed/conflict1.mp4"}]'],
    ['Концерт в парке','Живая музыка, вход свободный','events','event',43.6518,51.1579,'sent','[{"type":"image","url":"/seed/event1.jpg"}]'],
    ['Выставка художников','Местные художники представляют работы','events','event',43.6491,51.1656,'processing','[{"type":"image","url":"/seed/fire1.jpg"}]'],
    ['Спортивный турнир','Футбольные соревнования среди школ','events','event',43.6459,51.1623,'sent','[{"type":"video","url":"/seed/conflict1.mp4"}]'],
    ['Фестиваль еды','Национальные блюда от лучших поваров','events','festival',43.6546,51.1591,'sent','[{"type":"image","url":"/seed/fire1.jpg"}]'],
    ['Музыкальный фестиваль','Трехдневный фестиваль у моря','events','festival',43.6395,51.1546,'processing','[{"type":"image","url":"/seed/event1.jpg"}]'],
    ['Фестиваль цветов','Выставка цветочных композиций','events','festival',43.6524,51.1617,'sent','[{"type":"video","url":"/seed/conflict1.mp4"}]']
  ];
  
  seed.forEach(r=>{
    db.run(
      'INSERT INTO markers (title,description,category,subcategory,latitude,longitude,status,media) VALUES (?,?,?,?,?,?,?,?)',
      r
    );
  });
  saveDb();
  console.log('Added', seed.length, 'seed markers');
}

app.listen(PORT, ()=>console.log(`Server running on ${PORT}`));
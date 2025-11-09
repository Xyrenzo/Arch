CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS markers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  latitude REAL,
  longitude REAL,
  status TEXT DEFAULT 'sent',
  reporter_id INTEGER,
  media TEXT,
  event_start TEXT,
  event_end TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(reporter_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS marker_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  marker_id INTEGER,
  prev_status TEXT,
  new_status TEXT,
  changed_by INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(marker_id) REFERENCES markers(id),
  FOREIGN KEY(changed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY,
  avatar_url TEXT,
  bio TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  hide_posts BOOLEAN DEFAULT FALSE,
  hide_following BOOLEAN DEFAULT FALSE,
  hide_followers BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS marker_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  marker_id INTEGER,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(marker_id) REFERENCES markers(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  UNIQUE(marker_id, user_id)
);

CREATE TABLE IF NOT EXISTS followers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id INTEGER,
  following_id INTEGER,
  status TEXT DEFAULT 'accepted',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(follower_id) REFERENCES users(id),
  FOREIGN KEY(following_id) REFERENCES users(id),
  UNIQUE(follower_id, following_id)
);
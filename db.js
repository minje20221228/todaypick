const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "today_pick.sqlite");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function secureFilePermissions(filePath) {
  try {
    if (fs.existsSync(filePath) && process.platform !== "win32") {
      fs.chmodSync(filePath, 0o600);
    }
  } catch (error) {
    console.warn("DB 파일 권한 설정을 확인해주세요:", error.message);
  }
}

const db = new Database(DB_PATH);
secureFilePermissions(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function hasColumn(table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((row) => row.name === column);
}

function safeUsernameFromEmail(email, id) {
  const base = String(email || `user${id}`)
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 16) || `user${id}`;
  return `${base}${id}`;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      is_blocked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_codes (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      region TEXT NOT NULL,
      category TEXT NOT NULL,
      place_name TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(place_id, user_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      reporter_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'dismissed')),
      created_at TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      username TEXT NOT NULL,
      ip TEXT NOT NULL,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_failed_at TEXT NOT NULL,
      PRIMARY KEY(username, ip)
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      username TEXT,
      user_id INTEGER,
      ip TEXT,
      user_agent TEXT,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_place ON reviews(place_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
  `);

  if (!hasColumn("users", "username")) db.exec("ALTER TABLE users ADD COLUMN username TEXT");
  if (!hasColumn("users", "nickname")) db.exec("ALTER TABLE users ADD COLUMN nickname TEXT");

  const users = db.prepare("SELECT id, name, email, username, nickname FROM users").all();
  const update = db.prepare("UPDATE users SET username = ?, nickname = ? WHERE id = ?");
  for (const user of users) {
    const username = user.username || safeUsernameFromEmail(user.email, user.id);
    const nickname = user.nickname || `${user.name}${user.id}`;
    update.run(username, nickname, user.id);
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);
  `);

  secureFilePermissions(DB_PATH);
  secureFilePermissions(`${DB_PATH}-wal`);
  secureFilePermissions(`${DB_PATH}-shm`);
}

async function seedAdmin() {
  const adminEmail = String(process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "Admin1234!");
  const adminName = String(process.env.ADMIN_NAME || "관리자").trim() || "관리자";
  const adminId = String(process.env.ADMIN_ID || "admin").trim().toLowerCase();
  const adminNickname = String(process.env.ADMIN_NICKNAME || "운영자").trim() || "운영자";

  const existing = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(adminId, adminEmail);
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin', username = ?, nickname = ?, email = ? WHERE id = ?")
      .run(adminId, adminNickname, adminEmail, existing.id);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  db.prepare(`
    INSERT INTO users (name, username, nickname, email, password_hash, role, is_blocked, created_at)
    VALUES (?, ?, ?, ?, ?, 'admin', 0, ?)
  `).run(adminName, adminId, adminNickname, adminEmail, passwordHash, new Date().toISOString());
}

function seedDemoPosts() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM posts").get().count;
  if (count > 0) return;

  let demo = db.prepare("SELECT id, nickname FROM users WHERE username = ?").get("demo");
  if (!demo) {
    const hash = bcrypt.hashSync("Demo1234!", 12);
    const result = db.prepare(`
      INSERT INTO users (name, username, nickname, email, password_hash, role, is_blocked, created_at)
      VALUES ('데모유저', 'demo', '데모여행자', 'demo@example.com', ?, 'user', 0, ?)
    `).run(hash, new Date().toISOString());
    demo = { id: result.lastInsertRowid, nickname: "데모여행자" };
  }

  const insert = db.prepare(`
    INSERT INTO posts (user_id, author_name, region, category, place_name, title, content, rating, is_deleted, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);

  const now = new Date().toISOString();
  [
    ["서울특별시", "카페", "성수 루프탑 카페", "분위기 좋아요", "저녁에 가면 사진 찍기 좋고 접근성도 괜찮았어요.", 5],
    ["부산광역시", "산책", "광안리 바다 산책", "밤바다 추천", "광안대교 야경 보면서 걷기 좋아요.", 5],
    ["제주특별자치도", "자연", "애월 해안도로", "노을 시간 추천", "카페와 바다를 같이 즐기기 좋았습니다.", 4]
  ].forEach((p) => insert.run(demo.id, demo.nickname, ...p, now));
}

module.exports = { db, migrate, seedAdmin, seedDemoPosts };

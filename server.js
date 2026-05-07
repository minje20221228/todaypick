require("dotenv").config();

const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const SQLiteStoreFactory = require("connect-sqlite3");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { db, migrate, seedAdmin, seedDemoPosts } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isHttps = process.env.USE_HTTPS === "true";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-change-this-secret";
const SQLiteStore = SQLiteStoreFactory(session);

const REGIONS = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
  "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도",
  "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도",
  "경상남도", "제주특별자치도"
];

const CATEGORIES = ["카페", "맛집", "전시", "산책", "자연", "역사/문화", "액티비티", "야경"];
const REPORT_REASONS = ["스팸/홍보", "부적절한 내용", "허위 정보", "욕설/비방", "기타"];

function clean(value) { return String(value || "").trim(); }
function email(value) { return clean(value).toLowerCase(); }
function username(value) { return clean(value).toLowerCase(); }

function validateUsername(value) {
  return /^[a-z0-9_]{4,16}$/.test(value);
}

function validateNickname(value) {
  return /^[가-힣a-zA-Z0-9_]{2,12}$/.test(value);
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function makeCsrfToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  return req.session.csrfToken;
}

function verifyCsrf(req, res, next) {
  if (req.get("x-csrf-token") !== req.session.csrfToken) {
    return res.status(403).json({ message: "보안 토큰이 유효하지 않습니다. 새로고침 후 다시 시도해주세요." });
  }
  next();
}

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    nickname: row.nickname,
    email: row.email,
    role: row.role,
    isBlocked: Boolean(row.is_blocked)
  };
}

function getSessionUser(req) {
  if (!req.session.user) return null;
  const row = db.prepare("SELECT id, name, username, nickname, email, role, is_blocked FROM users WHERE id = ?").get(req.session.user.id);
  req.session.user = toPublicUser(row);
  return req.session.user;
}

function requireLogin(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ message: "로그인이 필요합니다." });
  req.user = user;
  next();
}

function requireActiveUser(req, res, next) {
  if (req.user.isBlocked) return res.status(403).json({ message: "차단된 계정은 사용할 수 없습니다." });
  next();
}

function requireAdmin(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ message: "로그인이 필요합니다." });
  if (user.role !== "admin") return res.status(403).json({ message: "관리자 권한이 필요합니다." });
  req.user = user;
  next();
}

function validatePassword(password) {
  return password.length >= 8 && password.length <= 72 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: "요청이 너무 많습니다." } });
const writeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { message: "작성 요청이 너무 많습니다." } });

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: "25kb" }));
app.use(session({
  store: new SQLiteStore({ db: "sessions.sqlite", dir: path.join(__dirname, "data"), concurrentDB: true }),
  name: "today_pick_sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: isHttps, maxAge: 1000 * 60 * 60 * 4 }
}));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/csrf", (req, res) => res.json({ csrfToken: makeCsrfToken(req) }));
app.get("/api/auth/me", (req, res) => res.json({ user: getSessionUser(req) }));

app.get("/api/auth/check-duplicate", (req, res) => {
  const type = clean(req.query.type);
  const value = clean(req.query.value);
  const allowed = ["username", "nickname"];

  if (!allowed.includes(type)) {
    return res.status(400).json({ message: "확인할 항목이 올바르지 않습니다." });
  }

  let exists = false;

  if (type === "username") {
    exists = Boolean(db.prepare("SELECT id FROM users WHERE username = ?").get(username(value)));
  }

  if (type === "nickname") {
    exists = Boolean(db.prepare("SELECT id FROM users WHERE nickname = ?").get(value));
  }

  const messages = {
    username: exists ? "아이디 중복입니다." : "사용 가능한 아이디입니다.",
    nickname: exists ? "닉네임 중복입니다." : "사용 가능한 닉네임입니다."
  };

  res.json({ exists, message: messages[type] });
});

app.post("/api/auth/send-email-code", authLimiter, verifyCsrf, (req, res) => {
  const cleanEmail = email(req.body.email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ message: "올바른 이메일을 입력해주세요." });
  }

  const code = makeCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO email_codes (email, code, expires_at, verified, created_at)
    VALUES (?, ?, ?, 0, ?)
    ON CONFLICT(email) DO UPDATE SET
      code = excluded.code,
      expires_at = excluded.expires_at,
      verified = 0,
      created_at = excluded.created_at
  `).run(cleanEmail, code, expires, new Date().toISOString());

  console.log(`[개발용 이메일 인증코드] ${cleanEmail}: ${code}`);

  res.json({
    message: "인증코드를 발송했습니다.",
    devCode: code
  });
});

app.post("/api/auth/signup", authLimiter, verifyCsrf, async (req, res) => {
  const cleanUsername = username(req.body.username);
  const password = String(req.body.password || "");
  const cleanEmail = email(req.body.email);
  const nicknameValue = clean(req.body.nickname);
  const emailCode = clean(req.body.emailCode);

  if (!validateUsername(cleanUsername)) {
    return res.status(400).json({ message: "아이디는 영문 소문자, 숫자, 밑줄만 사용해서 4~16자로 입력해주세요." });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ message: "비밀번호는 영문+숫자 포함 8자 이상이어야 합니다." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ message: "올바른 이메일 형식이 아닙니다." });
  }

  const codeRow = db.prepare("SELECT * FROM email_codes WHERE email = ?").get(cleanEmail);
  if (!codeRow || codeRow.code !== emailCode || new Date(codeRow.expires_at) < new Date()) {
    return res.status(400).json({ message: "이메일 인증코드가 올바르지 않거나 만료되었습니다." });
  }

  if (!validateNickname(nicknameValue)) {
    return res.status(400).json({ message: "닉네임은 한글, 영문, 숫자, 밑줄만 사용해서 2~12자로 입력해주세요." });
  }

  if (db.prepare("SELECT id FROM users WHERE username = ?").get(cleanUsername)) {
    return res.status(409).json({ field: "username", message: "아이디 중복입니다." });
  }

  if (db.prepare("SELECT id FROM users WHERE nickname = ?").get(nicknameValue)) {
    return res.status(409).json({ field: "nickname", message: "닉네임 중복입니다." });
  }


  const hash = await bcrypt.hash(password, 12);
  let result;

  try {
    result = db.prepare(`
      INSERT INTO users (name, username, nickname, email, password_hash, role, is_blocked, created_at)
      VALUES (?, ?, ?, ?, ?, 'user', 0, ?)
    `).run(nicknameValue, cleanUsername, nicknameValue, cleanEmail, hash, new Date().toISOString());
  } catch (error) {
    if (String(error.message || "").includes("users.email")) {
      return res.status(409).json({ field: "email", message: "이미 가입된 이메일입니다." });
    }
    throw error;
  }

  db.prepare("DELETE FROM email_codes WHERE email = ?").run(cleanEmail);

  const row = db.prepare("SELECT id, name, username, nickname, email, role, is_blocked FROM users WHERE id = ?").get(result.lastInsertRowid);

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ message: "세션 생성 중 오류가 발생했습니다." });
    req.session.user = toPublicUser(row);
    makeCsrfToken(req);
    res.status(201).json({ user: req.session.user });
  });
});

app.post("/api/auth/login", authLimiter, verifyCsrf, async (req, res) => {
  const cleanUsername = username(req.body.username || req.body.email);
  const password = String(req.body.password || "");

  const row = db.prepare("SELECT id, name, username, nickname, email, password_hash, role, is_blocked FROM users WHERE username = ?").get(cleanUsername);
  if (!row) return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ message: "세션 생성 중 오류가 발생했습니다." });
    req.session.user = toPublicUser(row);
    makeCsrfToken(req);
    res.json({ user: req.session.user });
  });
});

app.post("/api/auth/logout", verifyCsrf, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "로그아웃 중 오류가 발생했습니다." });
    res.clearCookie("today_pick_sid");
    res.json({ message: "로그아웃되었습니다." });
  });
});

app.get("/api/posts", (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM reports r WHERE r.post_id = p.id) AS report_count
    FROM posts p
    WHERE p.is_deleted = 0
    ORDER BY datetime(p.created_at) DESC
    LIMIT 100
  `).all();

  res.json({ posts: rows.map((p) => ({
    id: p.id, userId: p.user_id, authorName: p.author_name, region: p.region, category: p.category,
    placeName: p.place_name, title: p.title, content: p.content, rating: p.rating,
    reportCount: p.report_count, createdAt: p.created_at
  })) });
});

app.post("/api/posts", writeLimiter, requireLogin, requireActiveUser, verifyCsrf, (req, res) => {
  const region = clean(req.body.region);
  const category = clean(req.body.category);
  const placeName = clean(req.body.placeName);
  const title = clean(req.body.title);
  const content = clean(req.body.content);
  const rating = Number(req.body.rating);

  if (!REGIONS.includes(region)) return res.status(400).json({ message: "지원하지 않는 지역입니다." });
  if (!CATEGORIES.includes(category)) return res.status(400).json({ message: "지원하지 않는 카테고리입니다." });
  if (placeName.length < 2 || placeName.length > 40) return res.status(400).json({ message: "장소명은 2~40자로 입력해주세요." });
  if (title.length < 2 || title.length > 60) return res.status(400).json({ message: "제목은 2~60자로 입력해주세요." });
  if (content.length < 10 || content.length > 500) return res.status(400).json({ message: "추천 내용은 10~500자로 입력해주세요." });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "평점은 1~5점으로 선택해주세요." });

  const result = db.prepare(`
    INSERT INTO posts (user_id, author_name, region, category, place_name, title, content, rating, is_deleted, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(req.user.id, req.user.nickname, region, category, placeName, title, content, rating, new Date().toISOString());

  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete("/api/posts/:id", requireLogin, verifyCsrf, (req, res) => {
  const postId = Number(req.params.id);
  const post = db.prepare("SELECT * FROM posts WHERE id = ? AND is_deleted = 0").get(postId);
  if (!post) return res.status(404).json({ message: "추천글을 찾을 수 없습니다." });
  if (req.user.role !== "admin" && post.user_id !== req.user.id) return res.status(403).json({ message: "삭제 권한이 없습니다." });
  db.prepare("UPDATE posts SET is_deleted = 1 WHERE id = ?").run(postId);
  res.json({ message: "삭제되었습니다." });
});

app.get("/api/reviews/summary", (req, res) => {
  const rows = db.prepare(`
    SELECT place_id, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count
    FROM reviews
    GROUP BY place_id
  `).all();

  const summary = {};
  rows.forEach((r) => {
    summary[r.place_id] = { avgRating: r.avg_rating, reviewCount: r.review_count };
  });
  res.json({ summary });
});

app.get("/api/places/:placeId/reviews", (req, res) => {
  const placeId = Number(req.params.placeId);
  const rows = db.prepare(`
    SELECT id, place_id, user_id, author_name, rating, content, created_at, updated_at
    FROM reviews
    WHERE place_id = ?
    ORDER BY datetime(updated_at) DESC
  `).all(placeId);

  res.json({ reviews: rows.map((r) => ({
    id: r.id, placeId: r.place_id, userId: r.user_id, authorName: r.author_name,
    rating: r.rating, content: r.content, createdAt: r.created_at, updatedAt: r.updated_at
  })) });
});

app.post("/api/places/:placeId/reviews", writeLimiter, requireLogin, requireActiveUser, verifyCsrf, (req, res) => {
  const placeId = Number(req.params.placeId);
  const rating = Number(req.body.rating);
  const content = clean(req.body.content);

  if (!Number.isInteger(placeId) || placeId < 1) return res.status(400).json({ message: "장소 정보가 올바르지 않습니다." });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "별점은 1~5점으로 선택해주세요." });
  if (content.length < 5 || content.length > 300) return res.status(400).json({ message: "리뷰는 5~300자로 입력해주세요." });

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO reviews (place_id, user_id, author_name, rating, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(place_id, user_id) DO UPDATE SET
      rating = excluded.rating,
      content = excluded.content,
      updated_at = excluded.updated_at
  `).run(placeId, req.user.id, req.user.nickname, rating, content, now, now);

  res.status(201).json({ message: "리뷰가 저장되었습니다." });
});

app.post("/api/posts/:id/reports", writeLimiter, requireLogin, requireActiveUser, verifyCsrf, (req, res) => {
  const postId = Number(req.params.id);
  const reason = clean(req.body.reason);
  const details = clean(req.body.details);
  const post = db.prepare("SELECT * FROM posts WHERE id = ? AND is_deleted = 0").get(postId);
  if (!post) return res.status(404).json({ message: "추천글을 찾을 수 없습니다." });
  if (post.user_id === req.user.id) return res.status(400).json({ message: "본인 글은 신고할 수 없습니다." });
  if (!REPORT_REASONS.includes(reason)) return res.status(400).json({ message: "신고 사유를 선택해주세요." });
  if (details.length > 300) return res.status(400).json({ message: "상세 내용은 300자 이내로 입력해주세요." });

  db.prepare(`
    INSERT INTO reports (post_id, reporter_id, reason, details, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(postId, req.user.id, reason, details, new Date().toISOString());

  res.status(201).json({ message: "신고가 접수되었습니다." });
});

app.get("/api/admin/summary", requireAdmin, (req, res) => {
  res.json({ summary: {
    users: db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
    blockedUsers: db.prepare("SELECT COUNT(*) AS count FROM users WHERE is_blocked = 1").get().count,
    posts: db.prepare("SELECT COUNT(*) AS count FROM posts WHERE is_deleted = 0").get().count,
    reviews: db.prepare("SELECT COUNT(*) AS count FROM reviews").get().count,
    pendingReports: db.prepare("SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'").get().count
  }});
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, username, nickname, email, role, is_blocked, created_at
    FROM users ORDER BY datetime(created_at) DESC LIMIT 200
  `).all();
  res.json({ users: rows.map((u) => ({ id: u.id, name: u.name, username: u.username, nickname: u.nickname, email: u.email, role: u.role, isBlocked: Boolean(u.is_blocked), createdAt: u.created_at })) });
});

app.patch("/api/admin/users/:id/block", requireAdmin, verifyCsrf, (req, res) => {
  const userId = Number(req.params.id);
  const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId);
  if (!target) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
  if (target.role === "admin") return res.status(400).json({ message: "관리자는 차단할 수 없습니다." });
  db.prepare("UPDATE users SET is_blocked = ? WHERE id = ?").run(req.body.blocked ? 1 : 0, userId);
  res.json({ message: "변경되었습니다." });
});

app.patch("/api/admin/account", requireAdmin, verifyCsrf, async (req, res) => {
  const newEmail = email(req.body.email);
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) return res.status(401).json({ message: "현재 비밀번호가 올바르지 않습니다." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return res.status(400).json({ message: "올바른 이메일을 입력해주세요." });

  if (newPassword) {
    if (!validatePassword(newPassword)) return res.status(400).json({ message: "새 비밀번호는 영문+숫자 포함 8자 이상이어야 합니다." });
    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare("UPDATE users SET email = ?, password_hash = ? WHERE id = ?").run(newEmail, hash, req.user.id);
  } else {
    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(newEmail, req.user.id);
  }

  const updated = db.prepare("SELECT id, name, username, nickname, email, role, is_blocked FROM users WHERE id = ?").get(req.user.id);
  req.session.user = toPublicUser(updated);
  res.json({ user: req.session.user });
});

app.get("/api/admin/reports", requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, p.title AS post_title, p.place_name, p.author_name, u.name AS reporter_name
    FROM reports r
    JOIN posts p ON p.id = r.post_id
    JOIN users u ON u.id = r.reporter_id
    ORDER BY datetime(r.created_at) DESC
    LIMIT 200
  `).all();
  res.json({ reports: rows.map((r) => ({
    id: r.id, postId: r.post_id, reason: r.reason, details: r.details, status: r.status,
    createdAt: r.created_at, postTitle: r.post_title, placeName: r.place_name,
    authorName: r.author_name, reporterName: r.reporter_name
  })) });
});

app.patch("/api/admin/reports/:id/status", requireAdmin, verifyCsrf, (req, res) => {
  const status = clean(req.body.status);
  if (!["pending", "reviewed", "dismissed"].includes(status)) return res.status(400).json({ message: "지원하지 않는 상태입니다." });
  db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, Number(req.params.id));
  res.json({ message: "변경되었습니다." });
});

app.delete("/api/admin/posts/:id", requireAdmin, verifyCsrf, (req, res) => {
  db.prepare("UPDATE posts SET is_deleted = 1 WHERE id = ?").run(Number(req.params.id));
  res.json({ message: "삭제되었습니다." });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function start() {
  migrate();
  await seedAdmin();
  seedDemoPosts();

  const keyPath = path.resolve(process.env.HTTPS_KEY_PATH || "./certs/localhost-key.pem");
  const certPath = path.resolve(process.env.HTTPS_CERT_PATH || "./certs/localhost-cert.pem");

  if (isHttps && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, app).listen(PORT, () => {
      console.log(`HTTPS 서버 실행: https://localhost:${PORT}`);
    });
  } else {
    http.createServer(app).listen(PORT, () => {
      console.log(`HTTP 서버 실행: http://localhost:${PORT}`);
    });
  }
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

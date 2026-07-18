import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// 数据库路径
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'schedule.db');

// 确保数据库目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(DB_PATH);

// 启用 WAL 模式提高性能
db.pragma('journal_mode = WAL');

// 密码哈希函数
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// 验证密码
function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const hashToVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashToVerify;
}

// 检查表是否存在
function tableExists(tableName: string): boolean {
  const result = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
  return !!result;
}

// 检查列是否存在
function columnExists(tableName: string, columnName: string): boolean {
  const result = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
  return result.some(col => col.name === columnName);
}

// 删除旧表（如果存在但 schema 不匹配）
if (tableExists('config') && !columnExists('config', 'schedule_strategy')) {
  console.log('⚠️  检测到旧版 config 表，正在重建...');
  db.exec('DROP TABLE IF EXISTS config');
}

if (tableExists('config') && !columnExists('config', 'no_rest_day_type')) {
  console.log('⚠️  检测到旧版 config 表，正在重建...');
  db.exec('DROP TABLE IF EXISTS config');
}

// 创建表
db.exec(`
  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login TEXT
  );

  -- 配置表
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    weekly_rest_days INTEGER NOT NULL DEFAULT 1,
    no_rest_days_of_week TEXT NOT NULL DEFAULT '[]',
    no_rest_dates TEXT NOT NULL DEFAULT '[]',
    employees TEXT NOT NULL DEFAULT '[]',
    schedule_strategy TEXT NOT NULL DEFAULT '{}',
    no_rest_day_type TEXT NOT NULL DEFAULT 'work',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 历史记录表
  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    results TEXT NOT NULL DEFAULT '[]',
    stats TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);
`);

// 初始化默认管理员（如果不存在）
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = hashPassword('admin123');
  db.prepare('INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)').run(
    'admin',
    hashedPassword,
    '管理员',
    'admin'
  );
  console.log('✅ 默认管理员账号已创建: admin / admin123');
}

// 初始化默认配置
const initConfig = db.prepare(`
  INSERT OR IGNORE INTO config (id, year, month, weekly_rest_days, no_rest_days_of_week, no_rest_dates, employees, schedule_strategy, no_rest_day_type)
  VALUES (1, ?, ?, 1, '[]', '[]', '[]', '{}', 'work')
`);

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
initConfig.run(currentYear, currentMonth);

export { db, hashPassword, verifyPassword };
export default db;

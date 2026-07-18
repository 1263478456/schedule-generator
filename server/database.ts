import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 数据库路径（支持环境变量配置）
const DB_PATH = process.env.DB_PATH || '/data/schedule.db';

// 确保数据库目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(DB_PATH);

// 启用 WAL 模式提高性能
db.pragma('journal_mode = WAL');

// 创建表
db.exec(`
  -- 配置表（只存储一份配置）
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    weekly_rest_days INTEGER NOT NULL DEFAULT 1,
    no_rest_days_of_week TEXT NOT NULL DEFAULT '[]',
    no_rest_dates TEXT NOT NULL DEFAULT '[]',
    employees TEXT NOT NULL DEFAULT '[]',
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

// 初始化默认配置（如果不存在）
const initConfig = db.prepare(`
  INSERT OR IGNORE INTO config (id, year, month, weekly_rest_days, no_rest_days_of_week, no_rest_dates, employees)
  VALUES (1, ?, ?, 1, '[0,6]', '[]', '[]')
`);

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
initConfig.run(currentYear, currentMonth);

export default db;

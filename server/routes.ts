import { Router } from 'express';
import db from './database.js';
import { authMiddleware } from './auth.js';

const router = Router();

// ==================== 配置 API ====================

// 获取配置（需要登录）
router.get('/config', authMiddleware, (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM config WHERE id = 1').get();
    
    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }
    
    // 解析 JSON 字段
    res.json({
      year: config.year,
      month: config.month,
      monthlyRestDays: config.monthly_rest_days || 4,
      noRestDaysOfWeek: JSON.parse(config.no_rest_days_of_week || '[]'),
      noRestDates: JSON.parse(config.no_rest_dates || '[]'),
      employees: JSON.parse(config.employees || '[]'),
      maxConcurrentRest: config.max_concurrent_rest || 2,
      randomness: JSON.parse(config.randomness || '{"enabled":true,"intensity":30}'),
      updatedAt: config.updated_at,
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
});

// 保存配置（需要登录）
router.put('/config', authMiddleware, (req, res) => {
  try {
    const { year, month, monthlyRestDays, noRestDaysOfWeek, noRestDates, employees, maxConcurrentRest, randomness } = req.body;
    
    const stmt = db.prepare(`
      UPDATE config SET
        year = ?,
        month = ?,
        monthly_rest_days = ?,
        no_rest_days_of_week = ?,
        no_rest_dates = ?,
        employees = ?,
        max_concurrent_rest = ?,
        randomness = ?,
        updated_at = datetime('now')
      WHERE id = 1
    `);
    
    stmt.run(
      year,
      month,
      monthlyRestDays || 4,
      JSON.stringify(noRestDaysOfWeek || []),
      JSON.stringify(noRestDates || []),
      JSON.stringify(employees || []),
      maxConcurrentRest || 2,
      JSON.stringify(randomness || { enabled: true, intensity: 30 })
    );
    
    res.json({ success: true, message: '配置已保存' });
  } catch (error) {
    console.error('保存配置失败:', error);
    res.status(500).json({ error: '保存配置失败' });
  }
});

// ==================== 历史记录 API ====================

// 获取历史记录列表（需要登录）
router.get('/history', authMiddleware, (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const records = db.prepare(`
      SELECT * FROM history 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    // 获取总数
    const { total } = db.prepare('SELECT COUNT(*) as total FROM history').get() as { total: number };
    
    // 解析 JSON 字段
    const parsedRecords = records.map((record: any) => ({
      id: record.id,
      name: record.name,
      config: JSON.parse(record.config),
      results: JSON.parse(record.results),
      stats: JSON.parse(record.stats),
      createdAt: record.created_at,
    }));
    
    res.json({
      records: parsedRecords,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ error: '获取历史记录失败' });
  }
});

// 获取单条历史记录（需要登录）
router.get('/history/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    const record = db.prepare('SELECT * FROM history WHERE id = ?').get(id);
    
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }
    
    res.json({
      id: record.id,
      name: record.name,
      config: JSON.parse(record.config),
      results: JSON.parse(record.results),
      stats: JSON.parse(record.stats),
      createdAt: record.created_at,
    });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ error: '获取历史记录失败' });
  }
});

// 保存历史记录（需要登录）
router.post('/history', authMiddleware, (req, res) => {
  try {
    const { id, name, config, results, stats } = req.body;
    
    // 生成 ID（如果未提供）
    const recordId = id || `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const stmt = db.prepare(`
      INSERT INTO history (id, name, config, results, stats)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      recordId,
      name,
      JSON.stringify(config),
      JSON.stringify(results || []),
      JSON.stringify(stats)
    );
    
    res.json({ success: true, id: recordId, message: '历史记录已保存' });
  } catch (error) {
    console.error('保存历史记录失败:', error);
    res.status(500).json({ error: '保存历史记录失败' });
  }
});

// 删除历史记录（需要登录）
router.delete('/history/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    const result = db.prepare('DELETE FROM history WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    
    res.json({ success: true, message: '历史记录已删除' });
  } catch (error) {
    console.error('删除历史记录失败:', error);
    res.status(500).json({ error: '删除历史记录失败' });
  }
});

// 清空所有历史记录（需要登录）
router.delete('/history', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM history').run();
    res.json({ success: true, message: '所有历史记录已清空' });
  } catch (error) {
    console.error('清空历史记录失败:', error);
    res.status(500).json({ error: '清空历史记录失败' });
  }
});

export default router;

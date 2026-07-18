import { Router, Request, Response } from 'express';
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db, hashPassword, verifyPassword } from './database.js';

const router = Router();

// JWT 密钥（生产环境应使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'schedule-generator-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// 生成 JWT Token
function generateToken(user: { id: number; username: string; role: string }) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// 认证中间件
export function authMiddleware(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// 注册
router.post('/register', (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度应为 3-20 个字符' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少 6 个字符' });
    
    }
    
    // 检查用户名是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 创建用户
    const hashedPassword = hashPassword(password);
    const result = db.prepare(
      'INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)'
    ).run(username, hashedPassword, displayName || username, 'user');
    
    const user = { id: result.lastInsertRowid as number, username, role: 'user' };
    const token = generateToken(user);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: displayName || username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    // 查找用户
    const user = db.prepare(
      'SELECT id, username, password, display_name, role FROM users WHERE username = ?'
    ).get(username) as any;
    
    console.log('登录尝试:', { username, userFound: !!user });
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 验证密码
    const passwordValid = verifyPassword(password, user.password);
    console.log('密码验证:', { passwordValid });
    
    if (!passwordValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 更新最后登录时间
    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
    
    // 生成 Token
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const user = db.prepare(
      'SELECT id, username, display_name, role, created_at, last_login FROM users WHERE id = ?'
    ).get(userId) as any;
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at,
      lastLogin: user.last_login,
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 更新个人信息
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { displayName } = req.body;
    
    if (displayName !== undefined) {
      db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName, userId);
    }
    
    res.json({ success: true, message: '个人信息更新成功' });
  } catch (error) {
    console.error('更新个人信息失败:', error);
    res.status(500).json({ error: '更新个人信息失败' });
  }
});

// 修改密码
router.put('/password', authMiddleware, (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请提供旧密码和新密码' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少 6 个字符' });
    }
    
    // 验证旧密码
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId) as any;
    if (!verifyPassword(oldPassword, user.password)) {
      return res.status(401).json({ error: '旧密码错误' });
    }
    
    // 更新密码
    const hashedPassword = hashPassword(newPassword);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);
    
    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// 获取所有用户（管理员）
router.get('/users', authMiddleware, (req, res) => {
  try {
    const currentUser = (req as any).user;
    
    // 只有管理员可以查看所有用户
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ error: '无权限' });
    }
    
    const users = db.prepare(
      'SELECT id, username, display_name, role, created_at, last_login FROM users ORDER BY created_at DESC'
    ).all();
    
    res.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

export default router;

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes.js';

// ES 模块的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API 路由
app.use('/api', apiRoutes);

// 静态文件服务（前端构建产物）
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA 路由支持（所有非 API 路由返回 index.html）
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器已启动: http://0.0.0.0:${PORT}`);
  console.log(`📊 API 地址: http://0.0.0.0:${PORT}/api`);
});

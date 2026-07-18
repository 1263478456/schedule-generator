# 智能排班表生成器

一个简单易用的员工排班表生成工具，支持自定义员工信息和休息规则，可导出为 A4 打印格式的 PDF 文件。

## ✨ 功能特性

- 📋 **员工管理**：添加、编辑、删除员工信息
- 📅 **排班规则**：
  - 自定义每周休息天数
  - 设置特定星期不排休（如周五、周六、周日）
  - 添加特殊日期不排休（如节假日）
- 📊 **实时预览**：排班结果实时显示
- 🖨️ **导出功能**：
  - PDF 文件（A4 打印格式）
  - HTML 文件（可在浏览器打开）
- 📱 **响应式设计**：支持桌面和移动端

## 🚀 快速开始

### 本地运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### Docker 部署

```bash
# 构建并启动容器
docker-compose up -d

# 或者手动构建
docker build -t schedule-generator .
docker run -d -p 3080:80 --name schedule-generator schedule-generator
```

访问 http://localhost:3080 即可使用。

## 📖 使用说明

### 1. 添加员工
- 在"员工管理"区域输入员工姓名
- 点击"添加"按钮或按回车键确认
- 支持编辑和删除员工

### 2. 配置排班规则
- 选择排班月份
- 设置每周休息天数（滑块调整）
- 选择不排休的星期几（点击选择）
- 添加不排休的具体日期

### 3. 导出排班表
- 选择导出格式（PDF 或 HTML）
- 点击导出按钮
- PDF 文件会自动下载，可直接打印

## 🖨️ 打印建议

- PDF 文件已优化为 A4 尺寸 (210×297mm)
- 打印时选择"实际大小"以获得最佳效果
- 建议横向打印以获得更大的表格显示

## 🛠️ 技术栈

- **前端框架**：React 19 + TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **PDF 生成**：html2canvas + jsPDF

## 📁 项目结构

```
schedule-generator/
├── public/              # 静态资源
├── src/
│   ├── components/      # React 组件
│   │   ├── EmployeeManager.tsx    # 员工管理
│   │   ├── ExportPanel.tsx        # 导出面板
│   │   ├── ScheduleConfig.tsx     # 排班配置
│   │   └── ScheduleTable.tsx      # 排班表格
│   ├── utils/           # 工具函数
│   │   ├── exportUtils.ts         # 导出工具
│   │   └── scheduleGenerator.ts   # 排班算法
│   ├── App.tsx          # 主应用组件
│   ├── index.css        # 全局样式
│   └── main.tsx         # 入口文件
├── Dockerfile           # Docker 构建文件
├── docker-compose.yml   # Docker Compose 配置
├── nginx.conf           # Nginx 配置
└── package.json         # 项目配置
```

## 📄 License

MIT License

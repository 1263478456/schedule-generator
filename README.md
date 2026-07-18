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
- 💾 **数据持久化**：配置自动保存，刷新不丢失
- 📜 **历史记录**：保存历史排班表，支持加载和管理
- 📱 **响应式设计**：支持桌面和移动端

## 🚀 快速部署

### 方式一：Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/1263478456/schedule-generator.git
cd schedule-generator

# 2. 启动服务
docker-compose up -d

# 3. 访问应用
# http://localhost:3080
```

### 方式二：Docker 命令行

```bash
# 拉取镜像
docker pull 1263478456/schedule-generator:latest

# 运行容器
docker run -d \
  --name schedule-generator \
  --restart unless-stopped \
  -p 3080:80 \
  -e TZ=Asia/Shanghai \
  1263478456/schedule-generator:latest

# 访问应用
# http://localhost:3080
```

### 方式三：本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问应用
# http://localhost:5173
```

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

### 3. 保存历史
- 点击"保存到历史记录"按钮
- 历史记录支持加载、删除、清空

### 4. 导出排班表
- 选择导出格式（PDF 或 HTML）
- 点击导出按钮
- PDF 文件会自动下载，可直接打印

## 🖨️ 打印建议

- PDF 文件已优化为 A4 尺寸 (210×297mm)
- 打印时选择"实际大小"以获得最佳效果
- 建议横向打印以获得更大的表格显示

## 🔧 配置说明

### 修改端口

编辑 `docker-compose.yml`，修改端口映射：

```yaml
ports:
  - "你的端口:80"
```

### 修改时区

编辑 `docker-compose.yml`，修改环境变量：

```yaml
environment:
  - TZ=Asia/Shanghai  # 改为你的时区
```

### 常用时区

- 中国：`Asia/Shanghai`
- 美国东部：`America/New_York`
- 美国西部：`America/Los_Angeles`
- 日本：`Asia/Tokyo`
- 英国：`Europe/London`

## 📁 项目结构

```
schedule-generator/
├── public/                    # 静态资源
├── src/
│   ├── components/           # React 组件
│   │   ├── ConfirmDialog.tsx     # 确认对话框
│   │   ├── EmployeeManager.tsx   # 员工管理
│   │   ├── ErrorBoundary.tsx     # 错误边界
│   │   ├── ExportPanel.tsx       # 导出面板
│   │   ├── HistoryPanel.tsx      # 历史记录
│   │   ├── ScheduleConfig.tsx    # 排班配置
│   │   ├── ScheduleTable.tsx     # 排班表格
│   │   └── Toast.tsx             # 通知提示
│   ├── utils/                # 工具函数
│   │   ├── exportUtils.ts        # 导出工具
│   │   ├── scheduleGenerator.ts  # 排班算法
│   │   ├── storage.ts            # 本地存储
│   │   └── validation.ts         # 输入验证
│   ├── App.tsx               # 主应用组件
│   ├── index.css             # 全局样式
│   └── main.tsx              # 入口文件
├── docker-compose.yml        # Docker Compose 配置
├── Dockerfile                # Docker 构建文件
├── nginx.conf                # Nginx 配置
└── package.json              # 项目配置
```

## 🛠️ 技术栈

- **前端框架**：React 19 + TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **PDF 生成**：html2canvas + jsPDF
- **部署**：Docker + Nginx

## 📦 发布新版本

```bash
# 1. 修改版本号
echo "1.2.0" > version.txt

# 2. 提交更改
git add version.txt
git commit -m "bump-version-1.2.0"
git push origin master

# 3. 创建标签（触发自动构建）
git tag -a v1.2.0 -m "v1.2.0"
git push origin v1.2.0
```

## 🔗 相关链接

- **GitHub 仓库**：https://github.com/1263478456/schedule-generator
- **Docker Hub**：https://hub.docker.com/r/1263478456/schedule-generator
- **Actions 状态**：https://github.com/1263478456/schedule-generator/actions

## 📄 License

MIT License

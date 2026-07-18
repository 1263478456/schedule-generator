# 多阶段构建：构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装构建依赖（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++

# 安装所有依赖（包括 devDependencies 用于构建）
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# 多阶段构建：运行阶段
FROM node:20-alpine

# 安装运行时依赖
RUN apk add --no-cache curl

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 复制构建好的 node_modules（包含编译好的原生模块）
COPY --from=builder /app/node_modules ./node_modules

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 复制服务器代码
COPY --from=builder /app/server ./server

# 复制 version.txt
COPY --from=builder /app/version.txt ./

# 创建数据目录
RUN mkdir -p /data

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/schedule.db

# 启动服务器
CMD ["node", "--import", "tsx", "server/index.ts"]

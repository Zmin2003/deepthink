# DeepThink

基于多专家协作的 AI 深度思考系统，采用 Tree-of-Thought 方法实现复杂问题的多角度分析。

## 特性

- **多专家协作** - 多个 AI 专家从不同角度并行分析问题
- **智能规划** - 根据问题复杂度自动选择合适数量的专家
- **搜索增强** - 可选集成 Exa/Tavily 搜索，为专家提供实时上下文
- **配置驱动** - 所有参数通过管理后台配置，无需修改代码或环境变量
- **实时流式** - WebSocket 实时推送思考过程，每个专家完成立即展示
- **OpenAI 兼容** - 提供 `/v1/chat/completions` 兼容端点

## 架构

```
用户提问 → Planner(规划专家) → Search(搜索上下文) → Experts(多专家并行分析) → Synthesizer(综合回答)
```

**处理流程：**
1. **Planner** - 分析问题复杂度，规划需要哪些专家（2-7个）
2. **Search** - 可选搜索相关信息作为上下文
3. **Experts** - 多个专家并行执行，从不同角度分析
4. **Synthesizer** - 综合所有专家观点，生成最终回答

## 技术栈

**后端**
- Node.js + Fastify
- TypeScript
- SQLite (sql.js)
- OpenAI SDK

**前端**
- Vue 3 + TypeScript
- Vite
- Pinia
- Tailwind CSS

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 2. 启动服务

```bash
# 后端 (端口 3001)
cd backend
npm run dev

# 前端 (端口 5173)
cd frontend
npm run dev
```

### 3. 配置系统

1. 打开管理后台：http://localhost:5173/admin
2. 使用默认账号登录：`admin` / `admin123`
3. 在 **LLM 配置** 中填入：
   - API Key（必填）
   - Base URL（可选，默认 OpenAI 官方地址）
   - 模型名称（如 gpt-4、gpt-3.5-turbo）
4. 点击 **Test LLM** 测试连接
5. 可选：配置搜索服务（Exa 或 Tavily）

### 4. 开始使用

访问 http://localhost:5173 开始提问

## 环境变量

后端 `.env` 文件仅需配置服务器参数，**无需配置 API Key**（通过管理后台配置）：

```bash
# 服务器
PORT=3001
HOST=0.0.0.0

# 数据库
DATABASE_PATH=./data/sessions.db

# CORS
CORS_ORIGINS=*

# 日志
LOG_LEVEL=info
```

## 管理后台配置

所有核心配置都在管理后台完成：

| 配置项 | 说明 |
|--------|------|
| **LLM 配置** | API Key、Base URL、默认模型 |
| **系统参数** | 最大轮数、质量阈值、思考深度 |
| **搜索配置** | 启用/禁用搜索、选择 Exa 或 Tavily、配置 API Key |
| **用户管理** | 添加/删除用户、修改密码 |

## API 端点

### 聊天接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/chat/completions` | OpenAI 兼容接口（支持流式） |
| POST | `/deepthink/invoke` | 原生 API |
| WS | `/ws/chat` | WebSocket 实时通信 |

### 管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| GET | `/api/admin/config` | 获取所有配置 |
| PUT | `/api/admin/config/llm` | 更新 LLM 配置 |
| PUT | `/api/admin/config/system` | 更新系统参数 |
| GET/PUT | `/api/admin/config/search` | 搜索配置 |
| POST | `/api/admin/test-llm` | 测试 LLM 连接 |

## 项目结构

```
deepthink-new/
├── backend/
│   └── src/
│       ├── services/
│       │   ├── deepthink/           # DeepThink 引擎
│       │   │   └── DeepThinkEngine.ts
│       │   ├── llm/                 # LLM 提供者
│       │   └── search/              # 搜索服务
│       ├── routes/                  # API 路由
│       ├── config/                  # 配置管理
│       └── middleware/              # 认证中间件
└── frontend/
    └── src/
        ├── views/                   # 页面组件
        │   ├── ChatView.vue         # 聊天界面
        │   └── AdminView.vue        # 管理后台
        ├── stores/                  # Pinia 状态
        └── services/                # API 客户端
```

## 安全提示

- 首次使用请立即修改默认管理员密码
- 生产环境请设置 `JWT_SECRET` 环境变量
- 生产环境请限制 `CORS_ORIGINS`

## License

[MIT](LICENSE)

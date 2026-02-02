# DeepThink

基于多专家协作的 AI 深度思考系统，采用 Tree-of-Thought 方法实现复杂问题的多角度分析。

## 特性

- **多专家协作** - 多个 AI 专家从不同角度分析问题
- **批判性思考** - 自动识别矛盾、缺失视角和薄弱论点
- **迭代优化** - 支持多轮迭代，逐步完善答案
- **配置驱动** - 所有参数通过管理后台配置，无需修改代码
- **实时流式** - WebSocket 实时推送思考过程

## 架构

```
用户提问 → Planner(规划) → Experts(多专家执行) → Critic(批评) → Reviewer(评审) → Synthesizer(综合)
                ↑                                                        │
                └────────────── 不满意则迭代 ─────────────────────────────┘
```

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

### 2. 配置环境

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 编辑 .env 文件，填入你的 API 配置
```

### 3. 启动服务

```bash
# 后端 (端口 3001)
cd backend
npm run dev

# 前端 (端口 5173)
cd frontend
npm run dev
```

### 4. 访问管理后台

打开 http://localhost:5173/admin

默认账号：`admin` / `admin123`（请及时修改密码）

## 配置说明

所有配置都可以在管理后台修改：

| 配置项 | 说明 |
|--------|------|
| LLM API | API Key、Base URL、模型名称 |
| 系统参数 | 最大迭代轮数、质量阈值、思考深度 |
| 提示词 | 各节点的提示词模板 |
| 用户管理 | 添加/删除用户、修改密码 |

## API 端点

### 管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/admin/login` | 管理员登录 |
| GET | `/admin/config` | 获取配置 |
| PUT | `/admin/config/llm` | 更新 LLM 配置 |
| PUT | `/admin/config/system` | 更新系统参数 |

### 聊天接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/deepthink/invoke` | 调用深度思考 |
| WS | `/ws` | WebSocket 实时通信 |

## 项目结构

```
deepthink-new/
├── backend/
│   └── src/
│       ├── services/deepthink/     # DeepThink 引擎
│       │   ├── nodes/              # 5个处理节点
│       │   └── StateMachine.ts     # 状态机
│       ├── prompts/                # 提示词模板
│       ├── routes/                 # API 路由
│       └── config/                 # 配置
└── frontend/
    └── src/
        ├── views/                  # 页面
        ├── components/             # 组件
        └── stores/                 # Pinia 状态
```

## License

[MIT](LICENSE)

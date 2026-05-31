# Electron AI Agent — 项目开发提示词

> 适用于 Cursor、Trae、Windsurf 等 AI 编程工具。将本文件放置在项目根目录，命名为 `.cursorrules`，或在工具的 Rules / System Prompt 中引用。

---

## 项目概述

使用 **Electron** + **Pi SDK**（`@earendil-works/pi-coding-agent`）构建一个本地桌面 AI Agent 应用。前端对话界面采用 **@ant-design/x** + **Ant Design**，Agent 核心在 Electron 主进程中运行，通过 IPC 与渲染进程通信。

最终功能：
- **新建任务**：用户描述目标，Pi Agent 自动推理并使用工具执行
- **技能管理**：查看、启用/禁用 Pi Skills（SKILL.md 标准），支持导入自定义技能
- **历史任务**：持久化所有会话，支持查看完整执行步骤

**开发按下方四个阶段顺序推进，未到达的阶段不要提前实现。**

---

## 技术栈

### 前端（Electron Renderer）
- **UmiJS 4**（`umi`，非 Max 版）：React 应用脚手架，提供路由与构建能力
- Ant Design 6（`antd`）：通用 UI 组件、布局、表单
- @ant-design/x：AI 对话专用组件（`Bubble`、`Sender`、`Conversations`、`ThoughtChain`）
- Valtio：状态管理
- 路由：使用 Umi 配置式路由（在 `.umirc.ts` 的 `routes` 中集中管理）

### 主进程（Electron Main）
- Node.js（Electron 内置）
- @earendil-works/pi-coding-agent：Pi Agent SDK，直接运行于主进程
- better-sqlite3：SQLite 持久化（阶段三引入）
- electron-store：持久化应用设置

### Agent 核心
Pi SDK 原生 TypeScript。关键 API：
- `createAgentSession()` 创建 Agent 会话
- `session.prompt()` 发送任务，异步等待完成
- `session.subscribe()` 订阅流式事件
- `session.abort()` 取消任务
- `DefaultResourceLoader` 加载技能（SKILL.md）

---

## 当前工程基线

以下内容基于当前仓库实际状态整理。开发时默认**在现有脚手架基础上改造**，不要重复初始化项目。

- 当前已存在一个 **Umi 4 Simple App** 基础工程，包含 `src/layouts/index.tsx`、`src/pages/index.tsx`、`src/pages/docs.tsx`
- 当前已存在 `electron/` 目录，但 `electron/main.js` 与 `electron/preload.js` 仍为空文件，只是占位
- 当前 `package.json` 已安装 `umi`、`antd`、`electron`、`typescript`，但尚未接入 `@ant-design/x`、`valtio`、Pi SDK 等 Agent 相关依赖
- 当前包管理器为 **Yarn 4**，`.umirc.ts` 中 `npmClient` 也应保持与之匹配；除非明确要迁移，否则不要把文档和脚本改写成 pnpm 方案
- 当前 `package.json` 的 `"main": "main/main.js"` 与仓库里的 `electron/main.js` 不一致，阶段一需要一并修正
- 当前路由仍是模板默认的 `/` 与 `/docs`，页面内容也还是 Umi 示例页；阶段一应整体替换为 AI Agent 应用结构

---

## 完整目录结构（供全局参考，分阶段逐步建立）

```
project-root/
├── electron/
│   ├── index.ts                  # Electron 主进程入口
│   ├── preload.ts                # contextBridge            ← 阶段一起逐步扩展
│   ├── ipc/
│   │   ├── agent.ts              # Agent 创建与事件转发      ← 阶段一
│   │   ├── task.ts               # 任务 CRUD IPC            ← 阶段三
│   │   └── skill.ts              # 技能相关 IPC             ← 阶段四
│   ├── db/
│   │   ├── index.ts              # SQLite 初始化            ← 阶段三
│   │   └── schema.sql                                       ← 阶段三
│   └── pi/
│       ├── session.ts            # Pi AgentSession 封装      ← 阶段一
│       └── skill-loader.ts       # 技能目录扫描              ← 阶段四
│
├── src/
│   ├── layouts/
│   │   └── index.tsx             # 全局布局（Sidebar + Outlet）← 阶段二
│   ├── pages/
│   │   ├── chat/
│   │   │   └── index.tsx         # 对话主页面 /chat          ← 阶段一
│   │   ├── new-task/
│   │   │   └── index.tsx         # 新建任务 /new-task        ← 阶段二
│   │   ├── history/
│   │   │   └── index.tsx         # 历史任务 /history         ← 阶段三
│   │   └── skills/
│   │       └── index.tsx         # 技能管理 /skills          ← 阶段四
│   ├── components/
│   │   ├── ChatPanel.tsx         # @ant-design/x 对话面板   ← 阶段一
│   │   ├── ThoughtChainView.tsx  # Agent 思考链             ← 阶段二
│   │   ├── Sidebar.tsx           # 侧边栏导航               ← 阶段二
│   │   └── SkillCard.tsx         # 技能卡片                 ← 阶段四
│   ├── store/
│   │   ├── chatStore.ts                                     ← 阶段一
│   │   ├── taskStore.ts                                     ← 阶段三
│   │   └── skillStore.ts                                    ← 阶段四
│   ├── hooks/
│   │   └── useAgentSession.ts                               ← 阶段一
│   └── typings.d.ts              # window.electronAPI 类型声明
│
├── skills/                       # 内置 Pi Skills           ← 阶段四
│   └── web-search/
│       └── SKILL.md
│
├── .umirc.ts                     # Umi 配置（路由、antd、代理等）
├── package.json
└── .env
```

---

## 阶段一：项目脚手架 + 核心对话能力

**目标**：能跑起来，用户输入消息，Agent 流式回复，主进程与渲染进程 IPC 通路打通。

### 任务清单

- [ ] 以**现有 Umi Simple App 脚手架**为基础继续开发，不重新执行 `create-umi`
- [ ] 清理模板默认页面、默认资源与示例导航，将现有 `/`、`/docs` 路由替换为项目目标路由
- [ ] 保留现有 `electron/` 目录，但将空的 `electron/main.js`、`electron/preload.js` 迁移为 TypeScript 版本，并修正 `package.json` 的 `main` 入口与实际构建产物一致
- [ ] 安装核心依赖：
  ```bash
  # 当前仓库使用 Yarn 4，默认继续沿用
  yarn add @earendil-works/pi-coding-agent @earendil-works/pi-ai
  yarn add electron-store
  yarn add @ant-design/x valtio
  yarn add -D electron-builder concurrently wait-on cross-env

  # 阶段一已要求把 Electron 主进程迁移为 TypeScript，因此这里需要同步补充 electron/tsconfig.json
  ```
- [ ] 配置 `.umirc.ts`：保留现有配置文件，在其基础上设置 `publicPath: './'`（Electron `file://` 协议需要）、`hash: true`、`history: { type: 'hash' }`，并集中维护项目路由；UI 组件直接使用 `antd` 包，不依赖额外 Umi antd 插件
- [ ] 配置 `package.json`：修正 `main` 指向 Electron 主进程构建产物，补充 `scripts`，并为 `electron-builder` 明确声明打包文件范围：
  ```json
  {
    "main": "electron/dist/index.js",
    "scripts": {
      "dev:renderer": "umi dev",
      "dev:main": "tsc -p electron/tsconfig.json -w",
      "dev:electron": "wait-on http://localhost:8000 && cross-env NODE_ENV=development electron ./electron/dist/index.js",
      "dev": "concurrently -k \"yarn dev:renderer\" \"yarn dev:main\" \"yarn dev:electron\"",
      "build:renderer": "umi build",
      "build:main": "tsc -p electron/tsconfig.json",
      "build": "yarn build:renderer && yarn build:main && electron-builder"
    },
    "build": {
      "files": [
        "dist/**/*",
        "electron/dist/**/*",
        "package.json"
      ]
    }
  }
  ```
- [ ] 实现 `electron/pi/session.ts`：封装 `createAgentSession`，支持流式事件回调
- [ ] 实现 `electron/ipc/agent.ts`：处理 `agent:prompt` 和 `agent:cancel` 两个 IPC 事件
- [ ] 实现 `electron/preload.ts`：通过 `contextBridge` 暴露 `prompt`、`cancel`、`onAgentEvent`
- [ ] 实现 `src/pages/chat/index.tsx`：最简单的对话页，使用 `Bubble.List` + `Sender`
- [ ] 实现 `src/hooks/useAgentSession.ts`：封装 IPC 订阅逻辑，暴露 `sendMessage`、`cancelMessage`、`messages` 状态

### 阶段一：`.umirc.ts` 参考配置

```ts
import { defineConfig } from 'umi';

export default defineConfig({
  // Electron 加载本地 file:// 文件，必须使用相对路径与 hash 路由
  publicPath: './',
  hash: true,
  history: { type: 'hash' },

  routes: [
    {
      path: '/',
      component: '@/layouts/index',
      routes: [
        { path: '/', redirect: '/chat' },
        { path: '/chat', component: '@/pages/chat' },
        { path: '/new-task', component: '@/pages/new-task' },
        { path: '/history', component: '@/pages/history' },
        { path: '/skills', component: '@/pages/skills' },
      ],
    },
  ],

  // dev server，供 Electron 主进程通过 loadURL('http://localhost:8000') 加载
  npmClient: 'yarn',
});
```

> 提示：当前文档不预设任何 Umi 插件配置；如后续确实需要额外插件能力，请先按当前 Umi 版本文档确认可用配置，再决定是否引入。

### 阶段一：Electron 主进程加载 Umi 页面

```ts
// electron/index.ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    // Umi 默认 dev server 端口 8000
    await win.loadURL('http://localhost:8000');
    win.webContents.openDevTools();
  } else {
    // 当前入口位于 electron/dist/index.js，umi build 输出位于项目根 dist/
    await win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
```

### 阶段一：Pi SDK 核心用法

```typescript
// electron/pi/session.ts
import Store from "electron-store";
import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  ModelRegistry,
  SessionManager,
  type AgentSession,
  type AgentSessionEvent,
} from "@earendil-works/pi-coding-agent";

const store = new Store<{ apiKey?: string }>();

interface PiSessionOptions {
  onEvent: (event: AgentSessionEvent) => void;
}

export async function createPiSession(opts: PiSessionOptions): Promise<AgentSession> {
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  // 从 electron-store 读取用户配置的 API Key，运行时注入
  const apiKey = store.get("apiKey") as string | undefined;
  if (apiKey) {
    authStorage.setRuntimeApiKey("anthropic", apiKey);
  }

  const loader = new DefaultResourceLoader({ cwd: process.cwd() });
  await loader.reload();

  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    authStorage,
    modelRegistry,
    resourceLoader: loader,
    tools: ["read", "bash", "edit", "write", "grep", "find", "ls"],
  });

  session.subscribe(opts.onEvent);
  return session;
}
```

```typescript
// electron/ipc/agent.ts
import { ipcMain, BrowserWindow } from "electron";
import { createPiSession } from "../pi/session";

// taskId -> AgentSession，管理并发会话
const activeSessions = new Map();

ipcMain.handle("agent:prompt", async (event, { sessionId, text }) => {
  const win = BrowserWindow.fromWebContents(event.sender)!;

  // 若已有会话则复用，否则新建
  let session = activeSessions.get(sessionId);
  if (!session) {
    session = await createPiSession({
      onEvent: (agentEvent) => {
        win.webContents.send(`agent:event:${sessionId}`, agentEvent);
      },
    });
    activeSessions.set(sessionId, session);
  }

  // 异步执行，不阻塞 IPC 返回
  session.prompt(text).catch((err: Error) => {
    win.webContents.send(`agent:event:${sessionId}`, {
      type: "error",
      message: err.message,
    });
  });

  return { ok: true };
});

ipcMain.handle("agent:cancel", async (_event, sessionId: string) => {
  const session = activeSessions.get(sessionId);
  if (session) await session.abort();
});
```

```typescript
// electron/preload.ts（阶段一，最小集）
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  prompt: (sessionId: string, text: string) =>
    ipcRenderer.invoke("agent:prompt", { sessionId, text }),

  cancel: (sessionId: string) =>
    ipcRenderer.invoke("agent:cancel", sessionId),

  onAgentEvent: (sessionId: string, callback: (event: unknown) => void) => {
    const channel = `agent:event:${sessionId}`;
    const handler = (_e: unknown, data: unknown) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
```

### 阶段一：Pi 事件与 @ant-design/x 的映射

| Pi 事件类型 | 字段 | @ant-design/x 行为 |
|---|---|---|
| `message_update` | `assistantMessageEvent.type === "text_delta"` | `Bubble` 追加 `delta` 文字（streaming 效果）|
| `tool_execution_start` | `toolName` | 暂时 console.log，阶段二接入 ThoughtChain |
| `tool_execution_end` | `isError` | 同上 |
| `agent_end` | — | `Sender` 恢复可用，停止 loading |
| `error`（自定义） | `message` | `message.error()` 提示 |

### 阶段一验收标准

- `yarn dev` 启动后窗口正常打开
- 输入框可发送消息，Bubble 中流式显示 Agent 回复
- 发送中 Sender 显示 loading，Agent 结束后恢复正常

---

## 阶段二：完善对话体验 + 思考链展示

**目标**：展示 Agent 工具调用过程，完善布局，支持多会话切换。

### 任务清单

- [ ] 实现 `src/components/ThoughtChainView.tsx`：用 `ThoughtChain` 组件展示工具调用步骤
- [ ] 完善 `src/pages/chat/index.tsx`：左栏对话 + 右侧可折叠思考链面板
- [ ] 实现 `src/components/Sidebar.tsx`：侧边栏，当前只有「对话」入口，预留「历史」「技能」位置（通过 Umi 的 `useNavigate` / `<NavLink>` 跳转）
- [ ] 实现 `src/layouts/index.tsx`：Sidebar + `<Outlet />` 全局布局
- [ ] 完善 `src/pages/new-task/index.tsx`：任务标题 + 描述输入，点击「开始」调用 `useNavigate('/chat')` 进入对话页
- [ ] 完善 `src/store/chatStore.ts`：管理消息列表和思考链步骤状态

### 阶段二：ThoughtChain 接入

```tsx
// src/components/ThoughtChainView.tsx
import { ThoughtChain } from "@ant-design/x";
import type { ThoughtChainItem } from "@ant-design/x";

interface Props {
  steps: ThoughtChainItem[];
}

export function ThoughtChainView({ steps }: Props) {
  return <ThoughtChain items={steps} />;
}

// 在 useAgentSession.ts 中，将 Pi 事件转为 ThoughtChainItem：
//
// tool_execution_start  → { key: toolCallId, title: toolName, status: "pending" }
// tool_execution_end    → 更新对应 key 的 status 为 "success" | "error"
//                          content 填入 tool 返回的文本摘要
```

### 阶段二验收标准

- 工具调用时右侧思考链实时出现，工具完成后状态更新为成功/失败
- 侧边栏结构完整，路由跳转正常
- 新建任务页可填写标题和描述，跳转后进入对话

---

## 阶段三：历史任务持久化

**目标**：将任务和执行步骤写入 SQLite，历史页面可查看和回放。

### 任务清单

- [ ] 安装 `better-sqlite3`，初始化 SQLite 数据库
- [ ] 建表，实现 `electron/db/index.ts`
- [ ] 实现 `electron/ipc/task.ts`：提供 `db:get-tasks`、`db:get-task-detail`
- [ ] 扩展 `electron/preload.ts`：新增 `getTasks`、`getTaskDetail`
- [ ] 在 `agent.ts` 的事件回调中写入 `task_steps`
- [ ] 实现 `src/pages/history/index.tsx`：左侧任务列表，右侧步骤详情
- [ ] 实现 `src/store/taskStore.ts`

### 阶段三：数据库 Schema

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  -- status: pending | running | completed | failed | cancelled
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  result      TEXT,
  error       TEXT,
  session_id  TEXT
);

CREATE TABLE IF NOT EXISTS task_steps (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES tasks(id),
  step_index  INTEGER NOT NULL,
  event_type  TEXT NOT NULL,
  -- event_type: text_delta | tool_start | tool_end | agent_end
  content     TEXT NOT NULL,   -- JSON 字符串
  created_at  INTEGER NOT NULL
);
```

### 阶段三：历史页面规范（`pages/history/index.tsx`）

- 左侧：`Conversations`（来自 `@ant-design/x`）展示任务列表，支持按状态 `Tabs` 筛选（全部 / 运行中 / 已完成 / 失败）
- 右侧：选中任务详情
  - `Descriptions` 展示标题、描述、创建时间
  - `Badge` 展示状态
  - `ThoughtChain` 回放完整执行步骤（从 SQLite 读取 task_steps 并还原为 ThoughtChainItem[]）

### 阶段三验收标准

- 每次对话任务在 SQLite 中有对应记录
- 历史页面列表正常加载，点击任务可查看完整思考链

---

## 阶段四：技能管理

**目标**：扫描 SKILL.md 技能，支持启用/禁用，支持从文件夹导入自定义技能。

### 任务清单

- [ ] 安装 `gray-matter`（解析 SKILL.md frontmatter）
- [ ] 实现 `electron/pi/skill-loader.ts`：扫描指定目录，读取 SKILL.md
- [ ] 实现 `electron/ipc/skill.ts`：提供 `skill:get-all`、`skill:toggle`、`skill:import`
- [ ] 扩展 `electron/preload.ts`：新增技能相关接口
- [ ] 在 `agent.ts` 中，新建 Pi Session 时根据已启用的技能路径配置 `DefaultResourceLoader`
- [ ] 创建 `skills/` 目录，编写至少一个内置技能（如 `web-search`）
- [ ] 实现 `src/pages/skills/index.tsx`：技能卡片网格
- [ ] 实现 `src/store/skillStore.ts`

### 阶段四：技能扫描实现

```typescript
// electron/pi/skill-loader.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface SkillMeta {
  id: string;
  name: string;
  description: string;
  path: string;     // SKILL.md 所在目录的绝对路径
  isBuiltin: boolean;
}

export function scanSkills(dirs: string[]): SkillMeta[] {
  const skills: SkillMeta[] = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillMdPath = path.join(dir, entry.name, "SKILL.md");
      if (!fs.existsSync(skillMdPath)) continue;

      const { data } = matter(fs.readFileSync(skillMdPath, "utf-8"));
      if (!data.name || !data.description) continue; // description 必须存在

      skills.push({
        id: `${entry.name}__${data.name}`,
        name: data.name,
        description: data.description,
        path: path.join(dir, entry.name),
        isBuiltin: dir.includes("skills") && !dir.includes("userData"),
      });
    }
  }

  return skills;
}
```

### 阶段四：内置技能编写规范

项目内置技能放在 `skills/` 目录，遵循 [Agent Skills 标准](https://agentskills.io/specification)：

```markdown
---
name: web-search
description: 使用 Brave Search API 搜索网页内容，获取实时信息和文档。当需要查询网络信息、查找资料时使用。
---

# Web Search

## 设置

```bash
cd /path/to/web-search && npm install
```

## 使用

```bash
node search.js "搜索关键词"
```
```

注意事项：
- `name`：1-64 字符，仅小写字母、数字、连字符
- `description`：必须存在，最多 1024 字符，写清使用场景（决定 Agent 是否主动加载）
- Pi 系统提示只注入 name + description，Agent 按需读取完整 SKILL.md

### 阶段四：技能管理页规范（`pages/skills/index.tsx`）

- `Row + Col` 卡片网格，每个技能一张 `Card`
- 卡片内容：技能名、描述、`Switch` 启用开关
- 内置技能：可禁用，不可删除
- 用户导入技能：可删除，删除前显示确认
- 顶部「+ 导入技能」按钮：`dialog.showOpenDialog` 选择文件夹，扫描其中的 SKILL.md，导入前展示安全警告

### 阶段四验收标准

- 技能列表正常加载，开关切换后重启会话生效
- 导入自定义技能成功后出现在列表中
- Agent 执行任务时，已启用的技能出现在 Pi 系统提示中

---

## 全局代码规范

- TypeScript 严格模式（`strict: true`）
- Pi `AgentSession` 只在主进程中存在，渲染进程只通过 IPC 订阅事件
- `session.abort()` 用于取消任务，配合 `activeSessions` Map 管理生命周期
- 关闭窗口前调用 `session.dispose()` 清理资源
- Pi 事件通过 `ipcRenderer.on` 订阅，组件卸载时必须取消订阅
- `@ant-design/x` 的 `Bubble` 使用 `typing` prop 实现流式效果
- **Umi 使用规范**（普通 Umi，非 Max）：
  - 路由跳转使用 `import { history, useNavigate, NavLink } from 'umi'`，不直接从 `react-router-dom` 导入
  - 路径别名统一使用 `@/`（指向 `src/`）
  - 页面组件一律放在 `src/pages/<name>/index.tsx`，使用配置式路由集中管理
  - 直接使用 `antd` React 组件库，不依赖额外 Umi antd 插件；不使用 `request`、`dva`、`initialState` 等 Max 特性
  - 全局状态统一用 Valtio，不引入 dva model
- 每阶段完成后做一次 git commit，commit message 格式：`feat(阶段N): 描述`

---

## 全局注意事项

1. **Pi SDK 运行环境**：Pi SDK 依赖 Node.js API，只能在 Electron **主进程**中运行，不可在渲染进程引入
2. **API Key 配置**：使用 `authStorage.setRuntimeApiKey()` 注入，不依赖环境变量，后续在设置页实现 UI 配置入口
3. **会话持久化**：阶段一使用 `SessionManager.inMemory()`；如需跨启动恢复会话，阶段三改为 `SessionManager.create(sessionsDir)`
4. **技能安全**：Pi Skills 可执行任意 bash 命令，用户导入第三方技能时必须显示安全警告弹窗
5. **流式事件隔离**：多任务并发时，渲染进程按 `sessionId` 隔离事件监听，避免串台
6. **Umi 与 Electron 集成要点**：
   - 生产环境必须 `publicPath: './'` + `history: { type: 'hash' }`，否则 `file://` 加载下资源路径会 404
   - Umi 默认 dev server 为 `http://localhost:8000`，主进程 `loadURL` 与 `wait-on` 需保持一致
   - 复用项目根的 `typings.d.ts`，或确认自定义声明文件已被 TS 配置包含；需声明 `window.electronAPI` 类型，避免渲染进程 TS 报错
   - `umi build` 输出目录为 `dist/`，需加入 `electron-builder` 的 `files` 配置

---

## 环境配置（.env，不提交 Git）

Umi 会自动读取项目根的 `.env`；需要在渲染进程访问的变量请以 `UMI_APP_` 开头。

注意：
- 当前仓库 `.gitignore` 只忽略了 `.env.local`，阶段一如果新增 `.env`，请先把 `.env` 加入 `.gitignore`
- API Key 不通过 `.env` 注入；按上文约定，运行时从 `electron-store` 读取，再调用 `authStorage.setRuntimeApiKey()` 设置

```env
# 渲染进程使用（需 UMI_APP_ 前缀，避免放入敏感信息）
UMI_APP_NAME=AI Agent
```

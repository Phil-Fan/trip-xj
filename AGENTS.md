# AGENTS.md — trip（新疆自驾路线可视化）

## 1. 项目定位

- **名称**：trip / Xinjiang Self-Drive Route Visualization
- **类型**：地图优先的旅行路线可视化 Web 应用
- **用途**：按日展示自驾路线折线，侧边栏 / 时间轴 / 地图同步；照片墙（拍立得拼贴风）挂载在路线日期上

## 2. 技术栈规范

| 层 | 规范 | 当前基准 |
|----|------|----------|
| 包管理 | **pnpm**（可有 bun.lock 辅助，安装以 pnpm 为准） | `pnpm-lock.yaml` |
| 框架 | Next.js **App Router** + **静态导出** | `next@16.2.x`，`output: "export"`，**`distDir: "dist"`** |
| UI 库 | React **19** + TypeScript **strict** | `react@19.2.x` |
| 样式 | **Tailwind CSS v4** | `@tailwindcss/postcss` |
| 组件 | **shadcn/ui** style = **`base-nova`** + `@base-ui/react` | 与 food 同系 |
| 状态 | **Zustand 5**；局部订阅 **`useShallow`** | `lib/store/` |
| 地图 | **mapcn** registry（`components.json` → `@mapcn`）+ 高德 loader | `@amap/amap-jsapi-loader` |
| 路径别名 | `@/*` → `./*` | |
| 质量 | ESLint 9 + `eslint-config-next` | `pnpm lint` |
| 媒体 | 照片 + **`photo-manifest.json`** 数据驱动 | `public/photos/` |

**硬性约定**

- 全局行程状态进 Zustand，避免 props 钻多层同步地图/侧栏/时间轴。
- 路线数据预加载；折线 memo；勿因 UI 状态重建地图实例。
- 地图组件优先 mapcn 生态与现有 `map-view` / `map-shell`，勿无故换成 Leaflet 全盘重写。
- shadcn 保持 **base-nova**，与 lyrics 的 radix-nova 区分。

## 3. 目录结构

```text
.
├── app/                 # 页面与全局样式
├── components/          # 地图、侧栏、时间轴、照片卡片等
├── lib/                 # 路线数据、工具
├── public/photos/       # 照片 + photo-manifest.json
├── scripts/             # EXIF / 路线抓取等辅助脚本
├── wrangler.toml        # 部署相关（若使用）
└── package.json
```

## 4. 性能规则

- 路线数据在构建/导入时预加载，避免运行时反复请求。
- 折线用 `React.memo`；避免每帧传入新的 object/array 引用。
- 侧栏/时间轴状态变化时不要重建地图实例。
- Zustand 局部订阅使用 `useShallow`。

## 5. 照片工作流

1. 文件放入 `public/photos/`，命名 `DX-N.jpeg`（如 `D5-3.jpeg` = 第 5 天第 3 张）。
2. 在地图选中日期后右键取坐标，写入 `public/photos/photo-manifest.json`。
3. 刷新或重建后可见。详见 `README.md`。

## 6. 常用命令

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

## 7. Conventional Commits（必须）

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```text
<type>(<scope>): <short-summary>

[optional body]

[optional footer(s)]
```

| Type | 用途 |
|------|------|
| `feat` | 新功能或用户可见行为 |
| `fix` | 缺陷修复 |
| `docs` | 仅文档 |
| `style` | 纯格式 |
| `refactor` | 重构 |
| `perf` | 性能 |
| `test` | 测试 |
| `chore` | 构建、工具、依赖、维护 |
| `ci` | CI |

**推荐 scope**：`map`、`timeline`、`sidebar`、`photo`、`route`、`store`、`ui`、`config`、`deps`

**示例**：

```text
feat(photo): support day-based manifest entries
fix(map): prevent polyline re-render on sidebar toggle
perf(store): select day state with useShallow
```

## 8. Agent 原则

- 改地图状态同步逻辑时先读 Zustand store 与现有订阅方式。
- 最小改动；提交前 `pnpm lint`，涉及渲染/构建时 `pnpm build`。

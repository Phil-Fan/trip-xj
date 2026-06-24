# Xinjiang Self-Drive Route Visualization

## Getting Started

First, install dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 添加照片

照片通过 `public/photos/photo-manifest.json` 统一管理，不再需要修改代码。

### 命名规则

照片文件统一放在 `public/photos/`，命名格式为：

```
DX-N.jpeg
```

- `X`：日期编号，例如 `2` 表示 D2
- `N`：当天照片的序号，从 1 开始连续编号

例如：`D5-3.jpeg` 表示第 5 天的第 3 张照片。

### 操作步骤

1. 把照片文件放入 `public/photos/`，例如 `D5-6.jpeg`。
2. 在地图上选中对应日期（点击路线、时间轴或侧边栏）。
3. 在想要放置照片的位置 **右键点击** 地图。
4. 剪贴板会自动复制如下格式的坐标条目：如果已选中日期，`D?` 会自动替换为当天编号，`N` 会自动取当前最大序号 + 1；未选中日期时复制 `D?-N` 占位符。
   ```json
     "D5-6": [
       84.9023,
       44.4269
     ],
   ```
5. 打开 `public/photos/photo-manifest.json`，把复制的内容粘贴进去，按序号排列。
6. 重新运行 `pnpm dev` 或 `pnpm build` 即可看到新照片。

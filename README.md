# YouTube 同步看 (`yt-sync`)

一款专为异地双人 / 小群共同观影设计的 Chrome Manifest V3 浏览器扩展与 Cloudflare Durable Objects 同步服务端：双方各自直接加载视频平台原生高清流（零转码、零推流、原画质无损），插件仅通过轻量 WebSocket 实时同步播放、暂停、拖拽、倍速与切集控制信令。

---

## ⚠️ 平台支持现状

| 平台 | 状态 | 说明 |
| :--- | :---: | :--- |
| **YouTube**（桌面端 `www.youtube.com` / 移动端 `m.youtube.com`） | **✅ 完整可用** | 完整支持播放控制、SPA 切集、广告避让、搜索选片提醒、后台听音及移动端弹窗解锁 |
| **哔哩哔哩（B站）** | **⏸️ 暂不可用** | **手机端 B 站网页会反复提示跳转手机 App，移动端网页播放体验较差**，因此当前暂不把 B 站作为可用平台提供支持；代码中保留的 `bilibili.js` 仅作多站点适配器结构参考 |

---

## ✨ 核心功能

- **原画质对等同步与延迟补偿**
  - 实时同步播放、暂停、拖拽进度（200ms 防抖）、倍速变化与同站点切集；
  - 结合 `HEARTBEAT` 往返时延测算并补偿双跳网络延迟（$d_{\text{source}} + d_{\text{target}}$）；
  - 每 5 秒随心跳附带三档漂移校准（偏差 `< 0.4s` 忽略、`0.4s ~ 2.0s` 以 `±5%` 倍速微调追齐、`> 2.0s` 直接跳转对齐）；
  - 消费即释放的本地操作锁（Echo Guard + 400ms TTL），防止双端操作反弹死循环。
- **广播房间 + 四合一心跳活跃机制**
  - 取消严苛的 2 人槽位与强制踢人，支持 2 人及小群多设备协同（软上限 16 连接）；
  - 5 秒四合一 `HEARTBEAT` 同时完成测延迟、刷新活跃状态、上报基准快照与捎带下发 `drift` 微调；
  - 同设备凭 `clientId` 自动顶替旧连接；超过 20 秒无心跳自动降为非活跃跳过广播（不踢人、不打断别人），10 分钟无流量自动垃圾回收。
- **顺应后台听音与手机切后台保护**
  - 切去其他标签页或锁屏时不再强行暂停视频，后台播放声音及通知栏拖动进度依然可正常同步；
  - 若在网页隐藏状态（`hidden`）下触发暂停，前端直接拦截外发 `CONTROL(pause)`（避免操作系统冻结发送缓冲区并在解锁时把电脑暴力拉回）；
  - 切回前台第 0 毫秒先锁住本地外发并拉取同伴最新进度：差距 `≤ 3s` 无感解锁恢复；差距 `> 3s` 弹出居中双铭牌动态计时二选一卡片（**跟随对方最新秒数** / **将大家拉回离开前秒数**），弹窗期间冻结决策不被带跑。
- **无感自动续连（标签页生命周期绑定）**
  - 结合 `window.sessionStorage` 与 `chrome.storage.local`（6 小时 TTL）以及 BFcache `pagehide` / `pageshow` 恢复；手机黑屏、断网或系统回收页面重载后自动认领同步标签页并重连，无需重新打开 Popup；仅在主动点断开或关掉标签页时清理会话。
- **实用观影辅助能力**
  - **纯 Popup「先看模式」**：在弹窗内随时切出同步独立快进看，退出时自动对齐同步成员（支持双人各自先看状态机）；
  - **内置快捷键与倍速插件冲突提醒**：同步中支持 `A`（`-0.1x`）、`D`（`+0.1x`）、`S`（`1.0x`）快捷键调速并右上角提示；若倍速在 600ms 内被 Global Speed 等第三方插件强行改回，自动拦截回传并弹出警告提示（15 秒冷却防刷屏）；
  - **非侵入式搜索选片提醒**：一方在 YouTube 搜索页选片时，另一方右上角浮现可点击胶囊「对方正在搜『关键词』 [一起挑片]」；
  - **YouTube 广告避让 & 移动端解锁**：自动识别 `.ad-showing` 广告并暂挂同步；移动端拦截自动播放时展示一键点击解锁遮罩。
- **三层极简深色 Popup UI**
  - 顶部状态与活跃人数 + 分级延迟徽章（`<80ms` / `80~180ms` / `>180ms`），独立配对码框（默认 `YT-8899`，点击全选、随机生成、一键复制），桌面/手机触屏均直观无需悬停猜按钮；任意网页支持一键切回同步标签页或在空白页先 `/peek` 房间并自动新开视频页直达。

---

## 📁 目录结构

```text
.
├── extension/                    # Chrome MV3 扩展源码
│   ├── manifest.json             # 扩展清单与域名权限
│   ├── background/
│   │   └── service-worker.js     # 会话持久化、标签页管理与 /peek 探测
│   ├── content/
│   │   ├── config.js             # 服务端地址与同步定时器配置
│   │   ├── main.js               # 内容脚本总控、切后台恢复、无感重连
│   │   ├── adapters/
│   │   │   ├── youtube.js        # YouTube 播放、SPA 路由、广告与搜索识别
│   │   │   └── bilibili.js       # 哔哩哔哩适配器参考（当前暂不可用）
│   │   ├── sync/engine.js        # 播控防抖、Echo Guard、三档漂移与倍速处理
│   │   ├── transport/ws-client.js# WebSocket 四合一心跳、看门狗、2s 探活
│   │   └── ui/overlay.js         # Shadow DOM 浮层（Toast、胶囊、动态恢复卡）
│   ├── popup/                    # 浏览器弹窗 UI（HTML / CSS / JS）
│   └── icons/                    # 扩展图标（16 / 48 / 128 + SVG）
├── server/                       # Cloudflare Workers + Durable Objects 服务端
│   ├── wrangler.toml             # Wrangler 配置与 SyncRoom DO 绑定
│   ├── src/index.js              # Durable Object 房间信令与广播核心逻辑
│   └── test_live.mjs             # 10 项线上 WebSocket / HTTP 集成测试
├── DESIGN.md                     # 架构与交互设计说明文档
└── LICENSE                       # MIT License
```

---

## 🚀 自部署与安装教程

本项目采用 **Cloudflare Workers + Durable Objects（SQLite 免费额度可用）** 作为信令服务端，个人或好友间自部署免费且低延迟。

### 1. 部署你自己的 Cloudflare 后端

需要本机已安装 [Node.js](https://nodejs.org/)（建议 v20+）：

```bash
cd server
npx wrangler login
npx wrangler deploy
```

部署成功后，终端会输出你的专属 Worker 域名，例如：
`https://yt-sync.<你的子域名>.workers.dev`

*(可选)* 运行线上全链路集成测试验证服务端工作正常：

```bash
YT_SYNC_HOST="yt-sync.<你的子域名>.workers.dev" node server/test_live.mjs
```

### 2. 配置扩展服务端地址

将以下 **3 个文件** 中的占位域名 `yt-sync.your-subdomain.workers.dev` 替换为你自己部署的 Worker 域名：

1. `extension/manifest.json`（`host_permissions`）
2. `extension/content/config.js`（`SERVER_HTTP` 与 `SERVER_WS`）
3. `extension/background/service-worker.js`（`SERVER_HTTP`）

### 3. 安装到浏览器

- **电脑端 Chrome / Edge**：
  1. 打开 `chrome://extensions/`（或 `edge://extensions/`），开启右上角「**开发者模式**」；
  2. 点击「**加载已解压的扩展程序**」，选择本项目的 `extension/` 文件夹。
- **手机端支持扩展的 Chromium 浏览器（如 Kiwi / Edge / 狐猴浏览器）**：
  1. 将 `extension/` **目录内的文件直接压缩**为 `yt-sync-extension.zip`（确保解压根目录直接是 `manifest.json`，不要多套一层外层文件夹）；
  2. 在手机浏览器的扩展管理页面选择「导入 `.zip` / `.crx` 安装」即可。

---

## 📖 使用方法

1. 双方打开任意支持网页或先开好同一部 YouTube 视频；
2. 点击浏览器扩展图标，约定同一个配对码（默认 `YT-8899`，可随机或自定义，不同配对码互相隔离），双方各自点击「**开始同步**」；
3. 若双方打开的视频不同，后进入的一方可在弹窗中选择「跟着走」或「拉进来」；
4. 开始看剧后即可各自直接享用原生画质与全流程自动同步；若使用自带 `A / D / S` 快捷键调速，建议先在视频页面关闭 Global Speed 等第三方倍速插件以免倍速冲突。

---

## 📄 开源协议

基于 [MIT License](LICENSE) 开源。

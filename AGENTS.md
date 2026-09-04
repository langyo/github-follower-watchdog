# AGENTS.md — GitHub Follower Watchdog Repository Rules for AI Agents

> 本文件以 langyo/wowsp 的 AGENTS.md 为基础适配而来（后者又改编自 Celestia
> 工作区规则），只保留适用于本仓库（langyo/github-follower-watchdog）的规则，
> 并记录了针对性调整（见 §10）。所有在本仓库工作的 AI agent / subagent
> **必须**遵守本文件。工作区级文件中的真实凭据与内网信息**永远不会**被
> 复制进本仓库（红线见 §7）。

---

## 1. Commit Message Format

```
<gitmoji> <Capitalized English summary ending with period.>
```

- 必须以一个 gitmoji 开头。白名单 = gitmoji.dev 完整规范集 + 组织增补
  （🔗 sync/copilot、🔄 sync/refresh、📜 license、🛡️ shield）。常用：
  ✨ 🐛 🔧 ♻️ 🔥 📝 🎨 ✅ 🚀 🌐 ⬆️ 🎉 📦。
  **权威实现是 `scripts/commit_msg_lint.py`**（CI 用它校验，本地可跑
  `just lint-msg`）；白名单以该脚本为准。
- 摘要为英文、首字母大写、以 `.` 结尾；**禁止 CJK 字符**。
- **禁止 Conventional Commits 前缀**（`feat:` / `fix:` 等）——emoji 本身就是类型标记。
- **禁止任何冒号前缀句式**（`Topic phrase: details`），即使是
  `🔧 Fix compliance: nonce handshake` 这种首字母大写形式也不行；正确写法是
  `🔧 Fix nonce handshake and embed path.`。CI linter 规则 7 会拒绝冒号前缀。
  详细背景写进 commit BODY（空行 + bullet），绝不写进摘要行。
- 禁止以裸版本号或填充短语开头（`v1.2.3` / `Bump version` / `Update to`）。
- **禁止 merge commit subject**（`Merge branch ...` / `Merge pull request ...`）：
  本仓只使用 squash merge。
- 豁免：`Revert "..."`（git revert 产物）豁免 gitmoji 要求；
  dependabot / github-actions 等机器人的 commit subject 豁免（按作者过滤，见 workflow）。
- **PR 标题遵循完全相同的规则**（squash 后它就是 commit subject）：
  `<gitmoji> <一句话英文描述.>`，无冒号前缀；机器人 PR（dependabot）豁免。
- CI 数据提交固定为 `🔄 Sync follower snapshot.`（🔄 为组织增补的 sync/refresh）。

## 2. CHANGELOG Policy（沿用 wowsp 2026-08-18 工作区指令，强制）

- **任何情况下不在仓库里维护 CHANGELOG / 修订历史文件。** 变更历史有两个
  权威载体：`data/history.jsonl`（关注者变动的追加式记录）与 git log
  （`git log -- data/` 即巡检审计线；squash commit + PR 描述构成代码变更史）。
- Release notes 写在 **git tag + GitHub Releases** 页面（按 release 撰写），
  绝不落在被跟踪的文件里。
- 仓库里不存在 CHANGELOG 文件，不要新建；PR 模板 / workflow 里若再出现
  changelog 引用，随触及它的 PR 一并移除。

## 3. PR Workflow

每个阶段的工作必须遵循以下模式：

1. **从 master 切出 feature 分支**（`feat/<name>` / `fix/<name>`）。
   有并行任务时用独立 `git worktree`，避免多个 agent 同时改主 checkout。
2. **3 轮验证循环**：对每个变更——
   - 第 1 轮：分析 → 改进 → 验证（用 subagent 做验证）
   - 第 2 轮：再分析 → 改进 → 验证
   - 第 3 轮：最终分析 → 打磨 → 验证
   - **任何一轮失败，从零重新计数。**
3. 以 gitmoji 格式 **commit**。
4. **push** 分支。
5. 用 `gh pr create` **创建 PR**（标题遵循 §1）。
6. **squash merge**（满足 §5 门槛可自主合并）：subject 变为
   `<gitmoji> Summary. (#PRID)`。
7. 合并后**删除** feature 分支。

### Subagent 使用

- 所有非平凡任务**必须使用 subagent**（general / explore 类型），避免上下文污染。
- 给 subagent 的任务描述必须完整：精确文件路径、先看既有代码模式、验证标准、
  commit 消息格式。
- 独立子任务并行发起；串行任务等待结果再继续。
- 每个 subagent 返回前必须验证自己的工作；重要工作由另一个 subagent 交叉验证。

### 验证门禁

提交前按改动范围选择：`pnpm build`（site 改动，含 tsc --noEmit）、
`python -m py_compile scripts/*.py`（watchdog 改动，另需一次真实
`just watch` 干跑）、`just lint-msg`（commit 标题）必须通过。

## 4. Branch Naming & Git Push Rules

- `master` — 生产分支。**只接受 squash merge 的 PR 与 CI 规范自动提交**
  （`🔄 Sync follower snapshot.`，作者 github-actions[bot]），禁止人工直推；
  紧急修复走 `fix/<name>` 分支 + PR。
- `feat/<name>` — 新功能；`fix/<name>` — 缺陷修复；`chore/<name>` — 维护；
  `refactor/<name>` — 无行为变化的重构。

### Git Push 硬规则

- **禁止裸 `git push --force`**（无显式人工授权）。无例外。
- feature 分支上 rebase/amend 恢复一律优先 `git push --force-with-lease`。
- `--force-with-lease` 被拒（远端跟踪 ref 过期）时**立即停止，绝不回退到
  `--force`**：先 fetch，用 `git log origin/<branch>..HEAD` 和
  `git log HEAD..origin/<branch>` 审查双方提交，确认无未知提交后再问用户。
- **master 上任何形式的 force push 绝对禁止**——master 只经 squash merge 与
  CI 数据提交前进。
- 拿不准时不要 force push：开新分支、重新提交、或问用户。
- 本条适用于所有 agent、subagent 和交互会话，无例外。

## 5. Merge & Release Rules

- **满足以下全部条件即可自主合并 PR**（无需逐 PR 人工确认）：
  1. **消息合规**：squash subject 为 `<gitmoji> <一句英文.>`，无冒号前缀；
     PR 标题同规则。
  2. **检查门槛**：必要检查通过后才可合并。**代码级失败**（tsc / vite build /
     py_compile / lint-msg）必须修复，绝不带病合并；**环境性失败**（runner
     配额、GitHub API 抖动、Pages 部署延迟等）在 PR 里记录并经本地验证
     （`pnpm build` / `just watch`）通过后可豁免。
  3. **PR 节约**：不要为每个琐碎变更单独开 PR 立即合并——PR 号是有限资源。
     一个 PR 应打包一批可合并的功能；只有紧急 hotfix 才允许小 PR。
- **`data/` 是 CI 专属写入区**：`data/current.json` 与 `data/history.jsonl`
  只能由 `.github/workflows/watch.yml` 里的 `scripts/watchdog.py` 产出。
  任何 PR 不得手改、格式化、重排或"修复"这两个文件；发现脏数据应修
  watchdog 的写入逻辑，而不是修文件本身。
- **只在被要求或已批准的工作流步骤里创建 PR**；未经许可不得自发开 PR。

## 6. Build & Test

- Site（Vue 3 · TSX · SCSS，wowsp website 同款架构）：`pnpm -C site build`
  （= tsc --noEmit + vite build）、`pnpm -C site dev`、`pnpm -C site preview`。
  **禁止引入 `.vue` SFC——全程 `.tsx` + `.scss`**（用户约束，2026-09-04）。
- Watchdog（纯 stdlib Python 3）：`python -m py_compile scripts/watchdog.py`；
  行为验证用 `just watch [login]`（写 `data/`，跑完 `git checkout -- data/`
  还原，避免把本地数据带进 PR）。
- Lint：`just lint-msg`（commit 标题，AGENTS.md §1）。
- 新增 site UI 字符串必须同步补全 `site/src/messages/` 下全部 8 个语言包
  （en, zh-Hans, zh-Hant, ja, ko, fr, es, ru），缺 key 会回退英文但视为
  未完成。

## 7. 敏感信息红线（强制，违反视为事故）

1. **禁止把任何真实密码 / 密钥 / token / 内网 IP 写进 git 树**（任何分支、
   任何文件，包括注释、示例、默认值、测试数据、README、docs）。
2. 代码里需要凭据时：用环境变量 / 不入库的配置文件，或占位符
   （`<your-token>` / `CHANGE_ME`）；示例 IP 一律用 RFC 5737 文档地址
   （192.0.2.x / 198.51.100.x / 203.0.113.x）。
   本仓的 `GITHUB_TOKEN` 只从 CI 注入（`secrets.GITHUB_TOKEN`），
   本地可选注入环境变量，绝不落盘。
3. 确有必要写真实凭据的极少数情况：**先问用户**，并评估仓库可见性
   （公共仓 ≠ 可写敏感值；历史泄漏不可撤销）。
4. **提交前自查**：涉及配置 / 部署 / 示例数据的改动，grep 一遍
   `password|secret|token|api_key` 确认无真实值。
5. 泄漏处置：立即删除 → 评估泄漏面（tag / 分支 / 下游引用）→ 报告用户，
   由用户决定是否历史重写（涉及 master force push 需显式授权）→
   **无论是否重写，凭据视为已公开，必须轮换**。

## 8. CI 使用策略

1. **不要过度依赖 CI 状态**：本地验证（`pnpm build` / `py_compile` /
   `just watch`）+ commit/PR 标题 lint 通过即可合并；环境性失败记录到 PR
   即可豁免（§5.2）。
2. **CI 是参考不是门禁**：合并前看一眼有没有**代码级失败**；有则修，全是
   环境性就直接合并。**不要长时间盯 CI**——排队或挂起超过 ~15 分钟按
   环境性处理。
3. **取消过时任务**：同 PR 反复 push 触发的旧 run 可取消
   （`gh run cancel <id>`）释放配额；commit-msg-lint 带 concurrency 自动去重。
   **watch.yml 的 concurrency 故意不取消进行中的 run**——commit + Pages
   部署这一对操作不能被拦腰截断。
4. CI 结构（`.github/workflows/`）：
   - `watch.yml` — 每小时 cron + 手动 + master push：watchdog → 有变化则
     提交 `data/` → 构建站点 → 部署 Pages。无变化的小时全程 ~20s，有变化
     也在一分钟量级。GitHub 会在仓库 60 天无活动后停用定时任务——数据提交
     本身即是活动。
   - `commit-msg-lint.yml` — PR 标题 + PR 内全部 commit subject
     （用 `scripts/commit_msg_lint.py`，机器人作者豁免）。

## 9. 大文件下载纪律（通用化，强制）

> 源自工作区 2026-08-13 流量事故教训；本仓主要涉及 GitHub API 分页拉取。

1. 对外抓取必须有**总量上限**（watchdog 的 `MAX_PAGES = 100`，即单次运行
   最多 10,000 关注者），禁止无界循环。
2. 失败重试必须带**次数上限**（`RETRY_DELAYS = (1, 3)`，共 3 次尝试），
   **禁止无上限重试循环**。
3. 任何新增的批量拉取 / 下载类脚本沿用同样模式，先报量再动手。

## 10. 与 wowsp AGENTS.md 的差异记录

以下 wowsp 规则**不适用**于本仓库，或经用户确认调整：

- Rust / Tauri / webui / cargo-deny / 版本一致性检查等章节全部移除——本仓
  是 stdlib Python + Vite/Vue(TSX) 两件套，无 Rust 工具链，无多包 workspace。
- wowsp 的 `just lint` / `just test unit` 等门禁替换为 §6 的轻量门禁
  （`pnpm build` / `py_compile` / `just watch` / `just lint-msg`）。
- **data/ 写入主权**（§5）为本仓新增规则：记录文件只由 CI 产出，
  wowsp 无对应概念。
- 本仓无 release 构建（无 release.yml / site.yml 拆分）：`watch.yml` 一个
  workflow 同时承担数据提交与 Pages 部署，这是"CI 只跑一分钟"约束的直接
  产物（wowsp 的站点部署是独立 workflow）。
- 语言包数量：wowsp website 为 8 locale；本仓 site 同为 8，但 README 翻译
  额外多一个阿拉伯语（共 9 份文档），与 wowsp 的 README 语言集对齐。
- 主分支命名沿用 wowsp 的 `master`（生产分支、PR-only、禁 force push），
  语义完全一致。

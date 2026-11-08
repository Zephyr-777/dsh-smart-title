# @zephyr-777/dsh-smart-title

[![DSH plugin](https://img.shields.io/badge/dsh-plugin-green)](https://github.com/topics/dsh-plugin)
[![npm version](https://img.shields.io/npm/v/@zephyr-777/dsh-smart-title)](https://www.npmjs.com/package/@zephyr-777/dsh-smart-title)

**会话智能标题（合并版）**：用 LLM 给 DSH 会话生成固定格式的标题 —— `MMDD｜类型｜主题`。

![demo](docs/demo.gif)

## 简介

本插件占用 DSH 的 `ctx.sessionTitle` 标题提供方槽位，在**首条消息**到达时立即出一个标题，并在**每轮对话结束**后按完整转写（含工具调用摘要）重新生成。标题格式固定为：

```
MMDD｜类型｜主题
```

例如 `1108｜功能｜子路径反代部署修复`。分隔符是**全角竖线 `｜`（U+FF5C）**，不是 ASCII 的 `|`。

0.2.0 是**合并版**：把 [weibaohui/dsh-smart-title](https://github.com/weibaohui/dsh-smart-title) 的设置页与刷新策略，和 [Chi-hong22/dsh-session-autoname](https://github.com/Chi-hong22/dsh-session-autoname) 的严格命名格式与证据折叠机制，合到了同一个插件里。

## 它解决什么问题

官方内置的 `first-prompt` 标题提供方只读第一条用户消息，于是标题永远停留在「帮我看看这个报错」这类复述上，几轮之后与实际在干的事情完全脱节；而且它对失败没有重试，一旦请求失败就永久留着回退标题。

本插件把标题当成一个**随会话演进的产物**来看：

- 首条消息就出题，不用等第一轮结束（可切回占位标题模式）
- 每轮结束时用**完整转写 + 工具调用摘要**重刷，标题跟着会话真正在做的事走
- 手动改过的标题永不被覆盖

## 标题格式

```
MMDD｜类型｜主题
```

**日期段 `MMDD`**：取自**会话创建时间**，按设置里的 `timeZone`（默认 `Asia/Shanghai`）计算，格式为两位月 + 两位日、无分隔符（如 `1108`）。时区填错时会回退到固定样例，不会让标题生成失败。

**类型段**：从固定的词表中**严格校验**，模型只能从中选一个。内置十类：

| 类型 | 含义 |
|------|------|
| 功能 | 新增功能、新能力 |
| 设计 | 方案设计、架构选型、接口设计 |
| 修复 | 修 bug、排错、纠错 |
| 优化 | 性能、结构、体验上的改进 |
| 发布 | 打包、发版、部署、上线 |
| 探索 | 调研、试错、还没定方向（也是首条消息占位标题的类型） |
| 文档 | 写文档、注释、说明 |
| 研究 | 深入阅读源码、分析机制 |
| 诊断 | 定位问题、看日志、复现 |
| 验证 | 测试、回归、确认已修好 |

留空 `namingTypes` 就用上面十类；填了自定义词表则替换掉内置列表（逗号分隔）。

**主题段**：一段简短的名词性描述，长度受 `topicMaxChars`（默认 20 字符）约束，超长会被裁剪。

## 与两个上游项目的关系

| 来源 | 本插件保留的部分 |
|------|------------------|
| [weibaohui/dsh-smart-title](https://github.com/weibaohui/dsh-smart-title) | 设置页可视化配置、HTTP API、刷新节流、长会话冻结、同题静默跳过、用户改名保护、标题模型路由、启动回填 |
| [Chi-hong22/dsh-session-autoname](https://github.com/Chi-hong22/dsh-session-autoname) | 严格 `MMDD｜类型｜主题` 命名格式、白名单类型校验、证据折叠（含工具调用摘要）、占位标题与自动升级、fork 分支后缀、启动回扫、`session_title_admin` 管理工具、可配时区 |

⚠️ **二者占用同一个 provider 槽位**：`sessionTitle` 服务只允许注册一个提供方，所以 `@weibaohui/dsh-smart-title`、`@chi-hong22/dsh-session-autoname`、`@deepseek-ai/dsh-experimental-session-titles-bundle` 与本插件**任意时刻只能启用一个**。同时启用第二个注册者会直接让 plugin tree 加载失败。从旧插件迁过来时，请先移除旧插件再装这个。

## 功能特性

- **严格格式**：标题固定 `MMDD｜类型｜主题`，全角竖线分隔；类型白名单校验，模型跑偏会被纠正
- **证据折叠**：每轮结束把完整转写与工具调用摘要折叠成一份紧凑证据再送模型，标题反映真实动作而不是第一句话
- **首条消息即时出题**：可切换为「先落占位标题（类型为「探索」），轮次结束后再升级为正式标题」
- **刷新节流**：距上次生成不足最小间隔（默认 2 分钟）就不重复生成，顺带消掉首轮「即时出题 + 回合结束刷新」的背靠背重复
- **长会话冻结**：会话超过 N 轮后停止自动刷新（默认 100，启动回扫不受影响）
- **同题静默跳过**：新标题与现标题相同（忽略大小写与空白）时不写入，侧栏不闪烁、不产生失败告警
- **手动改名保护**：你在界面上改过的标题绝不被自动覆盖
- **fork 分支后缀**：fork/分叉会话的标题补 ` (2)` 之类后缀，方便区分同源会话
- **启动回扫**：可选地回扫近 N 小时的旧会话补标题（默认关闭）
- **时区可配**：MMDD 按指定 IANA 时区计算，跨时区使用不会串日期
- **自定义类型词表**：用逗号分隔替换内置十类
- **标题模型可指定**：默认跟随会话当前模型，也可单独指定一条便宜/快速的 provider + model
- **管理工具**：注册 `session_title_admin`，让模型可以主动查询/改写标题
- **首题锚定**：标题主题取自会话第一个问题，不会随对话推进被最近一轮的动作带偏；按 `refreshEveryTurns`（默认 5 轮）节奏复核，而不是每轮重算
- **设置页可视化**：所有 27 项设置都在「设置 → 会话智能标题」里，保存即生效

## 安装

```bash
dsh plugin --profile web add @zephyr-777/dsh-smart-title -w
```

装完重启 `dsh web` 即生效，无需额外配置。安装时 patch 会自动禁用内置的 `session-title-llm` 行（`sessionTitle` 服务只允许一个提供方）；卸载本插件后内置提供方自动恢复。

> 从 0.1.x（`@weibaohui/dsh-smart-title`）升级：先 `dsh plugin remove @weibaohui/dsh-smart-title`，再装新包 —— 包名变了，旧包不会自动让位。设置项有增删：`backfillOnStart` / `backfillMaxSessions` / `backfillIntervalMs` 换成了 `catchupOnStart` / `catchupMax` / `catchupDelayMs`，另有若干新键（`format`、`timeZone`、`namingTypes`、`topicMaxChars`、`placeholderOnFirstPrompt`、`upgradeForkTitles`、`catchupWindowHours`、`adminTool`，0.3.0 又加了 `anchorFirstTopic`、`refreshEveryTurns`），旧值不会迁移，重装后按上表重新配一遍。

## 设置项

设置命名空间 `dsh-smart-title`，全部 27 项：

| 键 | 类型 | 默认值 | 说明 |
|----|------|--------|------|
| `enabled` | bool | `true` | 总开关；关闭后完全退回内置标题行为 |
| `includeAssistant` | bool | `true` | 转写里是否包含助手回答；关闭后只用用户消息出题，更省 token。仅 `format=plain` 时生效（strict 模式的证据折叠总要助手产出） |
| `refreshOnTurnEnd` | bool | `true` | 允许在轮末复核标题；具体第几轮由 `refreshEveryTurns` 决定 |
| `anchorFirstTopic` | bool | `true` | 标题主题只从会话**第一个问题**推导，后续轮次仅用于确认主题仍成立；关闭则按对话末端命名，主题会随对话漂移 |
| `refreshEveryTurns` | number `0–1000` step 1 | `5` | 只在第 N、2N、3N… 轮人类消息结束时复核标题（1 = 每轮，0 = 不再复核）。首轮占位升级与 fork 升级不受此项限制 |
| `placeholderOnFirstPrompt` | bool | `true` | 首条消息先用占位标题（类型「探索」），轮次结束后升级为正式标题 |
| `upgradeForkTitles` | bool | `true` | 给 fork/分叉会话的标题补 ` (2)` 之类分支后缀 |
| `excludeForks` | bool | `false` | 完全跳过 fork 子会话；与上一项互斥，开启本项则不再升级 fork 标题 |
| `catchupOnStart` | bool | `false` | 启动时回扫近 N 小时的旧会话补标题 |
| `adminTool` | bool | `true` | 注册 `session_title_admin` 管理工具 |
| `targetWords` | number `1–50` step 1 | `6` | 自由格式（`plain`）时的目标英文词数 |
| `targetCjkCharacters` | number `2–60` step 1 | `12` | 自由格式（`plain`）时的目标中文字数 |
| `topicMaxChars` | number `2–64` step 1 | `20` | 「主题」段最大字符数 |
| `maxInputBytes` | number `512–200000` step 1 | `12000` | 送给模型的最大输入字节 |
| `maxOutputTokens` | number `64–8192` step 64 | `1024` | 输出 token 上限 |
| `timeoutMs` | number `1000–600000` step 1000 | `90000` | 单次生成超时（毫秒） |
| `refreshMinIntervalMs` | number `0–86400000` step 1000 | `120000` | 两次刷新最小间隔（毫秒），0 = 不节流 |
| `refreshMaxTurns` | number `0–10000` step 1 | `100` | 会话超过该轮数后冻结标题，0 = 不限制 |
| `catchupWindowHours` | number `0–720` step 1 | `48` | 回扫窗口（小时） |
| `catchupMax` | number `0–50` step 1 | `5` | 单次启动最多回扫多少个会话 |
| `catchupDelayMs` | number `0–600000` step 500 | `5000` | 启动后延迟多久开始回扫 |
| `provider` | string | `''` | 标题模型 provider；留空 = 用会话默认路由 |
| `model` | string | `''` | 标题模型 id；与 `provider` 必须成对，只填一个会被丢弃 |
| `excludeIdPrefixes` | string | `''` | 逗号分隔的会话 id 前缀排除列表 |
| `format` | select | `'mmdd'` | `mmdd` → `MMDD｜类型｜主题`；`plain` → 自由格式（老 smart-title 行为） |
| `timeZone` | string | `'Asia/Shanghai'` | 日期所用时区（IANA 名称） |
| `namingTypes` | string | `''` | 自定义类型词表，逗号分隔；留空 = 内置十类 |

也可直接编辑 `~/.dsh/settings.yaml` 的 `dsh-smart-title:` 节，保存后约 2 秒热生效。

## 标题的生成流程

```
首条消息 ──► 占位标题（MMDD｜探索｜…）   ← placeholderOnFirstPrompt = true
          └► 或直接出正式标题            ← placeholderOnFirstPrompt = false
                        │
turn/end ──► 折叠证据（转写 + 工具调用摘要）──► LLM ──► 严格校验 ──► 写 session/title
              │                                        │
              ├─ refreshMinIntervalMs 节流             ├─ 类型不在白名单 → 回退/纠正
              ├─ refreshMaxTurns 冻结                  ├─ 同题 → 静默跳过
              └─ 用户手动改过 → 直接跳过                └─ topicMaxChars 超长 → 裁剪
                        │
启动回扫 ──► 回扫 catchupWindowHours 内标题不合格的会话（最多 catchupMax 个）：
             标题不合格式、仍是本插件推导的占位标题、或客户端 fork 重命名留下的分支标题；
             手动改过的不动；没有助手产出的跳过
```

写入走 dsh 官方 `sessionTitle` 服务的 `session/title` 日志事件，与内置提供方同一通道，客户端侧边栏无感知自动刷新。

## 与官方 session-titles bundle 的冲突说明

`@deepseek-ai/dsh-experimental-session-titles-bundle` 与 `@chi-hong22/dsh-session-autoname` 都会宣称 `all-prompts` / 占用同一个 `sessionTitle` 提供方槽位。这是 DSH 的单例约束：`sessionTitle` 服务只允许注册一个提供方，第二个 `register` 会立即抛错，表现为 **plugin tree failed to load**。

因此：

- 本插件通过 `cordis.patch.yml` 用同 id 覆盖（`session-title-llm: disabled: true`）让内置 `first-prompt-llm` 让位
- 上述三个插件与本插件之间**只能启用一个**
- 卸载本插件时，patch 层随之移除，内置提供方自动恢复

## 开发

```bash
npm run check        # node --check src/index.js && node --check client/index.js
npm test             # node --test test/*.test.mjs
npm run build:client # 由 client/index.js 重新生成 client/bundle.js
```

`client/bundle.js` 是**生成产物**，不要手改 —— 改 `client/index.js` 后跑 `npm run build:client`。

## License

MIT

## English summary

A DSH plugin that generates session titles with an LLM in the strict format `MMDD｜type｜topic` (full-width bar U+FF5C), where `MMDD` is the session creation date computed in a configurable IANA time zone.

It takes over the single `ctx.sessionTitle` provider slot, titles the first message right away (optionally as an `探索` placeholder that upgrades after the turn), and re-runs on every `turn/end` over the full transcript plus folded tool-call traces.

The type segment is validated against a whitelist (built-in ten: 功能, 设计, 修复, 优化, 发布, 探索, 文档, 研究, 诊断, 验证, or your own comma-separated list), and the topic segment is clipped to `topicMaxChars`.

Kept from weibaohui/dsh-smart-title: the settings page, HTTP API, refresh throttle, long-session freeze, same-title skip, manual-rename protection and title model routing. Added from Chi-hong22/dsh-session-autoname: the strict format, placeholder upgrade, fork branch suffixes, startup catch-up, `session_title_admin` and configurable time zone.

Because the `sessionTitle` service allows exactly one provider, this plugin, `dsh-experimental-session-titles-bundle` and `@chi-hong22/dsh-session-autoname` are mutually exclusive — enable only one at a time.

Install with `dsh plugin --profile web add @zephyr-777/dsh-smart-title -w`; all 25 settings are editable under Settings → Smart Session Titles. MIT licensed.

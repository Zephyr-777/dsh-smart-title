# Changelog

本项目的所有重要变更都记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.0] - 2026-11-08

与 `@chi-hong22/dsh-session-autoname` 合并后的首个版本。

### BREAKING CHANGES

- **包名改为 `@zephyr-777/dsh-smart-title`**（原 `@weibaohui/dsh-smart-title`）。旧包不会自动让位，升级时请先移除再安装。
- **标题格式改为 `MMDD｜类型｜主题`**（全角竖线 U+FF5C）。`MMDD` 取自会话创建时间、按 `timeZone` 计算；类型段严格白名单校验；主题段受 `topicMaxChars` 限制。想要老的自由格式，把 `format` 设为 `plain`。
- 设置项重命名：`backfillOnStart` → `catchupOnStart`、`backfillMaxSessions` → `catchupMax`、`backfillIntervalMs` → `catchupDelayMs`。旧值不迁移。

### 新增

- **严格格式校验与白名单类型**：标题固定三段式，分隔符为全角竖线；类型只能从内置十类（功能、设计、修复、优化、发布、探索、文档、研究、诊断、验证）或自定义词表中选取。
- **证据折叠（含工具调用摘要）**：每轮结束把完整转写与工具调用痕迹折叠成紧凑证据再送模型，标题反映真实动作而非首条消息。
- **占位标题与自动升级**：`placeholderOnFirstPrompt` 让首条消息先落 `MMDD｜探索｜…` 占位，轮次结束后升级为正式标题。
- **fork 分支后缀**：`upgradeForkTitles` 给 fork/分叉会话标题补 ` (2)` 之类后缀；`excludeForks` 则完全跳过 fork 子会话，二者互斥。
- **启动回扫**：`catchupOnStart` 在启动后回扫 `catchupWindowHours` 内的旧会话，最多 `catchupMax` 个，每个间隔 `catchupDelayMs`。
- **管理工具 `session_title_admin`**：`adminTool` 开关，让模型可主动查询/改写标题。
- **时区可配**：`timeZone`（IANA 名称，默认 `Asia/Shanghai`），跨时区使用不会串日期。
- **自定义类型词表**：`namingTypes` 逗号分隔，留空用内置十类。
- 设置页新增 **实时格式预览**：按当前 `format` 与时区渲染样例 `MMDD｜功能｜示例主题`。

### 保留

- **设置页可视化配置**：5 张卡片分组（基础 / 刷新策略 / 标题模型路由 / 范围 / 启动回扫），25 项设置全部可编辑，保存即生效。
- **刷新节流**：`refreshMinIntervalMs` 最小间隔（默认 2 分钟），顺带消掉首轮「即时出题 + 回合结束刷新」的背靠背重复。
- **长会话冻结**：`refreshMaxTurns`（默认 100 轮），启动回扫不受冻结影响。
- **同题静默跳过**：新旧标题相同（忽略大小写与空白）时不写入，侧栏不闪烁、无失败告警。
- **用户改名保护**：手动改过的标题永不被自动覆盖。
- **标题模型路由**：`provider` + `model` 可单独指定，留空则跟随会话当前模型；两项必须成对。

### 修复

- 客户端的 `ButtonLite` 在 `@deepseek-ai/dsh-client-ui-primitives` 缺失时会解引用 `P.Button` 抛错；改为先判 `P && P.Button`，无 primitives 时回退到原生 `<button>`。
EOF
echo done
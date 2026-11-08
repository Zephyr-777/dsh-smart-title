/* Generated from client/index.js by scripts/build-client.mjs — do not edit by hand.
 * Regenerate with: npm run build:client
 */
window.__ModuleLoader__.load({
  id: "@zephyr-777/dsh-smart-title",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })
    var React = require("react")
    /**
     * @zephyr-777/dsh-smart-title - Browser half.
     *
     * Single surface: the host settings page section (a `settings.section` slot =
     * one nav entry in the settings window). All colors come from the ui-theme
     * `--dsw-*` token layers so light/dark follows the shell; all copy comes from
     * the locale registry (`zh`/`en`). The client is a thin editor over the
     * plugin's HTTP API (GET /status, PUT /settings, GET /models) — the host
     * plugin owns the sessionTitle provider and the turn/end refresh loop.
     *
     * 0.2.0 merges @chi-hong22/dsh-session-autoname: titles follow the strict
     * `MMDD｜类型｜主题` format (FULL-WIDTH bar U+FF5C) while keeping smart-title's
     * settings UI, refresh throttle and model routing.
     */

    // React is a loader platform module. Under plain Node (contract tests) a
    // minimal createElement/hook shim keeps the source loadable for assertions.
    let __React = null
    try { __React = require('react') } catch {}
    if (!__React || typeof __React.createElement !== 'function') {
      __React = {
        createElement(type, props, ...kids) {
          return { type, props: props || {}, kids: kids.flat(9).filter(k => k !== null && k !== undefined && k !== false && k !== true || true) }
        },
        useState(init) { const v = [typeof init === 'function' ? init() : init]; return [v[0], x => { v[0] = typeof x === 'function' ? x(v[0]) : x }] },
        useEffect() {}, useMemo(fn) { return fn() }, useRef(v = null) { return { current: v } },
      }
    }
    const { createElement: h, useState, useEffect } = __React

    // Platform module — always present in the loader's seeded require table.
    // Under plain Node (tests) it is absent; a tagged-element shim keeps the
    // tree structurally testable while the save button ships a real primitive.
    let P = null
    try { P = require('@deepseek-ai/dsh-client-ui-primitives') } catch {}

    /** Idempotent stylesheet injection. */
    function ensureStyles() {
      if (typeof document === 'undefined' || document.getElementById('dshst-styles')) return
      const holder = document.createElement('div')
      holder.id = 'dshst-styles'
      holder.style.display = 'none'
      holder.innerHTML = STYLE
      document.head.appendChild(holder)
    }

    // ── Frozen settings contract ─────────────────────────────────────────────
    // Source of truth is the host schema (SETTINGS_NS = 'dsh-smart-title', every
    // field `.volatile()`). The client mirrors it: 8 bools + 11 numbers + 6
    // strings = 25 keys, and NEVER sends a key outside this list.

    /** 布尔项（开关） */
    const BOOL_KEYS = [
      'enabled',
      'includeAssistant',
      'refreshOnTurnEnd',
      'placeholderOnFirstPrompt',
      'upgradeForkTitles',
      'excludeForks',
      'catchupOnStart',
      'adminTool',
    ]

    /** 数值项 → [min, max, step] */
    const NUM_RANGES = {
      targetWords: [1, 50, 1],
      targetCjkCharacters: [2, 60, 1],
      topicMaxChars: [2, 64, 1],
      maxInputBytes: [512, 200000, 512],
      maxOutputTokens: [64, 8192, 64],
      timeoutMs: [1000, 600000, 1000],
      refreshMinIntervalMs: [0, 86400000, 1000],
      refreshMaxTurns: [0, 10000, 1],
      catchupWindowHours: [0, 720, 1],
      catchupMax: [0, 50, 1],
      catchupDelayMs: [0, 600000, 500],
    }

    /** 文本项 */
    const STR_KEYS = ['provider', 'model', 'excludeIdPrefixes', 'format', 'timeZone', 'namingTypes']

    const NUM_KEYS = Object.keys(NUM_RANGES)
    const ALL_KEYS = BOOL_KEYS.concat(NUM_KEYS, STR_KEYS)

    /** 宿主 DEFAULTS 的镜像，用于 GET /status 只回部分字段时补全受控值。 */
    const DEFAULTS = Object.freeze({
      enabled: true,
      includeAssistant: true,
      refreshOnTurnEnd: true,
      placeholderOnFirstPrompt: true,
      upgradeForkTitles: true,
      excludeForks: false,
      catchupOnStart: false,
      adminTool: true,
      targetWords: 6,
      targetCjkCharacters: 12,
      topicMaxChars: 20,
      maxInputBytes: 12000,
      maxOutputTokens: 1024,
      timeoutMs: 90000,
      refreshMinIntervalMs: 120000,
      refreshMaxTurns: 100,
      catchupWindowHours: 48,
      catchupMax: 5,
      catchupDelayMs: 5000,
      provider: '',
      model: '',
      excludeIdPrefixes: '',
      format: 'mmdd',
      timeZone: 'Asia/Shanghai',
      namingTypes: '',
    })

    /** 内置十类（与宿主一致；仅用于占位提示与预览样例） */
    const BUILTIN_TYPES = ['功能', '设计', '修复', '优化', '发布', '探索', '文档', '研究', '诊断', '验证']

    /** 时区建议项（text input + <datalist>，不是封闭枚举）。 */
    const TIME_ZONE_SUGGESTIONS = ['Asia/Shanghai', 'Asia/Tokyo', 'UTC', 'America/Los_Angeles', 'Europe/London']

    // ── Locale ───────────────────────────────────────────────────────────────

    const NS = 'dshSmartTitle'

    const ZH = {
      title: '会话智能标题',
      armed: '已接管标题',
      notArmed: '未就绪',
      notArmedHint: 'LLM 加载失败，标题生成不可用（保持回退标题）',
      hint: '标题格式固定为「MMDD｜类型｜主题」：首条消息即时出题，每轮结束后用完整转写与工具痕迹重刷，手动改过的标题不会被覆盖。',

      // 卡片标题
      secBasics: '基础',
      secRefresh: '刷新策略',
      secRoute: '标题模型路由',
      secScope: '范围',
      secCatchup: '启动回扫',

      // 字段标签
      'f_enabled': '启用会话智能标题',
      'f_includeAssistant': '转写包含助手回答',
      'f_refreshOnTurnEnd': '每轮结束后刷新标题',
      'f_placeholderOnFirstPrompt': '首条消息先用占位标题',
      'f_upgradeForkTitles': '为 fork 会话标题补分支后缀',
      'f_excludeForks': '完全跳过 fork 子会话',
      'f_catchupOnStart': '启动时回扫旧会话',
      'f_adminTool': '注册 session_title_admin 管理工具',
      'f_targetWords': '目标英文词数',
      'f_targetCjkCharacters': '目标中文字数',
      'f_topicMaxChars': '「主题」段最大字符数',
      'f_maxInputBytes': '转写字节预算',
      'f_maxOutputTokens': '输出 token 上限',
      'f_timeoutMs': '生成超时（毫秒）',
      'f_refreshMinIntervalMs': '刷新最小间隔（毫秒）',
      'f_refreshMaxTurns': '长会话冻结阈值（轮）',
      'f_catchupWindowHours': '回扫窗口（小时）',
      'f_catchupMax': '单次回扫会话上限',
      'f_catchupDelayMs': '启动后延迟（毫秒）',
      'f_provider': 'provider',
      'f_model': 'model',
      'f_excludeIdPrefixes': '跳过的会话 id 前缀（逗号分隔）',
      'f_format': '标题格式',
      'f_timeZone': '日期时区',
      'f_namingTypes': '自定义类型词表',

      // 字段提示
      'h_enabled': '总开关；关闭后完全退回内置标题行为。',
      'h_includeAssistant': '仅 plain 格式生效；关闭后只用用户消息出题，更省 token。strict 格式的证据折叠总要助手产出。',
      'h_refreshOnTurnEnd': '每轮对话结束后按完整转写与工具调用摘要重刷标题。',
      'h_placeholderOnFirstPrompt': '首条消息先落「MMDD｜探索｜…」占位，轮次结束后升级为正式标题。',
      'h_upgradeForkTitles': 'fork/分叉会话的标题追加 ` (2)` 之类分支后缀。',
      'h_excludeForks': '与上一项互斥：开启本项则不再升级 fork 标题，完全不动子会话。',
      'h_catchupOnStart': '启动后回扫窗口内的旧会话补标题；手动改过的不动。',
      'h_adminTool': '给模型注册 session_title_admin，可主动查询/改写标题。',
      'h_targetWords': '仅 plain 格式生效：非 CJK 标题的目标英文词数。',
      'h_targetCjkCharacters': '仅 plain 格式生效：中文标题的目标字数。',
      'h_topicMaxChars': '「主题」段的字符上限，超出会被裁剪。',
      'h_maxInputBytes': '完整转写封帧后的 UTF-8 字节上限，超预算从最旧的消息开始丢弃。',
      'h_maxOutputTokens': '给思考型模型留余量，正常标题远用不满。',
      'h_timeoutMs': '单次标题生成的端到端时限。',
      'h_refreshMinIntervalMs': '两次刷新之间的最小间隔，0 = 不节流。默认 120000 = 2 分钟。',
      'h_refreshMaxTurns': '会话超过该轮数后冻结自动刷新（启动回扫不受限），0 = 不限制。',
      'h_catchupWindowHours': '只回扫创建时间落在该窗口内的会话。',
      'h_catchupMax': '单次启动最多回扫多少个会话，0 = 关闭。',
      'h_catchupDelayMs': '启动完成后等多久才开始回扫，避免挤占启动路径。',
      'h_provider': '标题模型的 provider；留空则用会话默认路由。',
      'h_model': '标题模型 id；与 provider 必须成对，只填一个会被丢弃。',
      'h_excludeIdPrefixes': '命中的会话完全不处理；如 hermes-loop-review-',
      'h_format': 'mmdd = 严格「MMDD｜类型｜主题」；plain = 老版自由格式。',
      'h_timeZone': '计算 MMDD 所用时区，填 IANA 名称，如 Asia/Shanghai。',
      'h_namingTypes': '逗号分隔的类型词表；留空用内置十类。',

      // 组件内文案
      previewLabel: '格式预览',
      previewHint: '按所选时区取今天日期生成样例',
      plainPreview: '示例会话主题',
      routeHint: '为标题单独指定一条便宜/快速的模型路由；不配置则跟随会话当前模型。两项必须同时配置或同时留空。',
      useCurrent: '沿用当前',
      currentSetting: '当前设置',
      catalogUnavailable: '模型目录不可用——仍可手改 settings.yaml 的 provider/model',
      sameTitleNote: '新生成的标题与现标题相同（忽略大小写与空白差异）时自动跳过写入，侧栏不会闪烁，也不会产生失败告警。',
      forkNote: '「完全跳过 fork 子会话」与「补分支后缀」互斥：前者优先。',
      builtinTypesHint: '内置十类：功能、设计、修复、优化、发布、探索、文档、研究、诊断、验证',
      save: '保存',
      saving: '保存中',
      saved: '已保存',
      loading: '…',
      operationFailed: '操作失败',
    }

    const EN = {
      title: 'Smart Session Titles',
      armed: 'title provider armed',
      notArmed: 'not ready',
      notArmedHint: 'LLM unavailable — title generation disabled (fallback titles stay)',
      hint: 'Titles always follow `MMDD｜type｜topic`: the first message titles instantly, and every turn end re-runs on the full transcript plus tool traces. Titles you renamed by hand are never overwritten.',

      secBasics: 'Basics',
      secRefresh: 'Refresh policy',
      secRoute: 'Title model route',
      secScope: 'Scope',
      secCatchup: 'Startup catch-up',

      'f_enabled': 'Enable smart session titles',
      'f_includeAssistant': 'Include assistant replies in transcript',
      'f_refreshOnTurnEnd': 'Refresh the title after every turn',
      'f_placeholderOnFirstPrompt': 'Use a placeholder title on the first message',
      'f_upgradeForkTitles': 'Add a branch suffix to fork titles',
      'f_excludeForks': 'Skip fork child sessions entirely',
      'f_catchupOnStart': 'Catch up old sessions on startup',
      'f_adminTool': 'Register the session_title_admin tool',
      'f_targetWords': 'Target word count (non-CJK)',
      'f_targetCjkCharacters': 'Target character count (CJK)',
      'f_topicMaxChars': 'Max chars in the topic segment',
      'f_maxInputBytes': 'Transcript byte budget',
      'f_maxOutputTokens': 'Max output tokens',
      'f_timeoutMs': 'Generation timeout (ms)',
      'f_refreshMinIntervalMs': 'Min refresh interval (ms)',
      'f_refreshMaxTurns': 'Long-session freeze (turns)',
      'f_catchupWindowHours': 'Catch-up window (hours)',
      'f_catchupMax': 'Max sessions per catch-up',
      'f_catchupDelayMs': 'Startup delay (ms)',
      'f_provider': 'provider',
      'f_model': 'model',
      'f_excludeIdPrefixes': 'Excluded session id prefixes (comma separated)',
      'f_format': 'Title format',
      'f_timeZone': 'Date time zone',
      'f_namingTypes': 'Custom type vocabulary',

      'h_enabled': 'Master switch; off falls back to the stock title behaviour.',
      'h_includeAssistant': 'Plain format only; off = user messages only (cheaper). Strict-format evidence folding always needs assistant output.',
      'h_refreshOnTurnEnd': 'After each turn the title is rebuilt from the full transcript and tool-call traces.',
      'h_placeholderOnFirstPrompt': 'The first message lands a `MMDD｜explore｜…` placeholder, upgraded once the turn ends.',
      'h_upgradeForkTitles': 'Forked sessions get a ` (2)` style branch suffix on their title.',
      'h_excludeForks': 'Mutually exclusive with the previous switch: on means fork titles are never upgraded at all.',
      'h_catchupOnStart': 'Backfills sessions created inside the window; manually renamed titles are left alone.',
      'h_adminTool': 'Registers session_title_admin so the model can inspect/rewrite titles on demand.',
      'h_targetWords': 'Plain format only: target word count for non-CJK titles.',
      'h_targetCjkCharacters': 'Plain format only: target character count for CJK titles.',
      'h_topicMaxChars': 'Character cap for the topic segment; longer topics are trimmed.',
      'h_maxInputBytes': 'UTF-8 byte cap for the framed transcript; over budget drops oldest messages first.',
      'h_maxOutputTokens': 'Headroom for thinking models; a normal title needs far less.',
      'h_timeoutMs': 'End-to-end time limit for one title generation.',
      'h_refreshMinIntervalMs': 'Minimum gap between two refreshes, 0 = no throttle. Default 120000 = 2 min.',
      'h_refreshMaxTurns': 'Stops auto-refresh beyond this many turns (startup catch-up exempt), 0 = unlimited.',
      'h_catchupWindowHours': 'Only sessions created within this window are backfilled.',
      'h_catchupMax': 'Max sessions backfilled per startup, 0 = disabled.',
      'h_catchupDelayMs': 'How long to wait after startup before catch-up starts.',
      'h_provider': 'Provider for titles; leave empty to follow the session route.',
      'h_model': 'Model id for titles; must be paired with provider, a lone value is dropped.',
      'h_excludeIdPrefixes': 'Matching sessions are never touched; e.g. hermes-loop-review-',
      'h_format': 'mmdd = strict `MMDD｜type｜topic`; plain = the old free-form behaviour.',
      'h_timeZone': 'IANA zone used to compute MMDD, e.g. Asia/Shanghai.',
      'h_namingTypes': 'Comma separated type list; empty falls back to the built-in ten.',

      previewLabel: 'Format preview',
      previewHint: 'Sample built from today in the selected time zone',
      plainPreview: 'Sample session topic',
      routeHint: 'Route titles to a cheap/fast model; leave empty to follow the session model. Both fields must be set together or both empty.',
      useCurrent: 'Keep current',
      currentSetting: 'current setting',
      catalogUnavailable: 'Model catalog unavailable — edit provider/model in settings.yaml directly',
      sameTitleNote: 'When a generated title matches the current one (ignoring case/whitespace), the write is skipped silently — no sidebar flicker, no failure logs.',
      forkNote: '"Skip fork child sessions" wins over "add a branch suffix".',
      builtinTypesHint: 'Built-in types: 功能, 设计, 修复, 优化, 发布, 探索, 文档, 研究, 诊断, 验证',
      save: 'Save',
      saving: 'Saving',
      saved: 'Saved',
      loading: '…',
      operationFailed: 'Operation failed',
    }

    // ── Pure helpers ────────────────────────────────────────────────────────

    // API 基址随页面走：子路径反代（如 https://host/app/dsh/）下，绝对路径 /dsh-smart-title/api
    // 会打到站点根而 404。与宿主官方客户端一致，用 document.baseURI 推导（dsh-sync#14 同款）。
    const API = (() => {
      try {
        const base = (typeof document !== 'undefined' && document.baseURI) || (typeof location !== 'undefined' ? location.href : '/')
        return new URL('dsh-smart-title/api', new URL('.', base)).pathname.replace(/\/+$/, '')
      } catch { return '/dsh-smart-title/api' }
    })()

    async function getJson(url) {
      const r = await fetch(url)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    }

    function num(v, fallback) { const n = Number(v); return v === '' || v === null || v === undefined || !Number.isFinite(n) ? fallback : n }

    /** 把任意 settings 快照补齐成完整受控值（缺失/脏值回落默认 + 夹取）。 */
    function normalize(raw) {
      const src = raw && typeof raw === 'object' ? raw : {}
      const out = {}
      for (const k of BOOL_KEYS) out[k] = src[k] === undefined ? DEFAULTS[k] : Boolean(src[k])
      for (const k of NUM_KEYS) {
        const [min, max] = NUM_RANGES[k]
        const n = num(src[k], DEFAULTS[k])
        out[k] = Math.min(max, Math.max(min, n))
      }
      for (const k of STR_KEYS) out[k] = src[k] === undefined || src[k] === null ? DEFAULTS[k] : String(src[k])
      if (out.format !== 'plain' && out.format !== 'mmdd') out.format = DEFAULTS.format
      return out
    }

    /** 只保留冻结契约里的键（PUT body 白名单，绝不发送未知键）。 */
    function pickPatch(snapshot) {
      const src = snapshot && typeof snapshot === 'object' ? snapshot : {}
      const n = normalize(src)
      const patch = {}
      for (const k of ALL_KEYS) patch[k] = n[k]
      return patch
    }

    /** 今天的 MMDD（按给定时区，两位月 + 两位日、无分隔符）。失败返回 ''。 */
    function computeMmdd(timeZone) {
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || undefined, month: '2-digit', day: '2-digit' }).formatToParts(new Date())
        const m = (parts.find(p => p.type === 'month') || {}).value || ''
        const d = (parts.find(p => p.type === 'day') || {}).value || ''
        if (!/^\d{2}$/.test(m) || !/^\d{2}$/.test(d)) return ''
        return m + d
      } catch { return '' }
    }

    // 全角竖线 U+FF5C 是标题分隔符，任何情况下都不要换成 ASCII 竖线。
    const BAR = '｜'
    const PREVIEW_FALLBACK = 'MMDD' + BAR + '功能' + BAR + '示例主题'

    /** 实时格式预览：mmdd → `<MMDD>｜功能｜示例主题`；plain → 自由格式样例。 */
    function previewTitle(format, timeZone) {
      if (format === 'plain') return ZH.plainPreview
      const mmdd = computeMmdd(timeZone)
      if (!mmdd) return PREVIEW_FALLBACK
      return mmdd + BAR + '功能' + BAR + '示例主题'
    }

    // ── Token-based stylesheet (light/dark adaptive by construction) ────────

    const STYLE = `<style>
    .dst-page{position:relative;display:flex;flex-direction:column;gap:14px;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:var(--dsw-font-sm-14,14px)}
    .dst-body{display:flex;flex-direction:column;gap:14px}
    .dst-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .dst-spacer{flex:1}
    .dst-hint{color:var(--dsw-alias-label-secondary)}
    .dst-dir{color:var(--dsw-alias-label-tertiary);font-size:var(--dsw-font-xs-13,12px)}
    .dst-tag{display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font-size:11.5px}
    .dst-tag.accent{color:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary)}
    .dst-card{display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
    .dst-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
    .dst-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .dst-field{display:flex;flex-direction:column;gap:4px}
    .dst-toggle{display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:13px;cursor:pointer}
    .dst-toggle.on{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}
    .dst-toggle.off-dim{opacity:.6}
    .dst-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:32px;padding:6px 16px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;cursor:pointer;font-family:var(--dsw-font-family);white-space:nowrap}
    .dst-btn:hover{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover)}
    .dst-btn:disabled{opacity:.5;cursor:not-allowed}
    .dst-btn-primary{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:var(--dsw-alias-label-primary-inverted,#fff)}
    .dst-input{min-height:32px;padding:6px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;font-family:var(--dsw-font-family);outline:none;box-sizing:border-box}
    .dst-input:focus{border-color:var(--dsw-alias-state-business-primary)}
    .dst-preview{font-family:var(--dsw-font-family-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:13px;padding:3px 10px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);white-space:nowrap}
    .dst-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:40;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:8px 18px;font-size:13px;box-shadow:var(--dsw-shadow-lv2)}
    .dst-spin{width:22px;height:22px;border-radius:50%;border:3px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary,var(--dsw-alias-state-business-primary));animation:dstspin .7s linear infinite}
    @keyframes dstspin{to{transform:rotate(360deg)}}
    </style>`

    // ── Small building blocks ────────────────────────────────────────────────

    const Tag = ({ tone, children }) =>
      h('span', { className: 'dst-tag' + (tone ? ' ' + tone : '') }, children)

    function ButtonLite({ primary, children, ...rest }) {
      const cls = 'dst-btn' + (primary ? ' dst-btn-primary' : '')
      // 只在 primitives 真存在时走平台 Button；prim() 本身总返回可渲染的 shim，
      // 不能拿它当存在性判断（否则 P 为 null 时会解引用 P.Button 抛错）。
      if (P && P.Button) {
        return h(P.Button, { variant: primary ? 'primary' : 'outline', size: 'md', className: cls, ...rest }, children)
      }
      return h('button', { className: cls, ...rest }, children)
    }

    function InToast({ text }) {
      return h('div', { className: 'dst-toast' }, text)
    }

    // ── Settings section: the single entrance (host settings page section) ──

    function SettingsSection({ t }) {
      const [status, setStatus] = useState(null)
      const [busy, setBusy] = useState(false)
      const [saveState, setSaveState] = useState('idle') // 保存按钮三态：空闲 / 保存中 / 已保存
      const [toastText, setToastText] = useState(null)
      const [modelCatalog, setModelCatalog] = useState(null)
      // 分态受控值（保存前只改本地，保存统一走 PUT）
      const [s, setS] = useState(null) // settings 快照的工作副本

      const onToast = (text, ms = 3000) => { setToastText(text); setTimeout(() => setToastText(null), ms) }
      const set = (key, value) => setS(prev => ({ ...prev, [key]: value }))

      const refresh = () => getJson(API + '/status').then(d => {
        setStatus(d)
        if (d && d.settings) setS(normalize(d.settings))
      }).catch(() => {})
      const refreshCatalog = () => getJson(API + '/models')
        .then(d => setModelCatalog(d && Array.isArray(d.providers) && d.providers.length > 0 ? d : null))
        .catch(() => setModelCatalog(null))
      useEffect(() => {
        refresh()
        refreshCatalog()
      }, [])

      const doSave = async () => {
        setBusy(true)
        setSaveState('saving')
        try {
          const r = await fetch(API + '/settings', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pickPatch(s)),
          })
          const d = await r.json().catch(() => ({}))
          if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status)
          setS(normalize(d.settings || s))
          setSaveState('saved')
          onToast(t('saved'), 2200)
          setTimeout(() => setSaveState('idle'), 2200)
          refresh()
        } catch (e) {
          setSaveState('idle')
          onToast(e.message || t('operationFailed'), 4000)
        } finally { setBusy(false) }
      }

      const lbl = (key) => t('f_' + key)
      const hintOf = (key) => t('h_' + key)

      const toggle = (key, extraHint) => h('div', { className: 'dst-field' },
        h('label', { className: 'dst-toggle' + (s && s[key] ? ' on' : '') },
          h('input', { type: 'checkbox', checked: Boolean(s && s[key]), onChange: e => set(key, e.target.checked) }), lbl(key)),
        hintOf(key) ? h('div', { className: 'dst-dir', style: { maxWidth: 520 } }, hintOf(key) + (extraHint ? ' ' + extraHint : '')) : null)

      const numField = (key, width = 130) => {
        const [min, max, step] = NUM_RANGES[key]
        return h('div', { className: 'dst-field' },
          h('label', { className: 'dst-dir' }, lbl(key)),
          h('input', {
            className: 'dst-input', type: 'number', min, max, step,
            value: num(s && s[key], DEFAULTS[key]),
            style: { width },
            onChange: e => {
              const raw = e.target.value
              const n = raw === '' ? DEFAULTS[key] : Number(raw)
              set(key, Math.min(max, Math.max(min, Number.isFinite(n) ? n : DEFAULTS[key])))
            },
          }),
          hintOf(key) ? h('div', { className: 'dst-dir', style: { maxWidth: 300 } }, hintOf(key)) : null)
      }

      const textField = (key, placeholder, datalistId, datalistOptions) => h('div', { className: 'dst-field', style: { flex: 1, minWidth: 220 } },
        h('label', { className: 'dst-dir' }, lbl(key)),
        h('input', {
          className: 'dst-input', value: String((s && s[key]) ?? ''), placeholder,
          list: datalistId || undefined, style: { width: '100%' },
          onChange: e => set(key, e.target.value),
        }),
        datalistId && datalistOptions
          ? h('datalist', { id: datalistId }, datalistOptions.map(z => h('option', { key: z, value: z })))
          : null,
        hintOf(key) ? h('div', { className: 'dst-dir' }, hintOf(key)) : null)

      const formatValue = (s && s.format) === 'plain' ? 'plain' : 'mmdd'

      const selectField = (key, options, value) => h('div', { className: 'dst-field', style: { flex: 1, minWidth: 220 } },
        h('label', { className: 'dst-dir' }, lbl(key)),
        h('select', { className: 'dst-input', value, style: { width: '100%' }, onChange: e => set(key, e.target.value) },
          options.map(o => h('option', { key: o.value, value: o.value }, o.label))),
        hintOf(key) ? h('div', { className: 'dst-dir' }, hintOf(key)) : null)

      // provider+model 下拉（实时目录）；目录缺失时仅显示「沿用当前」与已存值，
      // 保证受控 select 有匹配项。清 provider 时连带清 model（成对语义）。
      const routePicker = () => {
        const catalog = modelCatalog
        const providerVal = String((s && s.provider) ?? '')
        const modelVal = String((s && s.model) ?? '')
        const pe = catalog && providerVal ? catalog.providers.find(p => p.id === providerVal) : null
        const missingProvider = providerVal && !(catalog && catalog.providers.some(p => p.id === providerVal))
        const missingModel = providerVal && modelVal && !(pe && pe.models.some(m => m.id === modelVal))
        const defLabel = (d, k) => d && d[k] ? '（' + d[k] + '）' : ''
        return h('div', { className: 'dst-row' },
          h('div', { className: 'dst-field', style: { flex: 1, minWidth: 200 } },
            h('label', { className: 'dst-dir' }, lbl('provider')),
            h('select', { className: 'dst-input', value: providerVal, style: { width: '100%' },
              onChange: e => {
                const v = e.target.value
                set('provider', v)
                const np = catalog ? catalog.providers.find(p => p.id === v) : null
                if (!np || !np.models.some(m => m.id === modelVal)) set('model', '')
              } },
              h('option', { value: '' }, t('useCurrent') + defLabel(catalog && catalog.default, 'provider')),
              catalog ? catalog.providers.map(p => h('option', { key: p.id, value: p.id }, p.name && p.name !== p.id ? p.name + '（' + p.id + '）' : p.id)) : null,
              missingProvider ? h('option', { key: '__prov__', value: providerVal }, providerVal + '（' + t('currentSetting') + '）') : null)),
          h('div', { className: 'dst-field', style: { flex: 1, minWidth: 200 } },
            h('label', { className: 'dst-dir' }, lbl('model')),
            h('select', { className: 'dst-input', value: providerVal ? modelVal : '', disabled: !providerVal, style: { width: '100%' },
              onChange: e => set('model', e.target.value) },
              !providerVal
                ? h('option', { value: '' }, t('useCurrent') + defLabel(catalog && catalog.default, 'model'))
                : [h('option', { key: '__keep__', value: '' }, t('useCurrent')),
                   pe ? pe.models.map(m => h('option', { key: m.id, value: m.id }, m.name && m.name !== m.id ? m.name + '（' + m.id + '）' : m.id)) : null,
                   missingModel ? h('option', { key: '__custom__', value: modelVal }, modelVal + '（' + t('currentSetting') + '）') : null])))
      }

      const saveLabel = saveState === 'saving' ? t('saving') : saveState === 'saved' ? t('saved') : t('save')

      let body
      try {
        body = s === null
          ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: 24, color: 'var(--dsw-alias-label-secondary)' } },
              h('div', { className: 'dst-spin' }), t('loading'))
          : h('div', { className: 'dst-body' },
              h('div', { className: 'dst-toolbar' },
                h(Tag, { tone: status && status.armed ? 'accent' : '' }, status && status.armed ? t('armed') : t('notArmed')),
                h('span', { className: 'dst-spacer' }),
                status && !status.armed && h(Tag, null, t('notArmedHint'))),
              h('div', { className: 'dst-hint' }, t('hint')),
              // ── 卡1：基础（含实时格式预览） ──
              h('div', { className: 'dst-card' },
                h('div', { className: 'dst-title' }, t('secBasics')),
                toggle('enabled'),
                h('div', { className: 'dst-row', style: { alignItems: 'flex-start' } },
                  selectField('format', [
                    { value: 'mmdd', label: 'MMDD' + BAR + '类型' + BAR + '主题' },
                    { value: 'plain', label: t('plainPreview') },
                  ], formatValue),
                  textField('timeZone', 'Asia/Shanghai', 'dshst-tz-list', TIME_ZONE_SUGGESTIONS)),
                h('div', { className: 'dst-row' },
                  h('span', { className: 'dst-dir' }, t('previewLabel') + '：'),
                  h('code', { className: 'dst-preview' }, previewTitle(formatValue, s && s.timeZone)),
                  h('span', { className: 'dst-dir' }, t('previewHint'))),
                textField('namingTypes', BUILTIN_TYPES.join(','), null, null),
                h('div', { className: 'dst-row', style: { alignItems: 'flex-start' } },
                  numField('topicMaxChars', 110),
                  numField('targetWords', 110),
                  numField('targetCjkCharacters', 110))),
              // ── 卡2：刷新策略 ──
              h('div', { className: 'dst-card' },
                h('div', { className: 'dst-title' }, t('secRefresh')),
                toggle('refreshOnTurnEnd'),
                toggle('placeholderOnFirstPrompt'),
                toggle('includeAssistant'),
                h('div', { className: 'dst-row', style: { alignItems: 'flex-start' } },
                  numField('refreshMinIntervalMs'),
                  numField('refreshMaxTurns')),
                h('div', { className: 'dst-dir', style: { maxWidth: 620 } }, t('sameTitleNote'))),
              // ── 卡3：标题模型路由 ──
              h('div', { className: 'dst-card' },
                h('div', { className: 'dst-title' }, t('secRoute')),
                h('div', { className: 'dst-dir', style: { maxWidth: 620 } }, t('routeHint')),
                routePicker(),
                !modelCatalog ? h('div', { className: 'dst-dir' }, t('catalogUnavailable')) : null,
                h('div', { className: 'dst-row', style: { alignItems: 'flex-start' } },
                  numField('maxInputBytes'),
                  numField('maxOutputTokens'),
                  numField('timeoutMs'))),
              // ── 卡4：范围 ──
              h('div', { className: 'dst-card' },
                h('div', { className: 'dst-title' }, t('secScope')),
                toggle('excludeForks', t('forkNote')),
                toggle('upgradeForkTitles'),
                textField('excludeIdPrefixes', 'hermes-loop-review-', null, null),
                toggle('adminTool')),
              // ── 卡5：启动回扫 ──
              h('div', { className: 'dst-card' },
                h('div', { className: 'dst-title' }, t('secCatchup')),
                toggle('catchupOnStart'),
                h('div', { className: 'dst-row', style: { alignItems: 'flex-start' } },
                  numField('catchupWindowHours'),
                  numField('catchupMax'),
                  numField('catchupDelayMs'))),
              h('div', { className: 'dst-toolbar' },
                h(ButtonLite, { primary: true, disabled: busy, onClick: doSave }, saveLabel)))
      } catch (renderErr) {
        ;(globalThis.__skErrors = globalThis.__skErrors || []).push('body: ' + (renderErr && renderErr.message))
        body = h('div', { className: 'dst-card', style: { color: 'var(--dsw-alias-state-error-primary)' } },
          '\u26A0\uFE0F ' + String((renderErr && renderErr.message) || renderErr))
      }

      return h('div', { className: 'dst-page' },
        h('div', { className: 'dst-body' }, body),
        toastText && h(InToast, { text: toastText }),
      )
    }

    function SettingsSlotComponent(props) {
      useEffect(ensureStyles, [])
      return h(SettingsSection, { t: props.__t })
    }

    // ── Plugin plane contract ────────────────────────────────────────────────

    const CLIENT_NAME = '@zephyr-777/dsh-smart-title'

    module.exports = {
      name: CLIENT_NAME,
      inject: ['slots', 'locale'],
      __internals: { NS, ZH, EN, DEFAULTS, BOOL_KEYS, NUM_RANGES, STR_KEYS, ALL_KEYS, normalize, pickPatch, computeMmdd, previewTitle, BUILTIN_TYPES },
      __boot(container, opts = {}) {
        ensureStyles()
        let t = opts.t || ((key) => ZH[key] ?? EN[key] ?? key)
        const root = require('react-dom/client').createRoot(container)
        root.render(h(SettingsSection, { t }))
        return root
      },
      apply(ctx) {
        let t = (key) => ZH[key] ?? EN[key] ?? key
        try {
          if (ctx.locale && typeof ctx.locale.register === 'function') {
            ctx.locale.register(NS, 'zh', ZH)
            ctx.locale.register(NS, 'en', EN)
            const bound = typeof ctx.locale.bind === 'function' ? ctx.locale.bind(NS) : null
            if (bound) t = (key) => bound(key) || (ZH[key] ?? EN[key] ?? key)
          }
        } catch (e) { try { console.error('[dsh-smart-title] locale init:', e) } catch {} }
        ctx.effect(() => {
          try {
            ctx.slots.inject('settings.section', () => ctx.slots.register({
              name: 'settings.section',
              id: CLIENT_NAME,
              order: 95,
              locale: NS,
              label: () => t('title'),
              inject: () => ({}),
            }, function SettingsSectionSlot() {
              return h(SettingsSlotComponent, { __t: t })
            }))
          } catch (e) { (globalThis.__skErrors = globalThis.__skErrors || []).push('settings:' + (e && e.message)); throw e }
        }, 'dsh-smart-title: settings section')
      },
    }

    return module.exports
  }
})

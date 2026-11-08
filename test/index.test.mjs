import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const plugin = require('../src/index.js')
const {
  __internals,
  apply,
  name: PLUGIN_NAME,
  inject: PLUGIN_INJECT,
  Config
} = plugin
const {
  // 合并新增：命名格式引擎
  TYPES,
  SEPARATOR,
  DEFAULT_TIME_ZONE,
  MAX_TITLE_BYTES,
  MAX_TOPIC_BYTES,
  FALLBACK_TOPIC_CHARS,
  PLACEHOLDER_TYPE,
  FORMATS,
  canonicalTimeZone,
  mmddOf,
  bytesOf,
  charsOf,
  truncateBytes,
  parseNamingTypes,
  placeholderTypeOf,
  comparableName,
  isCompliantTitle,
  acceptTitle,
  acceptPlainTitle,
  strictSystemPrompt,
  // 合并新增：证据折叠
  textOfContent,
  ownEventsOf,
  foldTurns,
  toolSummary,
  titleStateOf,
  firstTurnData,
  conversationData,
  digestOf,
  // 合并新增：占位 / fork
  fallbackTitleOf,
  looksLikePlaceholder,
  isConversationSession,
  isForkedConversation,
  forkSuffixOf,
  withForkSuffix,
  shouldUpgradeForkTitle,
  // 老 smart-title 纯函数（保留）
  reasonKind,
  isExcluded,
  isUserPinned,
  normalizeTitle,
  isSameTitle,
  countUserTurns,
  sessionEventsOf,
  isThrottled,
  isFrozen,
  sanitizePatch,
  safeSettings,
  parseIdPrefixes,
  messageText,
  extractTranscriptItems,
  trimTranscript,
  truncateTextUtf8,
  frameTranscript,
  systemPrompt,
  resolveRouteOverride,
  settingsSchema,
  __seedDshLlm,
  // 常量
  DEFAULTS,
  SETTINGS_NS
} = __internals

// ── 假 dsh-llm：实现 apply 真正消费的那部分契约 ──────────────────────────────
// 顶层先注入，任何 apply() 都不再尝试解析宿主安装（CI 上没有 ~/.local 宿主）。

const llmCapture = { framed: '' }

class FakeBlockAssembler {
  constructor() {
    this.parts = []
    this.finish = undefined
  }
  push(chunk) {
    if (chunk.type === 'text-delta') {
      if (typeof this.parts[this.parts.length - 1] !== 'string') this.parts.push('')
      this.parts[this.parts.length - 1] += chunk.text
    } else if (chunk.type === 'finish') {
      this.finish = chunk.reason
    }
  }
  blocks() {
    return this.parts.filter((p) => p.length > 0).map((p) => ({ type: 'text', text: p }))
  }
}

__seedDshLlm({
  BlockAssembler: FakeBlockAssembler,
  createUserMessage: (input) => {
    llmCapture.framed = input?.content?.[0]?.text ?? ''
    return { role: 'user', content: input.content, source: input.source }
  },
  deepFreeze: (value) => value
})

function streamOf(text) {
  return async function* () {
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

// ── 模块导出与契约 ──────────────────────────────────────────────────────────

test('模块契约: name/inject 就位且 inject 含 sessionTitle', async () => {
  assert.equal(PLUGIN_NAME, 'dsh-smart-title')
  assert.ok(Array.isArray(PLUGIN_INJECT), 'inject 必须是数组')
  assert.ok(PLUGIN_INJECT.includes('sessionTitle'))
  assert.ok(PLUGIN_INJECT.includes('llm'))
  assert.equal(typeof apply, 'function')
})

test('模块契约: Config 不是 null（null 会让设置页 describe() 抛错）', async () => {
  assert.notEqual(Config, null, 'Config 降级值必须是 undefined 而非 null')
  const ok = Config === undefined || (typeof Config === 'object' && Config !== null)
  assert.ok(ok, `Config 形状非法: ${String(Config)}`)
})

test('模块契约: DEFAULTS 是冻结的 25 键集合', async () => {
  assert.equal(Object.isFrozen(DEFAULTS), true)
  const expected = [
    'enabled', 'format', 'timeZone', 'namingTypes', 'topicMaxChars',
    'targetWords', 'targetCjkCharacters', 'maxInputBytes', 'maxOutputTokens',
    'timeoutMs', 'provider', 'model', 'includeAssistant', 'refreshOnTurnEnd',
    'refreshMinIntervalMs', 'refreshMaxTurns', 'placeholderOnFirstPrompt',
    'excludeForks', 'upgradeForkTitles', 'excludeIdPrefixes', 'catchupOnStart',
    'catchupWindowHours', 'catchupMax', 'catchupDelayMs', 'adminTool'
  ]
  assert.deepEqual(Object.keys(DEFAULTS).sort(), expected.slice().sort())
  assert.equal(Object.keys(DEFAULTS).length, 25)
  assert.equal(DEFAULTS.format, 'mmdd')
  assert.equal(DEFAULTS.timeZone, 'Asia/Shanghai')
  assert.equal(DEFAULTS.placeholderOnFirstPrompt, true)
  assert.equal(DEFAULTS.upgradeForkTitles, true)
  assert.equal(DEFAULTS.excludeForks, false)
})

test('模块契约: SETTINGS_NS 与插件 id 一致', async () => {
  assert.equal(SETTINGS_NS, 'dsh-smart-title')
  assert.equal(SETTINGS_NS, PLUGIN_NAME)
})

test('模块契约: __internals 暴露合并后的全部纯函数', async () => {
  const required = [
    'acceptTitle', 'isCompliantTitle', 'mmddOf', 'canonicalTimeZone', 'bytesOf',
    'charsOf', 'truncateBytes', 'parseNamingTypes', 'placeholderTypeOf',
    'comparableName', 'acceptPlainTitle', 'strictSystemPrompt', 'foldTurns',
    'toolSummary', 'textOfContent', 'titleStateOf', 'firstTurnData',
    'conversationData', 'digestOf', 'ownEventsOf', 'fallbackTitleOf',
    'looksLikePlaceholder', 'isConversationSession', 'isForkedConversation',
    'forkSuffixOf', 'withForkSuffix', 'shouldUpgradeForkTitle', 'settingsSchema'
  ]
  for (const key of required) {
    assert.equal(typeof __internals[key], 'function', `__internals.${key} 缺失`)
  }
  // 常量与命名空间以数据形式暴露，不是函数
  assert.equal(Object.prototype.toString.call(DEFAULTS), '[object Object]')
  assert.equal(typeof SETTINGS_NS, 'string')
  assert.ok(Array.isArray(TYPES))
  assert.ok(TYPES instanceof Object && Object.isFrozen(TYPES))
})

// ── 命名格式常量 ────────────────────────────────────────────────────────────

test('TYPES: 十类白名单且顺序稳定', async () => {
  assert.deepEqual(TYPES, ['功能', '设计', '修复', '优化', '发布', '探索', '文档', '研究', '诊断', '验证'])
  assert.equal(TYPES.length, 10)
  assert.equal(Object.isFrozen(TYPES), true)
})

test('SEPARATOR: 全角 U+FF5C，绝不是半角竖线', async () => {
  assert.equal(SEPARATOR, '\uFF5C')
  assert.equal(SEPARATOR.length, 1)
  assert.notEqual(SEPARATOR, '|')
  assert.notEqual(SEPARATOR.charCodeAt(0), 0x7c)
})

test('常量: 标题/主题/占位预算与格式枚举', async () => {
  assert.equal(MAX_TITLE_BYTES, 76)
  assert.equal(MAX_TOPIC_BYTES, 60)
  assert.equal(FALLBACK_TOPIC_CHARS, 12)
  assert.equal(PLACEHOLDER_TYPE, '探索')
  assert.equal(DEFAULT_TIME_ZONE, 'Asia/Shanghai')
  assert.deepEqual([...FORMATS], ['mmdd', 'plain'])
})

// ── mmddOf ──────────────────────────────────────────────────────────────────

test('mmddOf: 零填充的 MMDD', async () => {
  assert.equal(mmddOf(Date.UTC(2024, 0, 5, 12, 0, 0), 'UTC'), '0105')
  assert.equal(mmddOf(Date.UTC(2024, 11, 25, 12, 0, 0), 'UTC'), '1225')
  assert.match(mmddOf(Date.now(), 'Asia/Shanghai'), /^\d{4}$/u)
})

test('mmddOf: 时区真的位移日期（UTC 15:59 还是 0131，16:00 已是 0201）', async () => {
  const before = Date.UTC(2024, 0, 31, 15, 59, 0)
  const after = Date.UTC(2024, 0, 31, 16, 0, 0)
  assert.equal(mmddOf(before, 'Asia/Shanghai'), '0131')
  assert.equal(mmddOf(after, 'Asia/Shanghai'), '0201')
  // 同一瞬刻在洛杉矶仍是前一天
  assert.equal(mmddOf(after, 'America/Los_Angeles'), '0131')
})

test('mmddOf: 空/非法时区回退到默认时区（Asia/Shanghai）', async () => {
  const at = Date.UTC(2024, 0, 31, 16, 30, 0) // SH 已是 0201
  assert.equal(mmddOf(at, ''), '0201')
  assert.equal(mmddOf(at, 'Nope/Zone'), '0201')
  assert.equal(mmddOf(at, undefined), '0201')
  assert.equal(mmddOf(at, 42), '0201')
})

test('mmddOf: 非有限 createdAt 抛错', async () => {
  assert.throws(() => mmddOf('2024-01-01', 'UTC'), /not a finite timestamp/u)
  assert.throws(() => mmddOf(NaN, 'UTC'), /not a finite timestamp/u)
  assert.throws(() => mmddOf(Infinity, 'UTC'), /not a finite timestamp/u)
  assert.throws(() => mmddOf(undefined, 'UTC'), /not a finite timestamp/u)
})

// ── canonicalTimeZone ───────────────────────────────────────────────────────

test('canonicalTimeZone: 合法 IANA 名返回去空格后的名字', async () => {
  assert.equal(canonicalTimeZone('Asia/Shanghai'), 'Asia/Shanghai')
  assert.equal(canonicalTimeZone('  UTC  '), 'UTC')
  assert.equal(canonicalTimeZone('America/Los_Angeles'), 'America/Los_Angeles')
})

test('canonicalTimeZone: 空串/垃圾/非字符串 → null', async () => {
  assert.equal(canonicalTimeZone(''), null)
  assert.equal(canonicalTimeZone('   '), null)
  assert.equal(canonicalTimeZone('Mars/Olympus'), null)
  assert.equal(canonicalTimeZone(null), null)
  assert.equal(canonicalTimeZone(undefined), null)
  assert.equal(canonicalTimeZone(42), null)
})

// ── bytesOf / charsOf ───────────────────────────────────────────────────────

test('bytesOf/charsOf: UTF-8 字节 vs 码点，CJK 二者不同', async () => {
  assert.equal(bytesOf('abc'), 3)
  assert.equal(charsOf('abc'), 3)
  assert.equal(bytesOf('你好'), 6)
  assert.equal(charsOf('你好'), 2)
  assert.equal(bytesOf(''), 0)
  assert.equal(charsOf(''), 0)
})

test('bytesOf/charsOf: 代理对（emoji）按 4 字节 1 码点计', async () => {
  assert.equal(bytesOf('😀'), 4)
  assert.equal(charsOf('😀'), 1)
  assert.equal(charsOf('😀😀'), 2)
  assert.equal(bytesOf('😀😀'), 8)
})

// ── truncateBytes ───────────────────────────────────────────────────────────

test('truncateBytes: 预算内原样返回', async () => {
  assert.equal(truncateBytes('abc', 10), 'abc')
  assert.equal(truncateBytes('', 5), '')
})

test('truncateBytes: 超预算时以省略号收尾且字节数不超预算', async () => {
  const out = truncateBytes('你好世界你好世界', 10)
  assert.ok(out.endsWith('…'))
  assert.ok(bytesOf(out) <= 10, `${bytesOf(out)}B 超预算`)
  assert.equal(out, '你好…')
})

test('truncateBytes: 不劈开代理对', async () => {
  const out = truncateBytes('😀'.repeat(10), 12)
  assert.equal(out, '😀😀…')
  assert.equal([...out].length, 3)
})

test('truncateBytes: null/undefined 容错为空串', async () => {
  assert.equal(truncateBytes(null, 10), '')
  assert.equal(truncateBytes(undefined, 10), '')
})

// ── parseNamingTypes / placeholderTypeOf ───────────────────────────────────

test('parseNamingTypes: 留空回落十类内置词表', async () => {
  assert.deepEqual(parseNamingTypes(''), TYPES)
  assert.deepEqual(parseNamingTypes('   '), TYPES)
  assert.deepEqual(parseNamingTypes(null), TYPES)
  assert.deepEqual(parseNamingTypes(42), TYPES)
})

test('parseNamingTypes: 半角/全角逗号都分隔并去空格', async () => {
  assert.deepEqual(parseNamingTypes('功能,修复'), ['功能', '修复'])
  assert.deepEqual(parseNamingTypes('功能，修复'), ['功能', '修复'])
  assert.deepEqual(parseNamingTypes(' 功能 , 修复 ， 发布 '), ['功能', '修复', '发布'])
})

test('parseNamingTypes: 去重但保留首次出现顺序', async () => {
  assert.deepEqual(parseNamingTypes('修复,功能,修复,功能,设计'), ['修复', '功能', '设计'])
})

test('parseNamingTypes: 丢弃含分隔符/半角竖线/空白的条目', async () => {
  assert.deepEqual(parseNamingTypes('功能,a｜b,c|d,有 空,修复'), ['功能', '修复'])
})

test('parseNamingTypes: 全部非法时回落十类内置词表', async () => {
  assert.deepEqual(parseNamingTypes('｜,|, ,a｜b'), TYPES)
})

test('placeholderTypeOf: 有「探索」用探索，否则用词表首项', async () => {
  assert.equal(placeholderTypeOf(TYPES), '探索')
  assert.equal(placeholderTypeOf(['功能', '探索']), '探索')
  assert.equal(placeholderTypeOf(['功能', '设计']), '功能')
})

// ── acceptTitle：校验并重建规范标题 ─────────────────────────────────────────

const titleExpect = (over = {}) => ({
  mmdd: '0114',
  types: TYPES,
  topicMaxChars: 20,
  projects: [],
  ...over
})
const jsonTitle = (title) => JSON.stringify({ title })

test('acceptTitle: 合法标题原样重建成规范串', async () => {
  assert.equal(acceptTitle(jsonTitle('0114｜功能｜实现登录'), titleExpect()), '0114｜功能｜实现登录')
  // 主题两端空白被裁掉，重建结果才是唯一规范形
  assert.equal(acceptTitle(jsonTitle('0114｜功能｜  实现登录  '), titleExpect()), '0114｜功能｜实现登录')
})

test('acceptTitle: 拒绝代码围栏', async () => {
  assert.throws(
    () => acceptTitle('```json\n{"title":"0114｜功能｜x"}\n```', titleExpect()),
    /code fence/u
  )
})

test('acceptTitle: 拒绝非 JSON 文本', async () => {
  assert.throws(() => acceptTitle('0114｜功能｜实现登录', titleExpect()), /strict JSON/u)
  assert.throws(() => acceptTitle('', titleExpect()), /no text/u)
  assert.throws(() => acceptTitle(null, titleExpect()), /no text/u)
})

test('acceptTitle: 拒绝 JSON 数组与 null', async () => {
  assert.throws(() => acceptTitle('[]', titleExpect()), /non-object JSON/u)
  assert.throws(() => acceptTitle('[{"title":"x"}]', titleExpect()), /non-object JSON/u)
  assert.throws(() => acceptTitle('null', titleExpect()), /non-object JSON/u)
})

test('acceptTitle: 只允许唯一 title 键（多余键/缺键都拒绝）', async () => {
  assert.throws(
    () => acceptTitle(JSON.stringify({ title: '0114｜功能｜x', note: 1 }), titleExpect()),
    /only "title"/u
  )
  assert.throws(() => acceptTitle(JSON.stringify({ note: 1 }), titleExpect()), /only "title"/u)
  assert.throws(() => acceptTitle('{}', titleExpect()), /only "title"/u)
})

test('acceptTitle: title:null → 模型放弃命名，抛错', async () => {
  assert.throws(() => acceptTitle(jsonTitle(null), titleExpect()), /declined/u)
})

test('acceptTitle: 非字符串 title 抛错', async () => {
  assert.throws(() => acceptTitle(JSON.stringify({ title: 5 }), titleExpect()), /must be a string/u)
  assert.throws(() => acceptTitle(JSON.stringify({ title: { a: 1 } }), titleExpect()), /must be a string/u)
})

test('acceptTitle: 控制字符与换行一律拒绝（必须单行）', async () => {
  assert.throws(() => acceptTitle(jsonTitle('0114｜功能｜a\nb'), titleExpect()), /control-free line/u)
  assert.throws(() => acceptTitle(jsonTitle('0114｜功能｜a\rb'), titleExpect()), /control-free line/u)
  assert.throws(() => acceptTitle(jsonTitle('0114｜功能｜a\u0001b'), titleExpect()), /control-free line/u)
})

test('acceptTitle: 半角竖线拼出的标题形状不成立（分隔符必须全角）', async () => {
  assert.throws(() => acceptTitle(jsonTitle('0114|功能|实现登录'), titleExpect()), /full-width separators/u)
})

test('acceptTitle: MMDD 与 createdAt 推导值不符 → 拒绝', async () => {
  assert.throws(() => acceptTitle(jsonTitle('0113｜功能｜实现登录'), titleExpect()), /does not match/u)
  assert.throws(() => acceptTitle(jsonTitle('0114｜功能｜实现登录'), titleExpect({ mmdd: '0115' })), /does not match/u)
})

test('acceptTitle: 类型不在白名单 → 拒绝', async () => {
  assert.throws(() => acceptTitle(jsonTitle('0114｜别的｜实现登录'), titleExpect()), /outside the allowed types/u)
  // 自定义词表生效
  assert.throws(
    () => acceptTitle(jsonTitle('0114｜功能｜实现登录'), titleExpect({ types: ['修复'] })),
    /outside the allowed types/u
  )
  assert.equal(
    acceptTitle(jsonTitle('0114｜修复｜实现登录'), titleExpect({ types: ['修复'] })),
    '0114｜修复｜实现登录'
  )
})

test('acceptTitle: 空主题 → 拒绝', async () => {
  assert.throws(() => acceptTitle(jsonTitle('0114｜功能｜   '), titleExpect()), /topic is empty/u)
})

test('acceptTitle: 主题含全角或半角分隔符 → 拒绝', async () => {
  assert.throws(() => acceptTitle(jsonTitle('0114｜功能｜a｜b'), titleExpect()), /must not contain a separator/u)
  assert.throws(() => acceptTitle(jsonTitle('0114｜功能｜a|b'), titleExpect()), /must not contain a separator/u)
})

test('acceptTitle: 主题超 topicMaxChars（按码点计）→ 拒绝；正好等于上限通过', async () => {
  assert.equal(
    acceptTitle(jsonTitle(`0114｜功能｜${'字'.repeat(20)}`), titleExpect()),
    `0114｜功能｜${'字'.repeat(20)}`
  )
  assert.throws(
    () => acceptTitle(jsonTitle(`0114｜功能｜${'字'.repeat(21)}`), titleExpect()),
    /21 characters, over 20/u
  )
})

test('acceptTitle: 主题重复项目名 → 拒绝（比较时忽略大小写与分隔符）', async () => {
  assert.throws(
    () => acceptTitle(jsonTitle('0114｜功能｜dsh-smart-title'), titleExpect({ projects: ['dsh-smart-title'] })),
    /repeats the project name/u
  )
  assert.throws(
    () => acceptTitle(jsonTitle('0114｜功能｜DSH_Smart Title'), titleExpect({ projects: ['dsh-smart-title'] })),
    /repeats the project name/u
  )
})

test('acceptTitle: 短于 4 个字符的项目名不触发重复拒绝', async () => {
  assert.equal(
    acceptTitle(jsonTitle('0114｜功能｜dsh 目标'), titleExpect({ projects: ['dsh'] })),
    '0114｜功能｜dsh 目标'
  )
})

test('acceptTitle: 主题字节超 MAX_TOPIC_BYTES → 拒绝', async () => {
  assert.throws(
    () => acceptTitle(jsonTitle(`0114｜功能｜${'字'.repeat(21)}`), titleExpect({ topicMaxChars: 64 })),
    /over 60/u
  )
})

test('acceptTitle: 整标题字节超 MAX_TITLE_BYTES → 拒绝', async () => {
  const longType = '超长类型名称超长类型名称'
  assert.throws(
    () => acceptTitle(jsonTitle(`0114｜${longType}｜${'字'.repeat(12)}`), titleExpect({ types: [longType], topicMaxChars: 64 })),
    /over 76/u
  )
})

// ── isCompliantTitle ───────────────────────────────────────────────────────

test('isCompliantTitle: 完整合规才为真', async () => {
  assert.equal(isCompliantTitle('0114｜功能｜实现登录', '0114', TYPES), true)
  assert.equal(isCompliantTitle('0114｜探索｜会话记录', '0114', TYPES), true)
})

test('isCompliantTitle: 日期不符 / 类型不合法 / 形状不对 → false', async () => {
  assert.equal(isCompliantTitle('0113｜功能｜实现登录', '0114', TYPES), false)
  assert.equal(isCompliantTitle('0114｜别的｜实现登录', '0114', TYPES), false)
  assert.equal(isCompliantTitle('0114|功能|实现登录', '0114', TYPES), false)
  assert.equal(isCompliantTitle('0114｜功能｜   ', '0114', TYPES), false)
  assert.equal(isCompliantTitle('随便一个标题', '0114', TYPES), false)
})

test('isCompliantTitle: 非字符串/自定义词表', async () => {
  assert.equal(isCompliantTitle(null, '0114', TYPES), false)
  assert.equal(isCompliantTitle(42, '0114', TYPES), false)
  assert.equal(isCompliantTitle('0114｜发布｜上线', '0114', ['发布']), true)
  assert.equal(isCompliantTitle('0114｜发布｜上线', '0114', ['功能']), false)
})

// ── comparableName ─────────────────────────────────────────────────────────

test('comparableName: 小写并去掉空白/下划线/连字符/点/中点', async () => {
  assert.equal(comparableName('DSH_Smart-Title.v2'), 'dshsmarttitlev2')
  assert.equal(comparableName('  dsh smart  '), 'dshsmart')
  assert.equal(comparableName(null), '')
})

// ── acceptPlainTitle（format=plain 老行为）──────────────────────────────────

const plainCfg = { targetWords: 8, targetCjkCharacters: 20 }

test('acceptPlainTitle: 剥离代码围栏、取首个非空行', async () => {
  assert.equal(acceptPlainTitle('```text\n修复登录 bug\n```', plainCfg), '修复登录 bug')
  assert.equal(acceptPlainTitle('\n\n  第二行才是标题  \n第三行', plainCfg), '第二行才是标题')
})

test('acceptPlainTitle: 剥离 Title:/标题：前缀与包裹引号', async () => {
  assert.equal(acceptPlainTitle('Title: Fix login bug', plainCfg), 'Fix login bug')
  assert.equal(acceptPlainTitle('标题：修复登录', plainCfg), '修复登录')
  assert.equal(acceptPlainTitle('“修复登录”', plainCfg), '修复登录')
  assert.equal(acceptPlainTitle('「修复登录」', plainCfg), '修复登录')
})

test('acceptPlainTitle: CJK 按 targetCjkCharacters 个码点截断', async () => {
  assert.equal(acceptPlainTitle('修复登录页面的验证码错误问题', { targetWords: 8, targetCjkCharacters: 6 }), '修复登录页面')
})

test('acceptPlainTitle: 非 CJK 按 targetWords 个词截断', async () => {
  assert.equal(acceptPlainTitle('one two three four five six', { targetWords: 4, targetCjkCharacters: 20 }), 'one two three four')
})

test('acceptPlainTitle: 空白输出/控制字符 → 抛错', async () => {
  assert.throws(() => acceptPlainTitle('   \n \n', plainCfg), /no usable text/u)
  assert.throws(() => acceptPlainTitle('', plainCfg), /no usable text/u)
  assert.throws(() => acceptPlainTitle(null, plainCfg), /no usable text/u)
  assert.throws(() => acceptPlainTitle('a\u0001b', plainCfg), /control-free/u)
})

test('acceptPlainTitle: 折叠内部空白', async () => {
  assert.equal(acceptPlainTitle('修复   登录\tbug', plainCfg), '修复 登录 bug')
})

// ── strictSystemPrompt ─────────────────────────────────────────────────────

test('strictSystemPrompt: 反射传入的类型词表、主题上限与全角分隔符', async () => {
  const prompt = strictSystemPrompt({}, ['功能', '修复'], 15)
  assert.equal(typeof prompt, 'string')
  assert.ok(prompt.includes('功能、修复'), '类型枚举必须来自参数')
  assert.ok(prompt.includes('这2个之一'))
  assert.ok(prompt.includes('不超过 15 个字符'))
  assert.ok(prompt.includes(SEPARATOR))
  assert.ok(prompt.includes('date_mmdd'))
})

test('strictSystemPrompt: 换一组参数就换一套枚举（不硬编码 TYPES）', async () => {
  const prompt = strictSystemPrompt({}, ['诊断'], 8)
  assert.ok(prompt.includes('诊断'))
  assert.ok(!prompt.includes('功能、'))
  assert.ok(prompt.includes('不超过 8 个字符'))
  assert.ok(prompt.includes('这1个之一'))
})

// ── foldTurns ──────────────────────────────────────────────────────────────

const userMsg = (text, seq = 1) => ({
  type: 'user/message',
  seq,
  data: { source: { kind: 'user' }, content: [{ type: 'text', text }] }
})
const assistantMsg = (text) => ({
  type: 'assistant/message',
  data: { message: { content: [{ type: 'text', text }] } }
})

test('foldTurns: turn/start 开轮、user/message 填提示词、turn/end 记录 reason', async () => {
  const folds = foldTurns([
    { type: 'turn/start', data: { turn: 1 } },
    userMsg('第一轮提示'),
    assistantMsg('第一轮产出'),
    { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } }
  ])
  assert.equal(folds.turns.length, 1)
  assert.deepEqual(folds.turns[0], { n: 1, prompt: '第一轮提示', outcome: '第一轮产出', end: 'completed' })
})

test('foldTurns: 早于 turn/start 的用户消息被带入下一轮', async () => {
  const folds = foldTurns([userMsg('早到的提示'), { type: 'turn/start', data: { turn: 1 } }])
  assert.equal(folds.turns.length, 1)
  assert.equal(folds.turns[0].prompt, '早到的提示')
})

test('foldTurns: 同一轮只取第一条提示词', async () => {
  const folds = foldTurns([
    { type: 'turn/start', data: { turn: 1 } },
    userMsg('第一条'),
    userMsg('第二条')
  ])
  assert.equal(folds.turns[0].prompt, '第一条')
})

test('foldTurns: 助手产出取该轮最后一条（早的会被覆盖）', async () => {
  const folds = foldTurns([
    { type: 'turn/start', data: { turn: 1 } },
    assistantMsg('早期草稿'),
    assistantMsg('最终产出')
  ])
  assert.equal(folds.turns[0].outcome, '最终产出')
})

test('foldTurns: 非 user 来源的 user/message 不算提示词', async () => {
  const folds = foldTurns([
    { type: 'turn/start', data: { turn: 1 } },
    { type: 'user/message', seq: 1, data: { source: { kind: 'assistant' }, content: [{ type: 'text', text: 'x' }] } }
  ])
  assert.equal(folds.turns[0].prompt, '')
})

test('foldTurns: tool/call 计数进 tools Map', async () => {
  const folds = foldTurns([
    { type: 'turn/start', data: { turn: 1 } },
    { type: 'tool/call', data: { name: 'read' } },
    { type: 'tool/call', data: { name: 'read' } },
    { type: 'tool/call', data: { name: 'grep' } },
    { type: 'tool/call', data: {} } // 无名工具忽略
  ])
  assert.ok(folds.tools instanceof Map)
  assert.equal(folds.tools.get('read'), 2)
  assert.equal(folds.tools.get('grep'), 1)
  assert.equal(folds.tools.size, 2)
})

test('foldTurns: 忽略未知事件类型与 null/垃圾条目', async () => {
  const folds = foldTurns([
    null,
    'garbage',
    42,
    { type: 'sandbox/mode', data: {} },
    { type: 'nope' },
    { type: 'turn/start', data: { turn: 1 } }
  ])
  assert.equal(folds.turns.length, 1)
  assert.equal(folds.turns[0].n, 1)
})

test('foldTurns: 空数组/非数组 → 空轮次与空工具表', async () => {
  for (const input of [[], null, undefined, 'x']) {
    const folds = foldTurns(input)
    assert.deepEqual(folds.turns, [])
    assert.equal(folds.tools.size, 0)
  }
})

test('foldTurns: 多轮、未结束的轮次 end 为 null', async () => {
  const folds = foldTurns([
    { type: 'turn/start', data: { turn: 1 } },
    assistantMsg('一'),
    { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
    { type: 'turn/start', data: { turn: 2 } },
    userMsg('第二轮', 2),
    assistantMsg('二')
  ])
  assert.equal(folds.turns.length, 2)
  assert.equal(folds.turns[1].end, null)
  assert.equal(folds.turns[1].prompt, '第二轮')
})

// ── textOfContent / toolSummary / titleStateOf ─────────────────────────────

test('textOfContent: 保留换行，只取 text 块', async () => {
  assert.equal(
    textOfContent([
      { type: 'text', text: 'a\nb' },
      { type: 'reasoning', text: 'think' },
      { type: 'text', text: 'c' }
    ]),
    'a\nb\nc'
  )
  assert.equal(textOfContent(undefined), '')
  assert.equal(textOfContent([]), '')
})

test('toolSummary: Map → namexcount 字符串数组', async () => {
  const map = new Map([['read', 2], ['grep', 1]])
  assert.deepEqual(toolSummary(map), ['readx2', 'grepx1'])
  assert.deepEqual(toolSummary(null), [])
  assert.deepEqual(toolSummary({}), [])
  assert.deepEqual(toolSummary(new Map()), [])
})

test('titleStateOf: 取最后一条 session/title 的 title+source', async () => {
  const state = titleStateOf([
    { type: 'session/title', data: { title: '旧', source: { kind: 'user' } } },
    { type: 'session/title', data: { title: '新', source: { kind: 'provider' } } }
  ])
  assert.deepEqual(state, { title: '新', source: { kind: 'provider' } })
})

test('titleStateOf: 没有 title 事件 / 非数组 → undefined', async () => {
  assert.equal(titleStateOf([{ type: 'turn/start', data: {} }]), undefined)
  assert.equal(titleStateOf([]), undefined)
  assert.equal(titleStateOf(null), undefined)
})

// ── firstTurnData ──────────────────────────────────────────────────────────

const foldOf = (events) => foldTurns(events)

test('firstTurnData: 首轮已完成有产出 → scope=first_turn 摘要', async () => {
  const folds = foldOf([
    { type: 'turn/start', data: { turn: 1 } },
    userMsg('帮我修标题', 1),
    { type: 'tool/call', data: { name: 'read' } },
    assistantMsg('已修复'),
    { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } }
  ])
  const data = firstTurnData(folds, '0114', ['dsh-smart-title'])
  assert.equal(data.scope, 'first_turn')
  assert.equal(data.date_mmdd, '0114')
  assert.equal(data.project_name, 'dsh-smart-title')
  assert.equal(data.turn_count, 1)
  assert.equal(data.first_user_message, '帮我修标题')
  assert.equal(data.assistant_final_message, '已修复')
  assert.deepEqual(data.tools_used, ['readx1'])
})

test('firstTurnData: 没有第 1 轮 → 抛错', async () => {
  const folds = foldOf([{ type: 'turn/start', data: { turn: 2 } }])
  assert.throws(() => firstTurnData(folds, '0114', []), /no first turn/u)
  assert.throws(() => firstTurnData(foldOf([]), '0114', []), /no first turn/u)
})

test('firstTurnData: 首轮不是 completed → 抛错', async () => {
  const folds = foldOf([
    { type: 'turn/start', data: { turn: 1 } },
    assistantMsg('半成品'),
    { type: 'turn/end', data: { turn: 1, reason: { kind: 'interrupted' } } }
  ])
  assert.throws(() => firstTurnData(folds, '0114', []), /ended as "interrupted"/u)
})

test('firstTurnData: 首轮没有助手产出 → 抛错', async () => {
  const folds = foldOf([
    { type: 'turn/start', data: { turn: 1 } },
    userMsg('只有问题', 1),
    { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } }
  ])
  assert.throws(() => firstTurnData(folds, '0114', []), /no assistant work/u)
})

// ── conversationData ──────────────────────────────────────────────────────

function longFolds(count) {
  const events = []
  for (let n = 1; n <= count; n += 1) {
    events.push({ type: 'turn/start', data: { turn: n } })
    events.push(userMsg(`提示${n}`, n))
    events.push(assistantMsg('产出'.repeat(30)))
    events.push({ type: 'turn/end', data: { turn: n, reason: { kind: 'completed' } } })
  }
  return foldOf(events)
}

test('conversationData: scope=whole_conversation 且带 last_turn_end', async () => {
  const data = conversationData(longFolds(3), '0114', ['proj'], 6000)
  assert.equal(data.scope, 'whole_conversation')
  assert.equal(data.date_mmdd, '0114')
  assert.equal(data.project_name, 'proj')
  assert.equal(data.turn_count, 3)
  assert.equal(data.last_turn_end, 'completed')
  assert.equal(data.first_user_message, '提示1')
  assert.equal(data.turns.length, 3)
})

test('conversationData: 预算收紧时保留首轮与靠后的轮次，中段被丢弃', async () => {
  const data = conversationData(longFolds(12), '0114', [], 1000)
  assert.equal(data.turns[0].n, 1, '首轮必须保留（开场意图锚点）')
  assert.equal(data.turns.at(-1).n, 12, '末端轮次必须保留')
  assert.ok(data.turns.length < 12, `预算 1000 时应丢轮次，实得 ${data.turns.length}`)
  assert.ok(data.turns.some((turn) => turn.n > 1 && turn.n < 12))
})

test('conversationData: 小于 512 的预算回落到默认 6000（不饿死摘要）', async () => {
  const data = conversationData(longFolds(12), '0114', [], 100)
  assert.equal(data.turns.length, 12)
})

test('conversationData: 没有 end 的轮次 end 记为 open', async () => {
  const folds = foldOf([
    { type: 'turn/start', data: { turn: 1 } },
    userMsg('中断的轮次', 1),
    assistantMsg('部分产出')
  ])
  const data = conversationData(folds, '0114', [], 6000)
  assert.equal(data.turns[0].end, 'open')
  assert.equal(data.last_turn_end, 'open')
})

test('conversationData: 无轮次 / 全部没有产出 → 抛错', async () => {
  assert.throws(() => conversationData(foldOf([]), '0114', [], 6000), /no turns/u)
  const noWork = foldOf([{ type: 'turn/start', data: { turn: 1 } }, userMsg('只有问题', 1)])
  assert.throws(() => conversationData(noWork, '0114', [], 6000), /no assistant work/u)
})

// ── digestOf ──────────────────────────────────────────────────────────────

test('digestOf: 首轮 completed 且有产出 → 用 first_turn', async () => {
  const folds = longFolds(3)
  assert.equal(digestOf(folds, '0114', [], 6000).scope, 'first_turn')
})

test('digestOf: 首轮未完成/无产出 → 退回整段对话', async () => {
  const folds = foldOf([
    { type: 'turn/start', data: { turn: 1 } },
    userMsg('初问', 1),
    { type: 'turn/end', data: { turn: 1, reason: { kind: 'interrupted' } } },
    { type: 'turn/start', data: { turn: 2 } },
    userMsg('再问', 2),
    assistantMsg('后来的产出'),
    { type: 'turn/end', data: { turn: 2, reason: { kind: 'completed' } } }
  ])
  assert.equal(digestOf(folds, '0114', [], 6000).scope, 'whole_conversation')
})

// ── ownEventsOf ───────────────────────────────────────────────────────────

test('ownEventsOf: 有 ownEvents() 访问器时优先使用', async () => {
  const own = [{ seq: 9, type: 'x' }]
  const events = [{ seq: 1 }, { seq: 9 }]
  assert.deepEqual(ownEventsOf({ ownEvents: () => own }, events), own)
})

test('ownEventsOf: 无访问器时按 inheritedEventCount 过滤 seq', async () => {
  const events = [{ seq: 1 }, { seq: 3 }, { seq: 5 }]
  assert.deepEqual(ownEventsOf({ inheritedEventCount: 3 }, events), [{ seq: 3 }, { seq: 5 }])
})

test('ownEventsOf: inheritedEventCount 为 0/缺失/非数字 → 全量返回', async () => {
  const events = [{ seq: 1 }, { seq: 2 }]
  assert.equal(ownEventsOf({ inheritedEventCount: 0 }, events).length, 2)
  assert.equal(ownEventsOf({}, events).length, 2)
  assert.equal(ownEventsOf({ inheritedEventCount: 'x' }, events).length, 2)
})

test('ownEventsOf: 访问器抛错时回退，并容忍缺参', async () => {
  const events = [{ seq: 1 }, { seq: 2 }]
  const session = { inheritedEventCount: 2, ownEvents: () => { throw new Error('boom') } }
  assert.deepEqual(ownEventsOf(session, events), [{ seq: 2 }])
  assert.equal(ownEventsOf({ events }).length, 2)
  assert.deepEqual(ownEventsOf({}, null), [])
})

// ── fallbackTitleOf（确定性占位标题）───────────────────────────────────────

test('fallbackTitleOf: 确定性、用占位类型、首行前 12 字、产物合规', async () => {
  const prompt = '修复登录 | 校验码 bug\n第二行不该出现'
  const a = fallbackTitleOf('0114', prompt, [], TYPES, 20)
  const b = fallbackTitleOf('0114', prompt, [], TYPES, 20)
  assert.equal(a, b, '必须是确定性的')
  // 半角竖线被换成空格后空白折叠，但原有的分隔空格保留
  assert.equal(a, '0114｜探索｜修复登录 校验码 bug')
  assert.equal(isCompliantTitle(a, '0114', TYPES), true)
  assert.ok(!a.includes('第二行'))
})

test('fallbackTitleOf: 空提示词仍产出合规标题（会话记录兜底）', async () => {
  const out = fallbackTitleOf('0114', '', [], TYPES, 20)
  assert.equal(out, '0114｜探索｜会话记录')
  assert.equal(isCompliantTitle(out, '0114', TYPES), true)
})

test('fallbackTitleOf: 提示词只有分隔符也走兜底', async () => {
  const out = fallbackTitleOf('0114', '｜｜｜|', [], TYPES, 20)
  assert.equal(out, '0114｜探索｜会话记录')
})

test('fallbackTitleOf: 前 12 字重复项目名时降级到会话记录（不产出违规标题）', async () => {
  const out = fallbackTitleOf('0114', 'dshsm 重构登录', ['dshsm'], TYPES, 20)
  assert.equal(out, '0114｜探索｜会话记录')
})

test('fallbackTitleOf: 自定义词表没有「探索」时用词表首项', async () => {
  const out = fallbackTitleOf('0114', '随便写点什么', [], ['功能', '设计'], 20)
  assert.equal(out, '0114｜功能｜随便写点什么')
  assert.equal(isCompliantTitle(out, '0114', ['功能', '设计']), true)
})

test('fallbackTitleOf: 主题超过 topicMaxChars 时被 12 字切短后仍合规', async () => {
  const out = fallbackTitleOf('0114', '一二三四五六七八九十甲乙丙丁戊己庚辛', [], TYPES, 8)
  assert.equal(isCompliantTitle(out, '0114', TYPES), true)
  const topic = out.split(SEPARATOR)[2]
  assert.ok(charsOf(topic) <= 8, `主题 ${charsOf(topic)} 字超过 8`)
})

// ── looksLikePlaceholder ──────────────────────────────────────────────────

test('looksLikePlaceholder: 占位形状为真，其它类型为假', async () => {
  assert.equal(looksLikePlaceholder('0114｜探索｜帮我写个插件', '0114', TYPES), true)
  assert.equal(looksLikePlaceholder(fallbackTitleOf('0114', '帮我写个插件', [], TYPES, 20), '0114', TYPES), true)
  assert.equal(looksLikePlaceholder('0114｜功能｜实现登录', '0114', TYPES), false)
  assert.equal(looksLikePlaceholder('0115｜探索｜实现登录', '0114', TYPES), false)
})

test('looksLikePlaceholder: 非字符串/空词表容错', async () => {
  assert.equal(looksLikePlaceholder(null, '0114', TYPES), false)
  assert.equal(looksLikePlaceholder(undefined, '0114', TYPES), false)
  assert.equal(looksLikePlaceholder('0114｜功能｜x', '0114', []), false)
})

// ── fork 分支 ─────────────────────────────────────────────────────────────

const forkHeader = () => ({ isSeeded: true, parentSession: 'parent-1' })
const titleEvent = (title, kind = 'user') => ({ type: 'session/title', data: { title, source: { kind } } })

test('forkSuffixOf: 识别半角与全角的分支计数尾巴', async () => {
  assert.equal(forkSuffixOf('0114｜探索｜主题 (2)'), ' (2)')
  assert.equal(forkSuffixOf('0114｜探索｜主题（12）'), '（12）')
  assert.equal(forkSuffixOf('0114｜探索｜主题 (12)'), ' (12)')
})

test('forkSuffixOf: 没有尾巴或非字符串 → null', async () => {
  assert.equal(forkSuffixOf('0114｜探索｜主题'), null)
  assert.equal(forkSuffixOf('0114｜探索｜主题 (x)'), null)
  assert.equal(forkSuffixOf(null), null)
  assert.equal(forkSuffixOf(42), null)
})

test('withForkSuffix: 追加分支计数', async () => {
  assert.equal(withForkSuffix('0114｜探索｜主题', '（2）'), '0114｜探索｜主题（2）')
  assert.equal(withForkSuffix('0114｜探索｜主题', ' (3)'), '0114｜探索｜主题 (3)')
})

test('withForkSuffix: 已有不同计数时替换而不是叠加', async () => {
  assert.equal(withForkSuffix('0114｜探索｜主题（3）', '（2）'), '0114｜探索｜主题（2）')
})

test('withForkSuffix: 计数相同则原样返回', async () => {
  const title = '0114｜探索｜主题（2）'
  assert.equal(withForkSuffix(title, '（2）'), title)
})

test('withForkSuffix: 主题让出字节，结果不超 MAX_TITLE_BYTES', async () => {
  const title = `0114｜探索｜${'主'.repeat(30)}`
  const out = withForkSuffix(title, '（12）')
  assert.ok(bytesOf(out) <= MAX_TITLE_BYTES, `${bytesOf(out)}B 超预算`)
  assert.ok(out.endsWith('（12）'))
  assert.ok(charsOf(out.split(SEPARATOR)[2]) < 30, '主题应被截短让位')
})

test('withForkSuffix: null 计数/非字符串标题/无分隔符 → 原样返回', async () => {
  assert.equal(withForkSuffix('0114｜探索｜主题', null), '0114｜探索｜主题')
  assert.equal(withForkSuffix('0114｜探索｜主题', undefined), '0114｜探索｜主题')
  assert.equal(withForkSuffix(42, '（2）'), 42)
  assert.equal(withForkSuffix('nosep', '（2）'), 'nosep')
})

test('isConversationSession: 子代理不是「对话」，其余都是', async () => {
  assert.equal(isConversationSession({}), true)
  assert.equal(isConversationSession({ origin: 'subagent' }), false)
  assert.equal(isConversationSession({ origin: 'user' }), true)
  assert.equal(isConversationSession(undefined), true)
})

test('isForkedConversation: 需要 isSeeded===true 且有 parentSession', async () => {
  assert.equal(isForkedConversation(forkHeader()), true)
  assert.equal(isForkedConversation({ isSeeded: true }), false)
  assert.equal(isForkedConversation({ parentSession: 'p' }), false)
  assert.equal(isForkedConversation({ isSeeded: false, parentSession: 'p' }), false)
  assert.equal(isForkedConversation(undefined), false)
})

test('isForkedConversation: 子代理运行即使有 parentSession 也不算 fork', async () => {
  assert.equal(isForkedConversation({ isSeeded: true, parentSession: 'p', origin: 'subagent' }), false)
})

// ── shouldUpgradeForkTitle ────────────────────────────────────────────────

test('shouldUpgradeForkTitle: fork + 恰好一条 user 来源带计数的标题 → true', async () => {
  const own = [titleEvent('0114｜探索｜父任务（2）', 'user')]
  assert.equal(shouldUpgradeForkTitle(forkHeader(), own, DEFAULTS), true)
})

test('shouldUpgradeForkTitle: 零条或两条标题事件 → false', async () => {
  assert.equal(shouldUpgradeForkTitle(forkHeader(), [], DEFAULTS), false)
  assert.equal(
    shouldUpgradeForkTitle(forkHeader(), [titleEvent('a（2）'), titleEvent('b（2）')], DEFAULTS),
    false
  )
})

test('shouldUpgradeForkTitle: provider 来源的标题 → false（第一次升级已经完成）', async () => {
  assert.equal(
    shouldUpgradeForkTitle(forkHeader(), [titleEvent('0114｜探索｜主题（2）', 'provider')], DEFAULTS),
    false
  )
})

test('shouldUpgradeForkTitle: 非 fork header → false', async () => {
  assert.equal(shouldUpgradeForkTitle({}, [titleEvent('a（2）', 'user')], DEFAULTS), false)
  assert.equal(shouldUpgradeForkTitle(undefined, [titleEvent('a（2）', 'user')], DEFAULTS), false)
})

test('shouldUpgradeForkTitle: 标题没有分支计数 → false', async () => {
  assert.equal(shouldUpgradeForkTitle(forkHeader(), [titleEvent('0114｜探索｜主题', 'user')], DEFAULTS), false)
})

test('shouldUpgradeForkTitle: upgradeForkTitles=false → false', async () => {
  assert.equal(
    shouldUpgradeForkTitle(forkHeader(), [titleEvent('a（2）', 'user')], { ...DEFAULTS, upgradeForkTitles: false }),
    false
  )
})

test('shouldUpgradeForkTitle: excludeForks=true → false（两者互斥）', async () => {
  assert.equal(
    shouldUpgradeForkTitle(forkHeader(), [titleEvent('a（2）', 'user')], { ...DEFAULTS, excludeForks: true }),
    false
  )
})

// ── reasonKind ─────────────────────────────────────────────────────────────

test('reasonKind: {kind:"completed"} → completed', async () => {
  assert.equal(reasonKind({ kind: 'completed' }), 'completed')
})

test('reasonKind: {kind:"error",...} → error；裸字符串容忍', async () => {
  assert.equal(reasonKind({ kind: 'error', error: {} }), 'error')
  assert.equal(reasonKind('interrupted'), 'interrupted')
})

test('reasonKind: null/undefined/异形 → undefined', async () => {
  assert.equal(reasonKind(null), undefined)
  assert.equal(reasonKind(undefined), undefined)
  assert.equal(reasonKind(42), undefined)
  assert.equal(reasonKind({}), undefined)
})

// ── 会话排除 ──────────────────────────────────────────────────────────────

const cfg = (over = {}) => ({ ...DEFAULTS, ...over })

test('isExcluded: 子代理会话按 header.origin 排除', async () => {
  assert.equal(isExcluded({ id: 'session-1', header: { origin: 'subagent' } }, cfg()), true)
})

test('isExcluded: fork 子会话仅在 excludeForks 开启时排除', async () => {
  const s = { id: 'session-2', header: { parentSession: 'p1', isSeeded: true } }
  assert.equal(isExcluded(s, cfg({ excludeForks: true })), true)
  assert.equal(isExcluded(s, cfg({ excludeForks: false })), false)
  // 默认配置就是「不排除 fork」
  assert.equal(isExcluded(s, cfg()), false)
})

test('isExcluded: id 前缀命中排除（前缀表逗号分隔、去空格）', async () => {
  const s = { id: 'hermes-loop-review-abc', header: {} }
  assert.equal(isExcluded(s, cfg({ excludeIdPrefixes: 'hermes-loop-review-, review-' })), true)
  assert.equal(isExcluded(s, cfg({ excludeIdPrefixes: 'other-' })), false)
})

test('isExcluded: 正常会话不排除；无 id/无会话排除', async () => {
  assert.equal(isExcluded({ id: 'session-x', header: {} }, cfg()), false)
  assert.equal(isExcluded({ header: {} }, cfg()), true)
  assert.equal(isExcluded({ id: '', header: {} }, cfg()), true)
  assert.equal(isExcluded(null, cfg()), true)
})

test('parseIdPrefixes: 逗号分隔、去空格、丢空项、非字符串回空', async () => {
  assert.deepEqual(parseIdPrefixes(' a- , b- ,, c- '), ['a-', 'b-', 'c-'])
  assert.deepEqual(parseIdPrefixes(''), [])
  assert.deepEqual(parseIdPrefixes(null), [])
  assert.deepEqual(parseIdPrefixes(42), [])
})

// ── 用户钉住 ──────────────────────────────────────────────────────────────

test('isUserPinned: source.kind=user → true；其余 → false', async () => {
  assert.equal(isUserPinned({ source: { kind: 'user' } }), true)
  assert.equal(isUserPinned({ source: { kind: 'fallback' } }), false)
  assert.equal(isUserPinned({ source: { kind: 'provider', provider: 'x' } }), false)
  assert.equal(isUserPinned(undefined), false)
  assert.equal(isUserPinned({}), false)
})

// ── 文本抽取 ──────────────────────────────────────────────────────────────

test('messageText: 只取 text 块、空白折叠、跳过 reasoning/tool', async () => {
  const content = [
    { type: 'reasoning', text: 'let me think' },
    { type: 'text', text: '你好\n世界' },
    { type: 'tool-call', name: 'x' },
    { type: 'text', text: '  第二段 ' }
  ]
  assert.equal(messageText(content), '你好 世界 第二段')
})

test('messageText: 非数组/空/纯空白 → 空串', async () => {
  assert.equal(messageText(undefined), '')
  assert.equal(messageText([]), '')
  assert.equal(messageText([{ type: 'text', text: '   ' }]), '')
})

// ── 转写条目 ──────────────────────────────────────────────────────────────

const EVENTS = [
  { type: 'sandbox/mode', seq: 0, data: { mode: 'x' } },
  { type: 'user/message', seq: 7, data: { role: 'user', content: [{ type: 'text', text: '帮我修标题 bug' }] } },
  { type: 'assistant/message', seq: 8, data: { message: { content: [{ type: 'text', text: '好的，我来修' }] } } },
  { type: 'user/message', seq: 9, data: { role: 'user', content: [{ type: 'text', text: '继续' }] } },
  // 越出快照的用户消息（必须在 allowed 集之外）
  { type: 'user/message', seq: 10, data: { role: 'user', content: [{ type: 'text', text: '快照外消息' }] } },
  { type: 'assistant/message', seq: 11, data: { message: { content: [{ type: 'reasoning', text: 'think' }] } } }
]

test('extractTranscriptItems: user+assistant，seq 限定快照集，纯 reasoning 丢弃', async () => {
  const items = extractTranscriptItems(EVENTS, [7, 9], true)
  assert.deepEqual(items, [
    { role: 'user', seq: 7, text: '帮我修标题 bug' },
    { role: 'assistant', text: '好的，我来修' },
    { role: 'user', seq: 9, text: '继续' }
  ])
})

test('extractTranscriptItems: includeAssistant=false 时只剩用户消息', async () => {
  assert.deepEqual(extractTranscriptItems(EVENTS, [7, 9], false), [
    { role: 'user', seq: 7, text: '帮我修标题 bug' },
    { role: 'user', seq: 9, text: '继续' }
  ])
})

test('extractTranscriptItems: 非数组日志/非数字 seq/Set 形式的允许集', async () => {
  assert.deepEqual(extractTranscriptItems(undefined, [7], true), [])
  assert.deepEqual(extractTranscriptItems(EVENTS, new Set([9]), true), [
    { role: 'assistant', text: '好的，我来修' },
    { role: 'user', seq: 9, text: '继续' }
  ])
  assert.deepEqual(
    extractTranscriptItems([{ type: 'user/message', seq: '7', data: { content: [{ type: 'text', text: 'x' }] } }], [7], true),
    []
  )
})

// ── 字节裁剪 / 转写裁剪 ───────────────────────────────────────────────────

test('truncateTextUtf8: 不破码点地截断并加省略号', async () => {
  const out = truncateTextUtf8('你'.repeat(100), 20)
  assert.ok(bytesOf(out) <= 20)
  assert.ok(out.endsWith('…'))
})

test('truncateTextUtf8: 短文本原样返回', async () => {
  assert.equal(truncateTextUtf8('abc', 10), 'abc')
})

test('trimTranscript: 预算内全保留且顺序不变', async () => {
  const items = [
    { role: 'user', seq: 1, text: '第一个问题' },
    { role: 'assistant', text: '回答一' },
    { role: 'user', seq: 2, text: '第二个问题' }
  ]
  assert.deepEqual(trimTranscript(items, 10000), items)
})

test('trimTranscript: 超预算丢中间，保首条用户消息与最新尾部', async () => {
  const big = 'x'.repeat(900)
  const items = [
    { role: 'user', seq: 1, text: '第一个问题' },
    { role: 'assistant', text: big },
    { role: 'user', seq: 2, text: big },
    { role: 'assistant', text: big },
    { role: 'user', seq: 3, text: '最新问题' }
  ]
  const out = trimTranscript(items, 3000)
  const framed = frameTranscript(out)
  assert.ok(bytesOf(framed) <= 3000, `framed ${bytesOf(framed)}B 必须 ≤ 3000B`)
  assert.equal(out[0].role, 'user')
  assert.equal(out[0].seq, 1)
  assert.equal(out[out.length - 1].seq, 3)
})

test('trimTranscript: 单条巨大消息被硬截断后仍在预算内', async () => {
  const out = trimTranscript([{ role: 'user', seq: 1, text: 'y'.repeat(50000) }], 2000)
  assert.equal(out.length, 1)
  assert.ok(bytesOf(frameTranscript(out)) <= 2000)
})

test('trimTranscript: 空输入 → 空数组', async () => {
  assert.deepEqual(trimTranscript([], 1000), [])
  assert.deepEqual(trimTranscript(null, 1000), [])
})

// ── 封帧与提示词 ──────────────────────────────────────────────────────────

test('frameTranscript: 产出合法 JSON，user 条目带 seq、assistant 不带', async () => {
  const framed = frameTranscript([
    { role: 'user', seq: 7, text: '你好' },
    { role: 'assistant', text: '你好！' }
  ])
  const m = framed.match(/\[\s*[\s\S]*\]\s*$/u)
  assert.ok(m, '尾部必须是 JSON 数组')
  assert.deepEqual(JSON.parse(m[0]), [
    { role: 'user', seq: 7, text: '你好' },
    { role: 'assistant', text: '你好！' }
  ])
})

test('systemPrompt: 包含词数与 CJK 字符目标', async () => {
  const s = systemPrompt({ targetWords: 6, targetCjkCharacters: 12 })
  assert.ok(s.includes('6 words'))
  assert.ok(s.includes('12 CJK'))
})

// ── 路由覆盖 ──────────────────────────────────────────────────────────────

test('resolveRouteOverride: 成对生效、半配对视为未提供、空缺 undefined', async () => {
  assert.deepEqual(resolveRouteOverride('zhanlu', 'zhanlu/kimi-k3'), { provider: 'zhanlu', model: 'zhanlu/kimi-k3' })
  assert.equal(resolveRouteOverride('zhanlu', ''), null)
  assert.equal(resolveRouteOverride('', 'zhanlu/kimi-k3'), null)
  assert.equal(resolveRouteOverride('', ''), undefined)
  assert.equal(resolveRouteOverride(undefined, undefined), undefined)
})

test('resolveRouteOverride: 去首尾空格、非字符串视为空', async () => {
  assert.deepEqual(resolveRouteOverride(' p ', ' m '), { provider: 'p', model: 'm' })
  assert.equal(resolveRouteOverride(null, null), undefined)
  assert.equal(resolveRouteOverride(1, 2), undefined)
})

// ── 刷新节流 / 长会话冻结 / 同题抑制 ─────────────────────────────────────

test('normalizeTitle: 空值→空串、空白折叠、大小写归一', async () => {
  assert.equal(normalizeTitle(null), '')
  assert.equal(normalizeTitle(undefined), '')
  assert.equal(normalizeTitle('  '), '')
  assert.equal(normalizeTitle('  Fix   DSH Deps '), 'fix dsh deps')
})

test('isSameTitle: 空标题永不同题，大小写/空白差异算同题', async () => {
  assert.equal(isSameTitle('', 'x'), false)
  assert.equal(isSameTitle('  ', 'x'), false)
  assert.equal(isSameTitle('修复 DSH 依赖', '修复 dsh  依赖'), true)
  assert.equal(isSameTitle('修复依赖', '修复 依赖 bug'), false)
})

test('countUserTurns: 只数 user/message；snapshotEvents 优先；全缺席 → null', async () => {
  const events = [
    { type: 'user/message', seq: 1, data: {} },
    { type: 'assistant/message', seq: 2, data: {} },
    { type: 'user/message', seq: 3, data: {} },
    { type: 'turn/end', data: {} }
  ]
  assert.equal(countUserTurns({ id: 's', events }), 2)
  assert.equal(countUserTurns({ id: 's', snapshotEvents: () => events }), 2)
  assert.equal(countUserTurns({ id: 's', events: 'spilled', snapshotEvents: () => events }), 2)
  assert.equal(countUserTurns({ id: 's', events: 'spilled' }), null)
  assert.equal(countUserTurns({ id: 's' }), null)
  assert.equal(countUserTurns(null), null)
})

test('sessionEventsOf: snapshotEvents() 优先、异常吞掉、无访问器回退 events', async () => {
  const evs = [{ type: 'user/message', seq: 1 }]
  assert.equal(sessionEventsOf({ snapshotEvents: () => evs, events: 'spilled' }), evs)
  assert.equal(sessionEventsOf({ events: evs }), evs)
  assert.deepEqual(sessionEventsOf({ snapshotEvents: () => { throw new Error('boom') } }), [])
  assert.deepEqual(sessionEventsOf({ events: 'spilled' }), [])
  assert.deepEqual(sessionEventsOf(null), [])
})

test('isThrottled: 0=不节流、无记录放行、窗口内拦截、过期放行', async () => {
  assert.equal(isThrottled(undefined, 10000, 5000), false)
  assert.equal(isThrottled(9000, 10000, 5000), true)
  assert.equal(isThrottled(4999, 10000, 5000), false)
  assert.equal(isThrottled(0, 10000, 0), false)
})

test('isFrozen: 0=不限、未知轮数放行、超过 cap 冻结、等于 cap 不冻', async () => {
  assert.equal(isFrozen(5, 0), false)
  assert.equal(isFrozen(null, 100), false)
  assert.equal(isFrozen(3, 2), true)
  assert.equal(isFrozen(2, 2), false)
})

// ── sanitizePatch / safeSettings / settingsSchema ─────────────────────────

test('sanitizePatch: 布尔白名单、数字夹取、字符串去尾空、未知键丢弃', async () => {
  const patch = sanitizePatch({
    enabled: false,
    includeAssistant: 'yes', // 非布尔 → 丢弃
    refreshOnTurnEnd: true,
    targetWords: 999, // 夹到 50
    maxInputBytes: 10, // 夹到 512
    refreshMinIntervalMs: -5, // 夹到 0
    refreshMaxTurns: '50', // 数字串 → 50
    excludeIdPrefixes: ' a , b ',
    provider: 'p1',
    bogus: 'x'
  })
  assert.equal(patch.enabled, false)
  assert.equal(patch.includeAssistant, undefined)
  assert.equal(patch.refreshOnTurnEnd, true)
  assert.equal(patch.targetWords, 50)
  assert.equal(patch.maxInputBytes, 512)
  assert.equal(patch.refreshMinIntervalMs, 0)
  assert.equal(patch.refreshMaxTurns, 50)
  assert.equal(patch.excludeIdPrefixes, 'a , b')
  assert.equal(patch.bogus, undefined)
})

test('sanitizePatch: 新增的 11 个数字键都按 schema 范围夹取', async () => {
  const patch = sanitizePatch({
    topicMaxChars: 1, // → 2
    targetCjkCharacters: 999, // → 60
    maxOutputTokens: 1, // → 64
    timeoutMs: 999999999, // → 600000
    catchupWindowHours: -3, // → 0
    catchupMax: 999, // → 50
    catchupDelayMs: -1 // → 0
  })
  assert.equal(patch.topicMaxChars, 2)
  assert.equal(patch.targetCjkCharacters, 60)
  assert.equal(patch.maxOutputTokens, 64)
  assert.equal(patch.timeoutMs, 600000)
  assert.equal(patch.catchupWindowHours, 0)
  assert.equal(patch.catchupMax, 50)
  assert.equal(patch.catchupDelayMs, 0)
})

test('sanitizePatch: 新布尔键只收真布尔', async () => {
  const patch = sanitizePatch({
    placeholderOnFirstPrompt: false,
    upgradeForkTitles: false,
    excludeForks: true,
    catchupOnStart: 'true', // 字符串 → 丢弃
    adminTool: 1 // 数字 → 丢弃
  })
  assert.equal(patch.placeholderOnFirstPrompt, false)
  assert.equal(patch.upgradeForkTitles, false)
  assert.equal(patch.excludeForks, true)
  assert.equal(patch.catchupOnStart, undefined)
  assert.equal(patch.adminTool, undefined)
})

test('sanitizePatch: 非法 format 整键丢弃，合法值保留', async () => {
  assert.equal(sanitizePatch({ format: 'weird' }).format, undefined)
  assert.equal(sanitizePatch({ format: '' }).format, undefined)
  assert.equal(sanitizePatch({ format: 'plain' }).format, 'plain')
  assert.equal(sanitizePatch({ format: ' mmdd ' }).format, 'mmdd')
})

test('sanitizePatch: 非法 timeZone 整键丢弃，合法值保留', async () => {
  assert.equal(sanitizePatch({ timeZone: 'Nope/Zone' }).timeZone, undefined)
  assert.equal(sanitizePatch({ timeZone: '' }).timeZone, undefined)
  assert.equal(sanitizePatch({ timeZone: ' UTC ' }).timeZone, 'UTC')
  assert.equal(sanitizePatch({ timeZone: 'Asia/Tokyo' }).timeZone, 'Asia/Tokyo')
})

test('sanitizePatch: namingTypes 字符串收用（可清空）', async () => {
  assert.equal(sanitizePatch({ namingTypes: ' 功能,修复 ' }).namingTypes, '功能,修复')
  assert.equal(sanitizePatch({ namingTypes: '   ' }).namingTypes, '')
})

test('sanitizePatch: 路由半配对两边都丢弃，成对保留；非对象输入 → 空 patch', async () => {
  assert.equal(sanitizePatch({ provider: 'p1', model: '' }).provider, undefined)
  assert.equal(sanitizePatch({ provider: '', model: 'm1' }).model, undefined)
  assert.deepEqual(sanitizePatch({ provider: ' p1 ', model: ' m1 ' }), { provider: 'p1', model: 'm1' })
  assert.deepEqual(sanitizePatch(null), {})
  assert.deepEqual(sanitizePatch('x'), {})
  assert.deepEqual(sanitizePatch(undefined), {})
})

test('safeSettings: 只透出 DEFAULTS 键集合（25 键）', async () => {
  const out = safeSettings({ ...DEFAULTS, extra: 'x' })
  assert.deepEqual(Object.keys(out).sort(), Object.keys(DEFAULTS).sort())
  assert.equal(out.extra, undefined)
  assert.equal(Object.keys(out).length, 25)
})

test('safeSettings: 缺失键透出 undefined（不漏内部状态）', async () => {
  const out = safeSettings({})
  assert.equal(Object.keys(out).length, 25)
  assert.equal(out.format, undefined)
})

test('settingsSchema: 25 个 volatile 字段与 DEFAULTS 键一致', async () => {
  const chain = () => {
    const node = {}
    for (const k of ['default', 'volatile', 'min', 'max', 'step', 'description']) node[k] = () => node
    return node
  }
  const fakeSchema = { object: (shape) => ({ shape }), boolean: chain, string: chain, number: chain }
  const built = settingsSchema(fakeSchema)
  assert.deepEqual(Object.keys(built.shape).sort(), Object.keys(DEFAULTS).sort())
})

test('settingsSchema: 没有 schemastery 时返回 null（只损失设置 UI）', async () => {
  assert.equal(settingsSchema(null), null)
  assert.equal(settingsSchema(undefined), null)
  assert.equal(settingsSchema({}), null)
})

// ══════════════════════════════════════════════════════════════════════════
// apply 级：提供方 / 事件刷新 / HTTP 数据面 / 管理工具（mock ctx，纯进程内）
// ══════════════════════════════════════════════════════════════════════════

function makeMockCtx({ titleSource = 'fallback', titleText = '旧标题', session, sessions, rejection } = {}) {
  const effects = []
  const registered = []
  const handlers = new Map()
  const refreshCalls = []
  const liveDoc = {}
  const ctx = {
    logger: { info() {}, warn() {} },
    connection: { requestRejection: () => rejection },
    settings: {
      describe: () => [{ ns: SETTINGS_NS, value: { ...liveDoc } }],
      update: async (ns, patch) => { Object.assign(liveDoc, patch) }
    },
    sessionTitle: {
      register(p) {
        registered.push(p)
        return () => {}
      },
      get() {
        return titleSource === 'none' ? undefined : { source: { kind: titleSource }, title: titleText }
      },
      refresh(s) {
        refreshCalls.push(s.id)
        return Promise.resolve({ title: '新标题', source: { kind: 'provider' } })
      }
    },
    sessions: { list: () => sessions ?? (session ? [session] : []) },
    llm: {},
    on(event, handler) {
      handlers.set(event, handler)
      return () => {}
    },
    effect(fn) {
      effects.push(fn())
    }
  }
  return {
    ctx,
    effects,
    registered,
    refreshCalls,
    emit: (s, e) => handlers.get('session/event')?.(s, e),
    handler: () => handlers.get('session/event')
  }
}

const CREATED_AT = Date.UTC(2024, 0, 14, 12, 0, 0) // Asia/Shanghai → 0114
const TODAY_MMDD = mmddOf(CREATED_AT, DEFAULTS.timeZone)

function strictSession({ id = 's-strict', header = {}, events } = {}) {
  return {
    id,
    header: { createdAt: CREATED_AT, ...header },
    events: events ?? [
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'user/message', seq: 7, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '帮我写个插件' }] } },
      { type: 'assistant/message', seq: 8, data: { message: { content: [{ type: 'text', text: '好的，正在写' }] } } },
      { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } }
    ]
  }
}

const generateArgs = (session, seq = 7) => ({
  session,
  messages: [{ seq, text: '帮我写个插件' }],
  route: { provider: 'zhanlu', model: 'zhanlu/glm-5.2' },
  signal: { throwIfAborted() {}, aborted: false }
})

test('apply: 注册提供方（automatic=first-prompt）并订阅 session/event', async () => {
  const session = { id: 's1', header: {} }
  const { ctx, registered, effects, handler } = makeMockCtx({ session })
  await apply(ctx, {})
  assert.equal(registered.length, 1)
  assert.equal(registered[0].id, 'dsh-smart-title')
  assert.equal(registered[0].automatic, 'first-prompt')
  assert.equal(typeof registered[0].generate, 'function')
  assert.equal(effects.length, 3) // provider 注册 + settings 监听 + session/event 订阅
  assert.equal(typeof handler(), 'function')
})

test('apply: completed turn/end 触发 refresh；error turn 不触发', async () => {
  const session = { id: 's1', header: {} }
  const { ctx, refreshCalls, emit } = makeMockCtx({ session })
  await apply(ctx, {})
  emit(session, { type: 'turn/end', data: { reason: { kind: 'completed' }, turn: 1 } })
  emit(session, { type: 'turn/end', data: { reason: { kind: 'error', error: {} }, turn: 2 } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(refreshCalls, ['s1'])
})

test('apply: 用户钉住 / 子代理 / refreshOnTurnEnd=false / enabled=false 均不 refresh', async () => {
  const pinned = { id: 's-pinned', header: {} }
  const pinnedCtx = makeMockCtx({ titleSource: 'user', session: pinned })
  await apply(pinnedCtx.ctx, {})
  pinnedCtx.emit(pinned, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(pinnedCtx.refreshCalls, [])

  const sub = { id: 's-sub', header: { origin: 'subagent' } }
  const subCtx = makeMockCtx({ session: sub })
  await apply(subCtx.ctx, {})
  subCtx.emit(sub, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(subCtx.refreshCalls, [])

  const off = makeMockCtx({ session: pinned })
  await apply(off.ctx, { refreshOnTurnEnd: false })
  off.emit(pinned, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(off.refreshCalls, [])

  const disabled = makeMockCtx({ session: pinned })
  await apply(disabled.ctx, { enabled: false })
  disabled.emit(pinned, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(disabled.refreshCalls, [])
})

test('apply: 无标题会话（snapshot undefined）也触发 refresh', async () => {
  const session = { id: 's-fresh', header: {} }
  const { ctx, refreshCalls, emit } = makeMockCtx({ titleSource: 'none', session })
  await apply(ctx, {})
  emit(session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(refreshCalls, ['s-fresh'])
})

test('apply: strict generate 走通 happy path，产出 MMDD｜类型｜主题', async () => {
  const session = strictSession({ id: 's-gen' })
  const { ctx, registered } = makeMockCtx({ session })
  await apply(ctx, {})
  ctx.llm = { stream: streamOf(JSON.stringify({ title: `${TODAY_MMDD}｜功能｜实现插件` })) }
  const result = await registered[0].generate(generateArgs(session))
  assert.equal(result.title, `${TODAY_MMDD}｜功能｜实现插件`)
  assert.deepEqual(result.messageSeqs, [7])
  assert.deepEqual(result.model, { provider: 'zhanlu', model: 'zhanlu/glm-5.2' })
  // 提示词里带上了严格格式要求与 date_mmdd
  assert.ok(llmCapture.framed.includes(`"date_mmdd":"${TODAY_MMDD}"`))
  assert.ok(llmCapture.framed.includes('current_title'))
})

test('apply: strict generate 首次无产出 → 落确定性占位标题（探索 + 首条消息前 12 字）', async () => {
  const session = strictSession({
    id: 's-ph',
    events: [
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'user/message', seq: 1, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '帮我写个插件' }] } }
    ]
  })
  const { ctx, registered } = makeMockCtx({ session, titleSource: 'none' })
  ctx.llm = { stream: async function* () { throw new Error('占位路径不应调用模型') } }
  await apply(ctx, {})
  const result = await registered[0].generate(generateArgs(session, 1))
  assert.equal(result.title, `${TODAY_MMDD}｜探索｜帮我写个插件`)
  assert.equal(isCompliantTitle(result.title, TODAY_MMDD, TYPES), true)
  assert.deepEqual(result.messageSeqs, [1])
})

test('apply: 占位标题在 turn/end 时绕过节流升级一次', async () => {
  const session = strictSession({
    id: 's-upgrade',
    events: [
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'user/message', seq: 1, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '帮我写个插件' }] } }
    ]
  })
  const mock = makeMockCtx({ session, titleSource: 'none' })
  mock.ctx.llm = { stream: async function* () { throw new Error('不该调用') } }
  await apply(mock.ctx, { refreshMinIntervalMs: 600000 })
  await mock.registered[0].generate(generateArgs(session, 1))
  mock.emit(session, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(mock.refreshCalls, ['s-upgrade'], '占位升级必须绕过节流')
})

test('apply: 模型返回非法 JSON 时退回占位标题（strict 不能留空标题）', async () => {
  const session = strictSession({ id: 's-badjson' })
  const { ctx, registered } = makeMockCtx({ session })
  await apply(ctx, {})
  ctx.llm = { stream: streamOf('这不是 JSON') }
  const result = await registered[0].generate(generateArgs(session))
  assert.equal(isCompliantTitle(result.title, TODAY_MMDD, TYPES), true)
  assert.ok(result.title.startsWith(`${TODAY_MMDD}｜探索｜`))
})

test('apply: 同题静默——模型返回与现标题一致时返回现值原文', async () => {
  const existing = `${TODAY_MMDD}｜功能｜实现插件 `
  // 现标题必须作为 session/title 事件出现在日志里：它是同题判定的锚点
  const session = strictSession({
    id: 's-same',
    events: [
      { type: 'session/title', data: { title: existing, source: { kind: 'provider' } } },
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'user/message', seq: 7, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '帮我写个插件' }] } },
      { type: 'assistant/message', seq: 8, data: { message: { content: [{ type: 'text', text: '好的，正在写' }] } } },
      { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } }
    ]
  })
  const mock = makeMockCtx({ session, titleSource: 'provider', titleText: existing })
  mock.ctx.llm = { stream: streamOf(JSON.stringify({ title: `${TODAY_MMDD}｜功能｜实现插件` })) }
  await apply(mock.ctx, {})
  const result = await mock.registered[0].generate(generateArgs(session))
  // 归一化后同题 → 静默返回现值原文（保留原有字节，侧栏零变化）
  assert.equal(normalizeTitle(result.title), normalizeTitle(existing))
  assert.deepEqual(result.messageSeqs, [7])
  // 现标题作为 current_title 锚点透给模型
  assert.ok(llmCapture.framed.includes('current_title'))
})

test('apply: 不同题 → 返回新生成的标题', async () => {
  const session = strictSession({ id: 's-diff' })
  const mock = makeMockCtx({ session, titleSource: 'provider', titleText: `${TODAY_MMDD}｜探索｜旧任务` })
  mock.ctx.llm = { stream: streamOf(JSON.stringify({ title: `${TODAY_MMDD}｜修复｜修好了标题` })) }
  await apply(mock.ctx, {})
  const result = await mock.registered[0].generate(generateArgs(session))
  assert.equal(result.title, `${TODAY_MMDD}｜修复｜修好了标题`)
})

test('apply: 子代理会话只给占位标题，不调用模型', async () => {
  const session = strictSession({ id: 's-sub-gen', header: { origin: 'subagent' } })
  const { ctx, registered } = makeMockCtx({ session })
  ctx.llm = { stream: async function* () { throw new Error('子代理不应调用模型') } }
  await apply(ctx, {})
  const result = await registered[0].generate(generateArgs(session))
  assert.equal(result.title, `${TODAY_MMDD}｜探索｜帮我写个插件`)
})

test('apply: placeholderOnFirstPrompt=false 时首次无产出直接抛错（服务维持回退标题）', async () => {
  const session = strictSession({
    id: 's-noph',
    events: [
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'user/message', seq: 1, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '帮我写个插件' }] } }
    ]
  })
  const { ctx, registered } = makeMockCtx({ session })
  await apply(ctx, { placeholderOnFirstPrompt: false })
  await assert.rejects(registered[0].generate(generateArgs(session, 1)), /no assistant work to classify yet/u)
})

test('apply: enabled=false 时 generate 直接拒绝', async () => {
  const session = strictSession({ id: 's-off' })
  const { ctx, registered } = makeMockCtx({ session })
  await apply(ctx, { enabled: false })
  await assert.rejects(registered[0].generate(generateArgs(session)), /disabled/u)
})

test('apply: format=plain 走自由格式（不套 MMDD 前缀）', async () => {
  const session = strictSession({ id: 's-plain' })
  const mock = makeMockCtx({ session })
  mock.ctx.llm = { stream: streamOf('修复登录 bug') }
  await apply(mock.ctx, { format: 'plain', targetWords: 8, targetCjkCharacters: 20 })
  const result = await mock.registered[0].generate(generateArgs(session))
  assert.equal(result.title, '修复登录 bug')
  assert.ok(!result.title.includes(SEPARATOR))
})

test('apply: 节流——generate 后窗口内的 turn/end 不再 refresh；窗口过期放行', async () => {
  const session = strictSession({ id: 's-throttle' })
  const a = makeMockCtx({ session })
  a.ctx.llm = { stream: streamOf(JSON.stringify({ title: `${TODAY_MMDD}｜功能｜实现插件` })) }
  await apply(a.ctx, { refreshMinIntervalMs: 60000 })
  await a.registered[0].generate(generateArgs(session))
  a.emit(session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(a.refreshCalls, [])

  const session2 = strictSession({ id: 's-throttle2' })
  const b = makeMockCtx({ session: session2 })
  b.ctx.llm = { stream: streamOf(JSON.stringify({ title: `${TODAY_MMDD}｜功能｜实现插件` })) }
  await apply(b.ctx, { refreshMinIntervalMs: 20 })
  await b.registered[0].generate(generateArgs(session2))
  await new Promise((r) => setTimeout(r, 60))
  b.emit(session2, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(b.refreshCalls, ['s-throttle2'])
})

test('apply: 长会话冻结——用户消息超过 refreshMaxTurns 的 turn/end 不 refresh', async () => {
  const events = [1, 2, 3].map((n) => ({
    type: 'user/message',
    seq: n,
    data: { source: { kind: 'user' }, content: [{ type: 'text', text: `第${n}轮` }] }
  }))
  const session = { id: 's-long', header: {}, events }
  const mock = makeMockCtx({ session })
  await apply(mock.ctx, { refreshMaxTurns: 2, refreshMinIntervalMs: 0 })
  mock.emit(session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(mock.refreshCalls, [])

  const relaxed = makeMockCtx({ session })
  await apply(relaxed.ctx, { refreshMaxTurns: 0, refreshMinIntervalMs: 0 })
  relaxed.emit(session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(relaxed.refreshCalls, ['s-long'])
})

test('apply: 启动回扫 upgrade 不合规标题的会话（catchupOnStart）', async () => {
  const session = strictSession({ id: 's-catch', header: { createdAt: Date.now() } })
  const mock = makeMockCtx({ session, titleSource: 'none' })
  mock.ctx.llm = { stream: streamOf('x') }
  await apply(mock.ctx, { catchupOnStart: true, catchupDelayMs: 5, catchupMax: 5 })
  await new Promise((r) => setTimeout(r, 150))
  assert.deepEqual(mock.refreshCalls, ['s-catch'])
})

test('apply: 回扫跳过没有任何助手产出的会话', async () => {
  const session = {
    id: 's-catch-noWork',
    header: { createdAt: Date.now() },
    events: [
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'user/message', seq: 1, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '只有问题' }] } }
    ]
  }
  const mock = makeMockCtx({ session, titleSource: 'none' })
  mock.ctx.llm = { stream: streamOf('x') }
  await apply(mock.ctx, { catchupOnStart: true, catchupDelayMs: 5, catchupMax: 5 })
  await new Promise((r) => setTimeout(r, 150))
  assert.deepEqual(mock.refreshCalls, [])
})

test('apply: 回扫默认关闭（catchupOnStart 默认 false）', async () => {
  const session = strictSession({ id: 's-catch-off', header: { createdAt: Date.now() } })
  const mock = makeMockCtx({ session, titleSource: 'none' })
  await apply(mock.ctx, {})
  await new Promise((r) => setTimeout(r, 120))
  assert.deepEqual(mock.refreshCalls, [])
})

// ── HTTP API ──────────────────────────────────────────────────────────────

function makeRes() {
  return {
    code: null,
    headers: null,
    body: null,
    writeHead(code, headers) {
      this.code = code
      this.headers = headers
    },
    end(body) {
      this.body = body
    }
  }
}

function makeReq(method, url, bodyObj) {
  const chunk = bodyObj === undefined ? null : Buffer.from(JSON.stringify(bodyObj))
  return {
    method,
    url,
    on(event, cb) {
      if (event === 'data' && chunk) cb(chunk)
      else if (event === 'end') setImmediate(cb)
    }
  }
}

test('apply: webServer 缺席时跳过 API 注册（无注入也不炸）', async () => {
  const session = { id: 's-noapi', header: {} }
  const { ctx, handler } = makeMockCtx({ session })
  await apply(ctx, {})
  assert.equal(typeof handler(), 'function')
})

test('apply: GET /status 返回 armed、formats、builtinTypes 与设置全集', async () => {
  const session = { id: 's-api', header: {} }
  const { ctx } = makeMockCtx({ session })
  const apiRegisters = []
  ctx.webServer = { register(h) { apiRegisters.push(h); return () => {} } }
  await apply(ctx, {})
  assert.equal(apiRegisters.length, 1)
  const res = makeRes()
  await apiRegisters[0].handler(makeReq('GET', '/dsh-smart-title/api/status'), res)
  const data = JSON.parse(res.body)
  assert.equal(res.code, 200)
  assert.equal(data.armed, true)
  assert.deepEqual(data.formats, ['mmdd', 'plain'])
  assert.deepEqual(data.builtinTypes, TYPES)
  assert.equal(data.settings.format, DEFAULTS.format)
  assert.equal(data.settings.timeZone, DEFAULTS.timeZone)
  assert.equal(data.settings.topicMaxChars, DEFAULTS.topicMaxChars)
  assert.equal(Object.keys(data.settings).length, 25)
})

test('apply: PUT /settings 走白名单清洗并落库（夹取 + 半配对丢弃 + 未知键丢弃）', async () => {
  const session = { id: 's-api2', header: {} }
  const { ctx } = makeMockCtx({ session })
  const apiRegisters = []
  ctx.webServer = { register(h) { apiRegisters.push(h); return () => {} } }
  await apply(ctx, {})
  const res = makeRes()
  await apiRegisters[0].handler(makeReq('PUT', '/dsh-smart-title/api/settings', {
    refreshMinIntervalMs: 999999999, // → 86400000
    targetWords: 7,
    provider: 'p1',
    model: '',
    bogus: 1
  }), res)
  const data = JSON.parse(res.body)
  assert.equal(res.code, 200)
  assert.equal(data.settings.refreshMinIntervalMs, 86400000)
  assert.equal(data.settings.targetWords, 7)
  assert.equal(data.settings.provider, '')
  assert.equal(data.settings.bogus, undefined)
})

test('apply: PUT /settings 丢弃非法 format 与 timeZone', async () => {
  const session = { id: 's-api3', header: {} }
  const { ctx } = makeMockCtx({ session })
  const apiRegisters = []
  ctx.webServer = { register(h) { apiRegisters.push(h); return () => {} } }
  await apply(ctx, {})
  const res = makeRes()
  await apiRegisters[0].handler(makeReq('PUT', '/dsh-smart-title/api/settings', {
    format: 'nope',
    timeZone: 'Mars/Olympus',
    theme: 'dark'
  }), res)
  const data = JSON.parse(res.body)
  assert.equal(data.settings.format, DEFAULTS.format)
  assert.equal(data.settings.timeZone, DEFAULTS.timeZone)
})

test('apply: GET /models 在无目录服务时降级为空目录', async () => {
  const session = { id: 's-models', header: {} }
  const { ctx } = makeMockCtx({ session })
  const apiRegisters = []
  ctx.webServer = { register(h) { apiRegisters.push(h); return () => {} } }
  await apply(ctx, {})
  const res = makeRes()
  await apiRegisters[0].handler(makeReq('GET', '/dsh-smart-title/api/models'), res)
  assert.equal(res.code, 200)
  assert.deepEqual(JSON.parse(res.body), { default: null, providers: [] })
})

test('apply: 未知路径 → 404', async () => {
  const session = { id: 's-404', header: {} }
  const { ctx } = makeMockCtx({ session })
  const apiRegisters = []
  ctx.webServer = { register(h) { apiRegisters.push(h); return () => {} } }
  await apply(ctx, {})
  const res = makeRes()
  await apiRegisters[0].handler(makeReq('GET', '/dsh-smart-title/api/nope'), res)
  assert.equal(res.code, 404)
})

test('apply: 每条 API 路由都在 connection 信任栅栏之后', async () => {
  const session = { id: 's-fence', header: {} }
  const { ctx } = makeMockCtx({ session, rejection: 401 })
  const apiRegisters = []
  ctx.webServer = { register(h) { apiRegisters.push(h); return () => {} } }
  await apply(ctx, {})
  const res = makeRes()
  await apiRegisters[0].handler(makeReq('GET', '/dsh-smart-title/api/status'), res)
  assert.equal(res.code, 401, '未认证的 status 读取必须被拒')
})

// ── 管理工具 ──────────────────────────────────────────────────────────────

async function adminFixture(over = {}) {
  // list 只回看 60 天内创建的会话，所以管理工具的夹具必须用「现在」当 createdAt；
  // 标题的 MMDD 必须跟着这个 createdAt 走，否则合规判定会因日期不符而变 false。
  const createdAt = over.createdAt ?? Date.now()
  const mmdd = mmddOf(createdAt, DEFAULTS.timeZone)
  const title = `${mmdd}｜功能｜实现插件`
  const session = over.session ?? strictSession({ id: 's-admin', header: { createdAt } })
  const mock = makeMockCtx({ session, titleSource: 'provider', titleText: title })
  const tools = []
  mock.ctx.tools = { register(t) { tools.push(t); return () => {} } }
  await apply(mock.ctx, over.config ?? {})
  return { ...mock, tools, session, admin: tools[0], mmdd, title }
}

test('apply: adminTool 默认注册 session_title_admin', async () => {
  const { admin } = await adminFixture()
  assert.ok(admin, '管理工具必须注册')
  assert.equal(admin.name, 'session_title_admin')
  assert.equal(typeof admin.execute, 'function')
  assert.equal(admin.parameters.required[0], 'action')
})

test('apply: adminTool=false 时不注册管理工具', async () => {
  const { tools } = await adminFixture({ config: { adminTool: false } })
  assert.equal(tools.length, 0)
})

test('apply: admin list 返回合规判定与最近命名结果', async () => {
  const { admin, session, title } = await adminFixture()
  const out = await admin.execute({ action: 'list' })
  assert.equal(out.count, 1)
  assert.equal(out.items[0].session_id, session.id)
  assert.equal(out.items[0].title, title)
  assert.equal(out.items[0].title_source, 'provider')
  assert.equal(out.items[0].compliant, true)
  assert.equal(out.items[0].mmdd, mmddOf(session.header.createdAt, DEFAULTS.timeZone))
  assert.equal(out.items[0].is_fork, false)
  assert.ok(Array.isArray(out.recent_automatic_outcomes))
})

test('apply: admin apply 重新校验每个标题（不合法进 failed，不写库）', async () => {
  const { admin } = await adminFixture()
  const out = await admin.execute({ action: 'apply', titles: [{ session_id: 's-admin', title: '随便写的' }] })
  assert.equal(out.applied_count, 0)
  assert.equal(out.failed_count, 1)
  assert.match(out.failed[0].reason, /MMDD|not available/u)
})

test('apply: admin 参数校验（空 titles / 缺 action / 未知 action）', async () => {
  const { admin } = await adminFixture()
  await assert.rejects(admin.execute({ action: 'apply', titles: [] }), /non-empty titles/u)
  await assert.rejects(admin.execute({ action: 'inspect' }), /requires session_id/u)
  await assert.rejects(admin.execute({ action: 'summarize' }), /requires session_id/u)
  await assert.rejects(admin.execute({ action: 'bogus' }), /unknown action/u)
})

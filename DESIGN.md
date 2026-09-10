# FingerType Quest 设计文档

## 1. 版本关系

本文件描述当前 Alpha 版本：`index.html` 与其 Cloudflare Worker 语音路由。

当前版本使用 `index.html`、`DESIGN.md`、根目录的 `banks/*.md`，以及仅用于 Qwen TTS 的 Worker。为了读取旁边的 Markdown 词库文件，推荐通过本地静态服务打开 `index.html`；若需要测试云端语音，则运行 Worker 本地开发服务器。

维护规则：任何影响用户可见行为、数据流、部署方式或外部服务的功能更新，必须在同一次更新中同步修改本设计文档和验收记录。

## 2. 本次升级目标

在保留现有单词训练功能不变的基础上，新增更清晰的数据和工程结构：

- K-8 年级词库拆成独立 Markdown 文件。
- 自定义词库拆成独立 Markdown 文件。
- `Banks` 按钮从小弹窗升级为完整的 Bank Library 页面。
- Bank Library 可以管理 K-8、Current List、All Added Words、句子库和导入句子库。
- 新增 `Sentence Practice`，训练大小写、空格和标点符号。
- 支持从电子书文本或电影脚本文本中提取句子，生成可练习的句子库。
- 新增更明确的数据加载、浏览器保存、导入、导出和重置策略。
- 支持每位用户授权一个自己的本地资料库文件夹，把四个自定义 bank 独立保存为 Markdown 文件；该能力不需要登录或后端。

## 3. 文件结构

```text
Typing Game/
├── index.html
├── DESIGN.md
├── tts-handler.js
├── worker/
│   └── index.js
├── wrangler.jsonc
├── .dev.vars.example
└── banks/
    ├── grade-k.md
    ├── grade-1.md
    ├── grade-2.md
    ├── grade-3.md
    ├── grade-4.md
    ├── grade-5.md
    ├── grade-6.md
    ├── grade-7.md
    ├── grade-8.md
    ├── custom-current.md
    ├── custom-all.md
    ├── current-sentences.md
    └── all-imported-sentences.md
```

## 4. 页面结构

新版仍然是一个前端离线应用，但 UI 从单一练习页扩展为两个页面状态。

### 4.1 Practice 页面

`index.html` 默认显示练习页。

保留原有结构：

- 顶部栏：`FingerType Quest`, `Banks`, `Start`, `Pause`, `Reset`
- 设置栏：`Bank`, `Mode`, `Round`, `Sound`, `Voice`
- 练习区：当前目标、字符进度、提示、朗读、下一题
- 统计区：完成数量、准确率、WPM、错误数、连续正确、最好成绩
- Typing Coach：当前手指、目标键、完整键盘和手指覆盖层

新增：

- `Mode` 增加第三项：`Sentence Practice`
- `Bank` 下拉菜单同时包含词库和句子库
- 当选择句子库时，模式自动切到 `Sentence Practice`
- 当从句子模式切回词库时，模式自动回到 `Word Practice`
- `Round` 在词库下显示 `10 words`, `20 words`, `30 words`
- `Round` 在句子库下显示 `10 sentences`, `20 sentences`, `30 sentences`
- 统计标签在词库下显示 `Words`，在句子库下显示 `Sentences`
- `Say Word` 在句子模式下显示为 `Say Sentence`
- 句子模式的练习区与右侧统计区保持同高；目标句按可用宽度自然换行，字号收敛为适合阅读的范围，完整文本不以内部滚动截断。
- 句子模式的主练习区不显示 `Next: press...` 按键提示；当前键和手指提示只保留在右侧 Typing Coach。
- 句子模式的字符进度格使用单行横向滚动，避免长句把练习区撑高或遮挡其他内容。
- 当前字符高亮只改变颜色和描边，不向上位移，避免顶部被裁切。
- Typing Coach 的黄色键名徽章支持较长键名，例如 `Shift`、`Command`、`Backspace`。
- `Shift`、`Control`、`Option`、`Command`、`Fn` 长按时，对应手指保持停在按键上，松开后回到 home row。
- 左右 `Control` 使用独立键位 ID；实体右 `Ctrl` 会点亮虚拟右 `Ctrl`，并由右小指保持按住。

### 4.2 Bank Library 页面

点击 `Banks` 不再打开小弹窗，而是进入 `#banks` 页面状态。

Bank Library 包含一个个人资料库工具栏和两列管理区：

- 个人资料库工具栏：连接、重载或断开用户本地文件夹。
- 左侧：所有 bank 列表。
- 右侧：选中 bank 的 Markdown 编辑器和对应的导入区。四个自定义 bank 都支持从图片、PDF、TXT 或 Markdown 导入。

左侧 bank 分组：

- `California K-8 Word Banks`
- `Custom Word Banks`
- `Sentence Banks`

中间编辑器显示：

- bank 类型：`Words` 或 `Sentences`
- bank 名称
- 当前条目数量
- 对应 Markdown 文件路径
- Markdown 内容
- `Save Bank`
- `Use in Practice`
- `Export Markdown`
- `Clear This List`：仅在四个自定义 bank 显示；清空当前选中的列表，不影响配对的 Current 或 All 列表。
- `Reset Browser Edits`

个人资料库工具栏显示当前状态：

- 未连接时使用 `Browser storage`，可选择一个本地文件夹。
- 已连接时显示文件夹名称；四个自定义 bank 会从该文件夹读取，并在保存或导入时写回。
- `Reload Folder` 用于读取用户在外部编辑器中保存后的 Markdown 内容。
- `Disconnect` 只移除网站对文件夹的已保存引用，不删除用户文件。

右侧导入区提供：

- 文件选择器，支持图片、PDF、`.txt`、`.text` 和 `.md`
- 当前所选自定义 bank 的导入状态与结果提示
- 词库文件自动抽取英文单词；句库文件自动抽取完整英文句子
- 选中 K-8 公共词库时不显示导入区，避免误把个人资料写入公共课程词库

## 5. Bank 数据模型

新版统一使用 `bankSources` 作为数据注册表。

每个 bank 有以下字段：

- `id`：稳定 ID，例如 `grade:1` 或 `sentence:current`
- `label`：界面显示名
- `type`：`word` 或 `sentence`
- `group`：左侧列表和下拉菜单分组
- `file`：对应 Markdown 文件路径
- `coversAll`：是否每轮覆盖全部条目
- `coversAllUntil`：当条目数不超过某个数量时，是否覆盖全部条目

当前 bank 清单：

| ID | 类型 | 文件 | 规则 |
| --- | --- | --- | --- |
| `grade:K` | word | `banks/grade-k.md` | 按 Round 随机抽取 |
| `grade:1` | word | `banks/grade-1.md` | 按 Round 随机抽取 |
| `grade:2` | word | `banks/grade-2.md` | 按 Round 随机抽取 |
| `grade:3` | word | `banks/grade-3.md` | 按 Round 随机抽取 |
| `grade:4` | word | `banks/grade-4.md` | 按 Round 随机抽取 |
| `grade:5` | word | `banks/grade-5.md` | 按 Round 随机抽取 |
| `grade:6` | word | `banks/grade-6.md` | 按 Round 随机抽取 |
| `grade:7` | word | `banks/grade-7.md` | 按 Round 随机抽取 |
| `grade:8` | word | `banks/grade-8.md` | 按 Round 随机抽取 |
| `custom:current` | word | `banks/custom-current.md` | 每轮覆盖全部 |
| `custom:all` | word | `banks/custom-all.md` | 30 个以内覆盖全部，超过 30 个按 Round |
| `sentence:current` | sentence | `banks/current-sentences.md` | 每轮按文件顺序覆盖全部 |
| `sentence:all-imported` | sentence | `banks/all-imported-sentences.md` | 30 句以内按文件顺序覆盖全部，超过 30 句取前 Round 数量 |

## 6. Markdown 格式

### 6.1 单词 bank

推荐格式：

```md
# Grade 1 Words

id: grade:1
type: words
label: Grade 1 Words

- after
- again
- school
```

解析规则：

- 忽略 Markdown 标题行。
- 忽略 `id:`, `type:`, `label:`, `file:`, `note:` 元数据行。
- 忽略 HTML 注释行。
- 支持项目符号、编号列表或普通粘贴文本。
- 单词统一转为小写。
- 只保留英文字母。
- 自动去重。
- 允许 1 个字母的词，例如 `a` 和 `i`。
- 单词长度限制为 1 到 16 个字母。

### 6.2 句子 bank

推荐格式：

```md
# Current Sentences

id: sentence:current
type: sentences
label: Current Sentence List

- The sun is warm.
- Can you read this line?
- She said, "Great work!"
```

解析规则：

- 保留大小写。
- 保留空格。
- 保留常见英文标点：`. , ! ? ' " ; : - ( )`
- 智能引号会转换为直引号。
- 长破折号会转换为 `-`。
- 多余空白会压缩成一个空格。
- 过短片段会过滤。
- 过长句子会过滤。
- 不可由当前屏幕键盘输入的字符会过滤。
- 自动去重。

## 7. 数据加载优先级

新版有四层数据来源：

1. `banks/*.md` 部署文件。
2. 浏览器 `localStorage` 中的编辑内容。
3. 用户授权的个人资料库文件夹。
4. `index.html` 里的兜底数据。

加载顺序：

1. 初始化内置兜底数据，保证页面永远有可练习内容。
2. 尝试读取每个 `banks/*.md` 文件。
3. 读取浏览器保存的自定义词库、导入句子库和 bank override。
4. 若用户已授权且权限仍有效，读取个人资料库文件夹中的四个 Markdown 文件。
5. 个人资料库只覆盖四个自定义 bank，并优先于浏览器保存内容。

这样设计的原因：

- K-8 公共词库可随线上版本统一发布。
- 每位用户可在自己的文件夹中维护个人词库和句库，不会与其他用户共享或互相覆盖。
- 页面内编辑也可以立即生效。
- Markdown 文件读取失败时，新版仍能运行。
- 稳定可执行版本完全不受新版改动影响。

## 8. 保存与导出策略

浏览器不能在所有环境中静默写回任意本地路径，所以新版采用两种策略：

- `Save Bank`：始终保存到浏览器本地存储，立即用于练习；已连接个人资料库时，同时写回相关 Markdown 文件。
- `Export Markdown`：下载当前编辑器里的 Markdown 文件。
- `Reload Banks`：重新读取部署站点的 `banks/*.md`，并重载已连接的个人资料库。
- `Reload Folder`：只重新读取用户选定文件夹的四个 Markdown 文件。
- `Reset Browser Edits`：清除当前 bank 的浏览器覆盖内容；个人资料库仍连接时，会重新以个人文件夹内容为准。
- `Clear This List`：清空当前选中的自定义 bank，并保存空列表；Current 与 All 始终独立清空。已连接个人资料库时，只写回该 bank 对应的一个 Markdown 文件。
- `Disconnect`：只忘记已保存的文件夹授权引用，不删除磁盘上的任何文件。

外部编辑推荐流程：

1. 打开 `banks/grade-1.md` 或其他 bank 文件。
2. 直接编辑 Markdown。
3. 保存文件。
4. 在 Bank Library 点击 `Reload Banks`。

页面内编辑推荐流程：

1. 在 Bank Library 选择一个 bank。
2. 修改 Markdown。
3. 点击 `Save Bank`；已连接个人资料库时内容会立即写回文件夹。
4. 点击 `Use in Practice`。
5. 未连接个人资料库时，如需同步到磁盘，点击 `Export Markdown`。

### 8.1 个人资料库文件夹

在线部署时，用户从 Bank Library 点击 `Choose Folder`，在自己的电脑上选择一个文件夹。浏览器只会访问该用户明确选中的文件夹，并在首次连接时为缺失文件创建以下四个 Markdown 文件：

```text
My FingerType Banks/
├── current-words.md
├── all-added-words.md
├── current-sentences.md
└── all-imported-sentences.md
```

对应关系：

| 个人文件 | Bank ID | 写入时机 |
| --- | --- | --- |
| `current-words.md` | `custom:current` | 编辑、导入或单独清空 Current Word List 时 |
| `all-added-words.md` | `custom:all` | Current Word List 自动汇总、直接编辑、直接导入或单独清空 All Added Words 时 |
| `current-sentences.md` | `sentence:current` | 编辑、导入或单独清空 Current Sentence List 时 |
| `all-imported-sentences.md` | `sentence:all-imported` | Current Sentence List 自动汇总、直接编辑、直接导入或单独清空 All Imported Sentence List 时 |

文件夹授权规则：

- 不上传文件内容；网站没有后端、账号或共享资料库。
- 浏览器会把文件夹句柄保存到当前网站域名的 IndexedDB 中，便于下次访问尝试恢复。
- 浏览器可能在清理网站数据、切换浏览器或权限被撤销后要求用户再次选择文件夹。
- 需要 HTTPS 部署（`localhost` 开发环境也可），并优先使用支持 File System Access API 的 Chromium 浏览器。
- Safari、Firefox 或不支持的环境自动退回到浏览器保存和 Markdown 导入/导出，不影响练习功能。

## 9. 练习模式

### 9.1 Word Practice

保持稳定版行为：

- 当前单词完整显示。
- 只要求输入英文小写字母。
- 键位判断按字母物理键位进行。
- 即使按住 Shift 输入大写，仍然按字母键位判断，不改变原有单词训练体验。
- 错键不写入。
- 不需要 Backspace。
- Typing Coach 提前显示目标键和目标手指。

### 9.2 Dictation

保持稳定版行为：

- 当前单词不显示，只显示紧凑尺寸的 `Ready` 或 `Listen`；听写回合结束时的 `Great Work` 使用同一尺寸。三个状态文字位于练习区上方，为已完成词和字母进度留出空间。
- 回合结束提示只确认已完成的单词或句子数量，不显示最终准确率，避免跳过项目时产生误导性的结果。
- 听写进行中会显示 `Hold to Show`；按住鼠标左键（或键盘 Space/Enter）时才临时显示完整当前单词，松开后立即回到 `listen`。暂停、切换下一题、完成回合或浏览器失焦时也会隐藏。
- 当前词下方会以黑色、逗号分隔的文字显示本轮此前已经完成或用 `Next` 跳过的听写词。历史区独占下方整行，并在可用高度内自动缩小字号以完整显示；窄屏会按设备高度收紧历史区预算，让操作按钮仍保持在首屏。只有超过最小可读字号时才在此区域纵向查看全部记录，因此不会被已输入字母遮挡或挤出按钮。记录只属于当前回合，在重新开始、重置或切换模式时清空。
- 正确输入的绿色字块与 `Listen` 同行显示在右侧；按住 `Hold to Show` 显示完整单词时，绿色字块会完全隐藏，松开后恢复。听写运行期间不显示刚按下的键、按键动画或右侧的键名反馈。
- `Voice` 开启时当前词优先由 Qwen TTS 朗读，云端暂时不可用时才使用浏览器英文语音保底。当前单词播放三遍；每一遍结束后固定静音 3 秒再开始下一遍，因此停顿不受词长或网络响应影响。输入完成或使用 `Next` 后，已经开始的朗读一定会播完，再等待 1 秒才进入下一词，避免旧词被截断或新词过早开始。
- 正确输入后逐字显示。
- 不提前暴露目标字母、目标键、目标手指或总长度。
- 错键不写入。
- 不需要 Backspace。
- 听写模式使用 `Next` 后，当前词会进入历史并立即计入 `Words` 进度，但不会增加正确字符、准确率或连击；其他模式的 `Next` 保持原有跳过行为。

### 9.3 Sentence Practice

新增模式。

目标：

- 训练句首大写。
- 训练专有名词大写。
- 训练空格。
- 训练逗号、句号、问号、感叹号、引号、分号、冒号、连字符和括号。
- 训练 Shift 与符号层的配合。

行为：

- 完整显示当前句子，使用更大的字号自动换行；超长句只在句子自身区域滚动，不会挤出练习区高度。
- 不显示单独的字符进度格，句子本身就是唯一的进度面。
- 未输入的字母、空格和标点使用统一灰色。
- 正确输入后，对应字符显示深绿字与浅绿底色；空格和标点也按同一规则反馈。
- 当前字符输错时，对应目标字符显示浅红底、深红字和红色波浪下划线；输对后立即转为绿色。
- 句子回合结束时，`Great Work` 使用黑色文字，明确区别于练习中尚未输入的灰色句子字符；开始下一题后恢复正常的灰色句子状态。
- 如果目标需要 Shift，Typing Coach 会提示 Shift；主练习区不重复显示同类按键提示。
- 实体键盘按键使用浏览器事件里的真实字符判断。
- 屏幕键盘按键根据当前 Shift/Caps 状态生成字符。
- 大小写严格区分。
- 标点严格区分。
- 错键不写入。
- 不需要 Backspace。

## 10. 文件导入

Bank Library 的四个自定义 bank 都可以直接导入文件；解析类型由当前选择的 bank 决定。

| 选中的 bank | 解析结果 | 导入后的写入规则 |
| --- | --- | --- |
| `Current Word List` | 英文单词 | 替换 Current Word List，并把词汇累积到 All Added Words |
| `All Added Words` | 英文单词 | 只累积到 All Added Words，不改变 Current Word List |
| `Current Sentence List` | 完整英文句子 | 替换 Current Sentence List，并把句子累积到 All Imported Sentence List |
| `All Imported Sentence List` | 完整英文句子 | 只累积到 All Imported Sentence List，不改变 Current Sentence List |

导入成功后，数据会立即用于练习；已连接个人资料库时，系统会把变动同步写入相应的本地 Markdown 文件。

适合导入：

- 自己有权使用的电子书文本
- 课程阅读材料
- 公开领域文本
- 家长自己整理的短文
- 电影脚本片段

不适合导入：

- 含大量舞台方向、时间码、乱码的原始字幕
- 过短的台词碎片
- 含当前键盘无法输入的大量特殊符号的文本

## 11. 出题规则

### 11.1 年级词库

K-8 年级词库按 `Round` 随机抽取：

- 10 words
- 20 words
- 30 words

每次开始前都会重新打乱。

### 11.2 Current List

保持原规则：

- 每轮覆盖当前列表全部单词。
- `Round` 自动禁用。
- 每轮先随机打乱。
- 修改 Current List 时，新单词合并到 All Added Words。

### 11.3 All Added Words

保持原规则：

- 30 个以内覆盖全部。
- 超过 30 个时按 Round 随机抽取。
- 每轮先随机打乱。

### 11.4 Starter Sentences

严格按 Markdown 句库中的原始顺序练习：

- 10 sentences
- 20 sentences
- 30 sentences

句子数不足 Round 时，该词库会覆盖全部现有句子，不重复补充条目，确保故事顺序不被打乱。

### 11.5 Imported Sentences

导入句子库严格保持 Markdown 中的句子顺序：

- 30 句以内按文件顺序覆盖全部。
- 超过 30 句时，从文件开头按 Round 数量依序练习。

## 12. 键盘与字符判断

### 12.1 键位层

屏幕键盘仍然保留稳定版的完整 Mac 风格键盘：

- 功能键
- 数字符号行
- QWERTY 字母区
- Tab/Caps/Shift/Enter/Backspace
- Space
- 方向键

### 12.2 Word/Dictation 判断

为了保持旧体验，单词类模式继续按基础字母键位判断：

- `a` 目标接受 `a` 键。
- 即使 Shift/Caps 让实际字符变成 `A`，仍然视为按对 `a` 键。
- 数字、标点和其他可打印键会作为错误尝试。

### 12.3 Sentence 判断

句子模式按实际字符判断：

- 目标 `A` 必须输入 `A`。
- 输入 `a` 会错。
- 目标 `?` 必须输入 `?`。
- 输入 `/` 会错。
- 目标空格必须按 `Space`。

### 9.4 Voice 与 Qwen TTS

`Voice` 开启时，Word Practice、Dictation 和 Sentence Practice 都优先通过 `/api/tts` 使用 Qwen Breeze 语音；浏览器 `SpeechSynthesis` 只作为 Qwen 临时不可用时的保底。

#### 请求与密钥边界

- 浏览器只发送 `{ input, mode, format: "pcm" }` 到同源 `/api/tts`，绝不持有或显示 Qwen Key。
- Cloudflare Worker 在 `worker/index.js` 中仅把 `/api/tts` 交给共享的 `tts-handler.js`；其他页面和 Markdown 文件由静态资源绑定 `ASSETS` 返回。
- `QWEN_API_KEY` 必须作为 Worker Production 环境的 `Secret` 保存，不提交到 Git，也不写入 `wrangler.jsonc`、浏览器代码或日志。
- Worker 调用 Qwen 的 `breeze-tts-2`、`voice: "breeze"`、PCM 或 WAV 输出。公开接口没有可选的命名女声音色或参考音频；固定 seed 和统一的“正式成年美式女声”指令只能尽量稳定不同文本之间的声线，不能像专属声纹模型一样绝对锁定。

#### 单词与听写的防扩读策略

Qwen 是生成式 TTS，单个词有继续扩读成短语或句子的风险。单词和听写使用以下叠加保护：

1. Worker 只接受一个英文词条（允许单个连字符或撇号），例如 `Old`；空格、句子和额外字符会被拒绝，绝不把多词文本送入 Word/Dictation TTS。
2. 专用指令要求固定的正式成年女声、清晰辅音、干净录音环境、稳定音量和语速、词典引用读法（不使用连读或弱读）、下降收尾且不使用问句/招呼语调，并要求只读一次后立刻停止。正常请求固定使用 seed `1`；仅在安全验证失败后才固定使用恢复 seed `0`。
3. Worker 先完整收集单词 PCM，再按词长验证其最大长度（0.72–1.1 秒）。只有在上限内自然结束的音频才会返回和写入边缘缓存；一旦超长、空音频或超过 8 秒仍未完成，就立即取消上游 Qwen 生成。随后以第二个固定 seed 重试一次；仍不合格才返回可降级错误。这样异常生成不会继续占用该 Key 唯一的一条生成槽，也尽量让异常词仍由 Qwen 朗读。
4. 浏览器同样按 0.72–1.1 秒执行播放硬上限，作为缓存、网络或旧部署下的第二道防线；超出部分绝不会被播放。
5. 单次页面会话内，已完整播放过的同一词会保留 PCM 音频并直接复用。听写的第 2、3 次朗读因此使用同一段声音，不重新生成。
6. 不预取下一词。Qwen 服务 Key 同时只允许一条生成；预取会与正在读的词竞争并导致 429 或无声。

句子练习不采用单词时长上限，以免截断合法长句，但仍使用“逐字读一次、不要添加内容”的约束。

#### 播放、降级与延迟

- 句子 PCM 在生成过程中即可开始播放；前端先缓冲约 0.1 秒音频。单词 PCM 会先由 Worker 收齐并通过短音频验证，再传给页面播放；这以至多约 1.1 秒的音频验证换取不播放扩读内容、也不阻塞后续请求。
- Qwen 正常返回且通过单词安全验证的同一内容会由浏览器会话缓存复用；Worker 也按语音配置、格式、模式和文本建立边缘缓存键。边缘缓存按 Cloudflare 数据中心独立保存，因此不能作为单页稳定性的唯一保障。
- Qwen 的 422（两个固定 seed 都生成超长、空或超时的词条音频）、429、网络问题、502 或 504 只让当次朗读降级为浏览器语音；下一次仍会自动尝试 Qwen。
- 配置、鉴权或路由类错误（例如缺失 Secret、401、404）才会将本页 Qwen 标为不可用，之后使用浏览器语音。
- `onend` / `onerror` 回调保持原有接口，听写三次朗读、暂停、完成当前朗读后再切词的逻辑不因更换播放器而改变。

#### 本地与线上测试

- 本地仅测试网页和浏览器语音时，可使用任意静态服务器。
- 本地测试 Qwen 时，复制 `.dev.vars.example` 为 `.dev.vars`，仅在其中填写 `QWEN_API_KEY`，然后运行 `npx wrangler dev --local --port 8788` 并访问 `http://localhost:8788`。
- 线上使用 `wrangler.jsonc`：静态资源目录为项目根目录，只有 `/api/*` 先进入 Worker；GitHub 推送触发 Cloudflare Workers 自动部署。
- 语音改动的验收至少包括：`/api/tts` 返回已验证的 `audio/pcm` 或 WAV、Word/Dictation 仍由 Qwen 发声、超长词条会取消上游并用第二固定 seed 重试、两个结果仍异常时才得到 422、单词不会播放超出时长上限的续读、听写每遍结束后有固定 3 秒静音、三次可复用同一音频，以及 Qwen 故障时浏览器保底可用。

字符到键位映射：

- 字母映射到对应小写键位。
- 大写字母映射到同一字母键，并提示 Shift。
- `! @ # $ % ^ & * ( ) _ + { } | : " < > ?` 映射到对应基础键，并提示 Shift。
- 空格映射到 `Space`。

## 13. 状态持久化

继续使用浏览器本地存储。

保存内容：

- 当前设置
- 当前 bank ID
- 当前模式
- Sound/Voice 开关
- 自定义 Current List
- 自定义 All Added Words
- 自定义 Current Sentence List
- 自定义 All Imported Sentence List
- 个人资料库的最近一次内容（作为离线降级副本）
- K-8 公共词库的浏览器编辑覆盖
- 各 bank + mode 的最好成绩

单独保存在 IndexedDB：

- 用户选择的个人资料库文件夹句柄；文件内容本身不复制到 IndexedDB。

不保存：

- 孩子姓名
- 登录信息
- 远程账号信息
- 个人身份信息

## 14. 技术边界

新版仍然不引入构建工具。

当前实现：

- 纯 HTML
- 内联 CSS
- 内联 JavaScript
- Markdown 数据文件
- 浏览器 `fetch`
- 浏览器 `localStorage`
- 浏览器 `IndexedDB`
- File System Access API（可选增强）
- Web Audio API
- SpeechSynthesis API
- Cloudflare Workers Static Assets
- Cloudflare Worker Secret（仅 `QWEN_API_KEY`）
- Qwen Breeze TTS HTTP API（仅经 Worker 调用）

没有使用：

- 数据库
- 登录系统
- 外部 JavaScript 库

Worker 只代理语音生成，不保存用户账号、练习记录或个人词库；词库和成绩仍保存在浏览器或用户明确授权的本地文件夹中。

注意：

- 直接双击 `index.html` 时，某些浏览器会阻止读取旁边的 Markdown 文件。
- 推荐用本地静态服务打开新版。
- 稳定可执行版本不需要新版的本地静态服务。
- 在线版的个人资料库只能通过用户点击 `Choose Folder` 后访问；网页不能也不会扫描或指定用户任意本地路径。

## 15. 关键函数设计

### 数据层

- `bankSources`：所有 bank 的注册表。
- `bankSourceById`：按 ID 查询 bank 元数据。
- `bankLibrary`：运行时 bank 数据缓存。
- `loadMarkdownBankFiles()`：读取 `banks/*.md`。
- `parseBankItems()`：按 bank 类型解析 Markdown。
- `parseWords()`：解析和清洗单词。
- `parseSentences()`：解析和清洗句子。
- `formatBankMarkdown()`：把运行时条目重新格式化为 Markdown。
- `registerBankItems()`：写入运行时 bank 缓存。
- `applyStoredOverrides()`：应用浏览器覆盖内容。
- `syncCustomBanksIntoLibrary()`：把旧自定义词库和导入句子库同步到统一 bank 缓存。
- `restorePersonalBankDirectory()`：恢复已保存的个人文件夹句柄，并在权限仍有效时读取文件。
- `loadPersonalBankDirectory()`：读取个人文件夹的四个 Markdown bank；首次连接可创建缺失文件。
- `writePersonalBankDirectory()`：把 Current/All 联动后的内容写回相应个人文件。

### Bank Library

- `renderLibraryPage()`：刷新整个管理页。
- `renderLibraryBankList()`：刷新左侧 bank 列表。
- `renderLibraryEditor()`：刷新 Markdown 编辑器。
- `saveSelectedMarkdownBank()`：保存当前编辑器内容。
- `useSelectedBankInPractice()`：将选中 bank 用于练习。
- `exportSelectedMarkdownBank()`：导出当前 Markdown。
- `resetSelectedMarkdownBank()`：重置当前 bank 的浏览器覆盖。
- `clearSelectedCustomBank()`：二次确认后只清空选中的一个自定义 bank。
- `pairedPersonalBankSource()`：找出用于清空提示的 Current/All 配对 bank。
- `reloadBankFilesFromPage()`：重新读取 Markdown 文件。
- `canImportFileInto()`：只允许向四个自定义 bank 导入文件。
- `importSelectedFile()`：读取并按当前 bank 类型解析用户选择的文件。
- `saveImportedItems()`：根据 Current 或 All 规则更新 bank，并同步个人资料库。

### 练习引擎

- `selectedBankSource()`：当前 bank 元数据。
- `selectedBankType()`：当前是词库还是句子库。
- `ensureBankMatchesMode()`：保证句子库和句子模式同步。
- `getCurrentPool()`：从统一 bank 缓存取当前练习条目。
- `getRoundTargetSize()`：计算本轮长度。
- `buildRoundQueue()`：词库生成随机队列；句库保持 Markdown 原始顺序。
- `currentTargetText()`：当前完整目标文本。
- `currentTargetChar()`：当前目标字符。
- `keyIdForCharacter()`：把目标字符映射到键位。
- `characterForKeyId()`：屏幕键盘根据 Shift/Caps 生成真实字符。
- `characterFromKeyboardEvent()`：实体键盘读取真实输入字符。
- `currentTargetShiftKey()`：判断当前目标是否需要 Shift。
- `handlePracticeKey()`：统一处理单词、听写和句子输入。
- `speakWordOnce()`：统一入口；调用 Qwen PCM 播放器并保留原有朗读结束回调。
- `speakQwenWordOnce()`：请求 `/api/tts`、复用页面内 PCM，并在失败时使用浏览器保底。
- `playQwenPcmResponse()`：按流播放 24 kHz PCM；单词模式执行时长上限并取消多余流。
- `standaloneWordPlaybackLimit()`：依据词中字母数给出 0.72–1.1 秒的单词播放上限。

## 16. 验收记录

已检查：

- 稳定可执行版本保留，未被新版覆盖。
- 当前版本保存为 `index.html`。
- K-8 年级词库已拆分到 `banks/grade-k.md` 到 `banks/grade-8.md`。
- 自定义词库已拆分到 `banks/custom-current.md` 和 `banks/custom-all.md`。
- 句子库已拆分到 `banks/current-sentences.md` 和 `banks/all-imported-sentences.md`。
- 新版脚本语法检查通过。
- 浏览器打开 `index.html` 成功。
- 浏览器通过本地预览成功读取所有 `banks/*.md` 文件。
- Practice 页面可见 K-8、Custom、Sentence banks。
- `Banks` 按钮进入 Bank Library 页面，不再使用小弹窗。
- Bank Library 显示所有 K-8 词库、Custom 词库、句子库。
- Bank Library 可显示选中 bank 的 Markdown 文件路径、数量和内容。
- 选择 `Current Sentence List` 或 `All Imported Sentence List` 后可以进入 `Sentence Practice`。
- 句子模式中 Round 标签显示为 sentences。
- 统计标签显示为 `Sentences`。
- `Say Word` 切换为 `Say Sentence`。
- 句子模式显示完整句子。
- 178 字符长句压力测试可完整显示在句子目标区。
- 句子面板按内容收缩，短句底部空白约 9px。
- 句子模式主练习区隐藏 `Next: press...` 按键提示。
- 句子模式字符进度格为单行横向滚动。
- 当前字符黄色高亮顶部未被裁切。
- 句子模式进度格显示大小写、空格和标点。
- 右侧黄色键名徽章可容纳 `Command`，不会超出按钮框。
- 长按 `Control`、`Option`、`Command` 时，对应手指保持在按键上；松开后回位。
- 句首大写 `A` 会提示 Shift。
- 输入小写 `a` 时会判错。
- 输入 `Shift+A` 时会判对并前进。
- 输入 `Space` 时会判对并前进。
- 导入区可以把粘贴文本生成 Imported Sentences。
- 导入区会过滤过短片段。
- 已支持个人资料库文件夹：四个自定义 bank 可读取和写回用户选择的本地 Markdown 文件；不支持该 API 的浏览器会保留浏览器保存和导出路径。
- 已接入 Qwen Breeze TTS：Worker Secret 不会暴露到浏览器；本地与线上均可测试 `/api/tts`。
- 已验证 Qwen 对孤立词偶尔会生成异常长音频（例如 `you` 曾返回约 83 秒 PCM）；Word/Dictation 现在由 Worker 先验证完整短音频，发现异常立即取消 Qwen 且不缓存，并用第二固定 seed 重试一次，再由页面时长上限二次保护，避免续读、占住唯一生成槽或令后续 Qwen 请求 429。

仍可继续优化：

- 为句子练习增加难度分级，例如 short / medium / script。
- 增加 “punctuation only” 或 “capital letters only” 小练习。
- 给导入脚本增加角色名、时间码和舞台方向的更细清洗规则。
- 把 CSS 和 JavaScript 拆成多个文件，进一步工程化。

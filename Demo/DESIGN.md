# FingerType Quest 设计文档

## 1. 项目定位

**FingerType Quest** 是一个面向 7 岁左右儿童的英文打字练习游戏。它参考 QWERTY Learner 的“单词记忆 + 打字肌肉记忆”思路，但交互方式更温和、更直观，适合刚开始学习英文和键盘的小孩。

当前交付形式：一个自包含的 HTML 文件。

主文件：

- `index.html`

维护规则：

- 以后任何功能、交互、词库、视觉布局或验收标准的改动，都必须同步更新本设计文档。
- 如果实现和文档冲突，以最新实现为准，但应立即补全文档。

## 2. 目标用户

- 年龄：7 岁及以上。
- 英文水平：初学或早期阅读阶段。
- 键盘水平：刚开始学习 QWERTY 键盘。
- 使用场景：家庭练习、家长陪伴练习、课后练习。
- 主要学习目标：认识字母位置、理解基础指法、逐步形成英文单词打字肌肉记忆。

默认推荐：

- 默认词库：`Grade 1 Words`
- 默认模式：`Word Practice`
- 默认一轮：`10 words`

## 3. 设计原则

- **同屏可见**：孩子练习时必须同时看到当前单词、统计、键盘和手指提示。
- **全英文界面**：游戏页面所有可见文字必须是英文。
- **错误不惩罚**：按错键只提示，不把错误字母写进单词，不要求重打整个单词。
- **不用删除**：孩子不需要按 Backspace 来修正。
- **指法直观**：手指应直接和键盘发生空间关系，而不是独立显示在远处。
- **儿童友好**：文字大、反馈清楚、颜色明快，但不做复杂装饰干扰注意力。
- **完全离线可用**：不依赖后端，不需要登录，不在练习时访问外部网站；K-8 年级词库直接内置在 HTML 中。

## 4. 当前页面结构

页面采用一屏式练习布局：

1. 顶部栏
   - 游戏名称：`FingerType Quest`
   - 词库按钮：`Banks`
   - 主按钮：`Start`, `Pause`, `Reset`

2. 设置栏
   - `Word Bank`
   - `Mode`
   - `Round`
   - `Sound`
   - `Voice`

3. 练习区
   - 当前词库标签
   - 当前模式标签
   - 当前单词
   - 字母进度格
   - 当前按键提示
   - `Say Word`
   - `Skip`

4. 统计区
   - `Words`
   - `Accuracy`
   - `WPM`
   - `Mistakes`
   - `Streak`
   - `Best`

5. Typing Coach 区
   - 当前应使用的手指
   - 当前目标键
   - 半透明手指覆盖在键盘上
   - 屏幕键盘
   - 错键说明

6. Word Banks 弹窗
   - `Paste Current List`
   - `Save List`
   - `Current List` 可视词表、数量、添加、逐词编辑、逐词删除、清空
   - `All Added Words` 可视词表、数量、添加、逐词编辑、逐词删除、清空
   - `Done`

## 5. 键盘与手指设计

### 5.1 键盘

键盘使用照片中的 Mac 风格 QWERTY 布局。每一行使用同一套横向定位单位，宽键会真实占位，避免字母键位置被平均拉伸而偏移。

- 功能键行：`esc F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 Power`
- 数字符号行：`` ` 1 2 3 4 5 6 7 8 9 0 - = Backspace ``
- 顶行：`Tab Q W E R T Y U I O P [ ] \`
- Home row：`Caps A S D F G H J K L ; ' Enter`
- 底行：`Shift Z X C V B N M , . / Shift`
- 空格行：`fn control option command Space command option ← ↑/↓ →`

`A S D F` 和 `J K L ;` 是 home row 参照键。

数字键、符号键和功能键用于让屏幕键盘更接近孩子面前的实体键盘，帮助孩子理解键盘整体结构。当前单词练习仍然只要求输入英文单词字母；`Backspace` 会触发“不需要删除”的提示，其他功能键不作为正确输入目标。

键盘交互规则：

- 屏幕键盘和实体键盘共用同一套按键逻辑。
- 默认显示小写字母。
- 按住左侧或右侧 `Shift` 时，字母键临时显示为大写，数字和符号键凸显上层符号。
- 按住左侧或右侧 `Shift` 时，对应的小指必须一直停在该 `Shift` 键上；松开后才回到 home row。
- 松开 `Shift` 后，键盘回到当前基础层。
- 按下 `Caps` 会锁定大写字母显示，再按一次取消。
- 使用实体键盘时，页面以浏览器事件里的真实 `CapsLock` 状态为准，并在 `keydown` 与 `keyup` 都即时校准屏幕键盘。
- 使用屏幕 `Caps` 键时，它只模拟页面内的大写锁定；下一次实体键盘输入会重新以真实键盘状态为准。
- `Caps` 和 `Shift` 同时作用时遵循常见键盘行为：`Shift` 会临时反转字母大小写层。
- 所有屏幕键都可以按下并显示动画，包括功能键、符号键、修饰键和方向键。
- 在练习运行中，字母键按物理键位判断正确性；非字母可打印键会作为错误尝试反馈，但不会输入到单词里。
- `Shift`, `Caps`, `control`, `option`, `command`, `fn` 和方向键主要作为键盘教学反馈，不会让当前单词重来。

### 5.2 手指覆盖层

当前设计把手指画在键盘上，而不是放在键盘外面；手掌已移除，避免遮挡键盘和分散注意力。

视觉要求：

- 手指是半透明的，不能完全遮挡键盘字母。
- 左手四指默认以指尖落在 `A S D F` 键帽上。
- 右手四指默认以指尖落在 `J K L ;` 键帽上。
- 左右大拇指默认落在 `Space`。
- 手指带颜色，用来区分不同手指，但键盘字母仍然清楚可读。

### 5.3 当前指法动画

`Word Practice` 等待某个字母时：

- 对应目标键高亮。
- 对应手指从 home row 位置移动到目标键。
- 目标键上有圆形 pulse 提示。
- 顶部提示条显示类似：`Left Index taps T`。

动画意图：

- 让孩子直观看到“这根手指从哪里出发，去按哪个键”。
- 不只是闪烁文字提示，而是模拟真实打字动作。

`Dictation` 中不使用提前指路动画。键盘和手指只在孩子按键后短暂反馈刚刚按下的字母，避免提前暴露正确答案。

## 6. 指法映射

采用标准 QWERTY 触控打字指法：

| 手指 | Home Key | 负责按键 |
| --- | --- | --- |
| Left Pinky | A | Q, A, Z |
| Left Ring | S | W, S, X |
| Left Middle | D | E, D, C |
| Left Index | F | R, T, F, G, V, B |
| Right Index | J | Y, U, H, J, N, M |
| Right Middle | K | I, K |
| Right Ring | L | O, L |
| Right Pinky | ; | P, ; |
| Thumbs | Space | Space |

数字键沿用相邻字母列的指法颜色：`1` 左小指、`2` 左无名指、`3` 左中指、`4/5` 左食指、`6/7` 右食指、`8` 右中指、`9` 右无名指、`0` 右小指。

当前单词练习主要使用英文小写字母，`Space` 和其他功能键目前作为键盘结构参照，不作为普通单词输入目标。

## 7. 游戏流程

1. 孩子选择词库、模式和一轮单词数量。
2. 点击 `Start`。
3. 游戏根据所选词库生成本轮词表：
   - 内置年级词库：按 `Round` 随机抽取 10、20 或 30 个词。
   - `Current List`：必须覆盖当前列表里的全部词，不使用 `Round` 随机数量。
   - `All Added Words`：30 个词以内覆盖全部词；超过 30 个词时按 `Round` 随机抽取 10、20 或 30 个词。
   - 上述所有本轮词表都会先随机打乱顺序，再开始练习或听写。
4. `Word Practice` 显示当前单词；`Dictation` 隐藏当前单词并显示 `listen`。
5. `Word Practice` 中，当前要输入的字母在字母进度格中高亮。
6. `Word Practice` 中，Typing Coach 显示目标键和应使用的手指。
7. `Dictation` 中，Typing Coach 不提前显示目标键、目标字母、目标手指或单词总字母数。
8. `Dictation` 中，浏览器自动播放当前单词三遍，每遍开始时间间隔 3 秒。
9. 孩子按键。
10. 如果按对：
   - 当前字母变为完成状态。
   - `Dictation` 中刚打对的字母会显示出来。
   - 进入下一个字母。
   - `Word Practice` 中手指动画移动到下一个目标键。
   - `Dictation` 中键盘和手指只短暂反馈刚刚按对的字母。
11. 如果按错：
   - 错误字母不会出现在单词中。
   - 当前字母不前进。
   - 播放错误提示音。
   - 错误次数增加。
   - `Word Practice` 显示正确按键和手指提示。
   - `Dictation` 不显示正确字母，只提示继续听并重试。
12. 当前单词完成后，短暂停顿，然后自动进入下一个单词。
13. 完成一轮后显示完成提示。

## 8. 错误处理

儿童友好的错误策略：

- 错误按键不会被输入。
- 不重置当前单词。
- 不要求重新输入整个单词。
- 不要求按 Backspace。
- 错误会计入 `Mistakes`。
- `Accuracy` 根据正确输入和错误尝试实时计算。
- `Sound` 打开时播放短促、轻柔的错误音。
- `Word Practice` 错误提示示例：`Try again: press T with your Left Index.`
- `Dictation` 错误提示示例：`Not that letter. Listen and try again.`

设计原因：

- 防止孩子看到错误拼写并形成错误视觉记忆。
- 降低挫败感。
- 保留即时纠错和准确率反馈。

## 9. 练习模式

### Word Practice

主模式。根据所选 `Word Bank` 练习英文单词，完整显示当前单词。

适合：

- 每天常规练习。
- 单词拼写和键盘位置同步熟悉。

### Dictation

听写模式。浏览器先读出当前单词，页面不显示完整单词，只显示 `listen` 和已经输入正确的字母。

交互规则：

- 当前单词自动播放三遍，每遍开始时间间隔 3 秒。
- `Say Word` 在听写模式下也会按三遍规则重播当前单词。
- 打对一个字母，就显示一个字母。
- 没打出来的字母不显示占位格、短横线或任何数量提示，避免暴露单词总字母数。
- 打错不会显示错误字母。
- Typing Coach 不提前高亮目标键，不显示目标字母，也不提前移动目标手指。
- 孩子按下某个字母后，键盘和对应手指才短暂反馈刚刚按下的字母。
- 错键时只反馈“按下的是哪个键”和错误音，不显示正确答案。

适合：

- 孩子已经见过这组词，想练听音拼写。
- 家长希望同一组单词既能看词打字，也能听写巩固。

## 10. 词库策略

词库入口统一为 `Word Bank`，孩子可以选择内置 California K-8 年级词库、Mia 当前课程词库或 Mia 历史累计词库。

### 10.1 内置年级词库

内置词库参考 California K-8 英语语言艺术学习目标来分级，覆盖基础拼读、常见词、拼写、词汇习得、通用学术词和跨学科词汇。

重要说明：

- California Department of Education 的 standards 页面提供的是学习标准，例如 Vocabulary Acquisition and Use，不是一个官方可下载的完整 K-8 儿童词表。
- 当前实现删除了在线更新入口，把 K-8 练习词库直接内置在 HTML 中。
- 每次点击 `Start` 时，游戏会从所选年级词库随机抽取 `Round` 设定的 10、20 或 30 个词。
- 后续如果有学校、老师或 Mia 课程提供的词表，可以通过 `Banks` 添加到自定义词库，不需要改代码。

参考来源：

- California Content Standards Search: https://www2.cde.ca.gov/cacs/
- CDE Content Standards: https://www.cde.ca.gov/BE/ST/SS/index.asp
- CDE Common Core Resources: https://www.cde.ca.gov/re/cc/

年级范围：

| 年级 | 练习重点 |
| --- | --- |
| Kindergarten | CVC 单词、颜色、家庭、学校常见词 |
| Grade 1 | sight words、简单动词、常见短词 |
| Grade 2 | 更长常见词、家庭、自然和生活词 |
| Grade 3 | 描述词、课堂词汇、早期学术词 |
| Grade 4 | 学术动词、阅读、科学和社区词 |
| Grade 5 | 信息文本、多音节词和跨学科词 |
| Grade 6 | 初中通用学术词 |
| Grade 7 | 分析、评价和跨学科表达 |
| Grade 8 | 更强的学术和技术词 |

### 10.2 自定义词库

`Banks` 打开词库管理弹窗。

家长可以管理两个固定自定义词库：

- `Current List`：当前课程词库。
- `All Added Words`：历史累计词库，保存所有添加过的词。

弹窗结构：

- `Paste Current List`：可一次粘贴一组课程词，支持逗号、空格或一行一个单词。
- `Save List`：用粘贴区内容替换 `Current List`，并把这些词合并到 `All Added Words`。
- `Current List` 面板：直接显示当前列表所有词，显示总词数，可新增、逐词修改、逐词删除或清空。
- `All Added Words` 面板：直接显示历史累计所有词，显示总词数，可新增、逐词修改、逐词删除或清空。
- `Done`：关闭弹窗。

自定义词库练习规则：

- 这两个自定义词库始终出现在 `Word Bank` 下拉菜单的 `Custom Mia Banks` 分组里。
- 选择 `Current List` 练习或听写时，必须覆盖当前列表里的每一个词。
- 选择 `Current List` 时，每轮都会先打乱当前列表顺序，再完整覆盖全部词。
- 选择 `Current List` 时，`Round` 下拉菜单自动变灰，因为本轮总数由当前列表总词数决定。
- 选择 `All Added Words` 且总词数不超过 30 个时，也覆盖全部词，`Round` 下拉菜单自动变灰。
- 选择 `All Added Words` 且总词数不超过 30 个时，每轮也会先打乱顺序，再完整覆盖全部词。
- 选择 `All Added Words` 且总词数超过 30 个时，`Round` 下拉菜单可用，每轮随机抽取 10、20 或 30 个词。
- `Words` 统计显示本轮实际总数，例如 `0 / 17` 或 `0 / 30`。
- 清空 `Current List` 不影响 `All Added Words`。
- 清空 `All Added Words` 不影响 `Current List`。
- 修改或新增 `Current List` 中的词时，新词会合并进 `All Added Words`；从 `Current List` 删除词不会自动从 `All Added Words` 删除，家长可以在 `All Added Words` 面板单独删除。

输入清洗规则：

- 所有词统一转为小写。
- 只保留英文字母。
- 自动去重。
- 允许 1 个字母的词，例如 `a` 和 `I`。
- 单词长度限制为 1 到 16 个字母。

## 11. 声音与语音

### Sound

控制错误提示音。

实现：

- 使用浏览器 Web Audio API 本地生成。
- 不加载外部音频文件。

### Voice

控制单词发音。

实现：

- 使用浏览器 SpeechSynthesis API。
- 发音语言设为 `en-US`。
- `Word Practice` 中每个单词播放 1 遍。
- `Dictation` 中每个单词播放 3 遍，每遍开始时间间隔 3 秒。
- `Say Word` 遵循当前模式：普通练习读 1 遍，听写读 3 遍。
- `Pause`, `Reset`, `Skip` 或进入下一个词时，会清除尚未播放的排队发音。
- 如果浏览器不支持，会自动关闭相关控件。

## 12. 数据与状态

游戏状态保存在浏览器内存中：

- 当前词库 ID
- 当前模式
- 当前单词队列
- 当前单词位置
- 当前字母位置
- 正确字符数
- 错误次数
- 已完成单词数
- 连续正确单词数
- 开始时间和暂停时间

持久化数据：

- 设置项保存在 `localStorage`。
- Mia 当前课程词库保存在 `localStorage`。
- Mia 历史累计词库保存在 `localStorage`。
- 最好成绩按词库和模式保存在 `localStorage`。

不保存：

- 孩子姓名
- 登录信息
- 远程账号信息
- 个人身份信息

网络请求：

- 当前版本没有练习时网络请求。
- Online CA Standards Mix 已删除。
- 所有内置 K-8 年级词库都直接存放在 `index.html` 中。

## 13. 技术实现

当前实现为单文件：

- `index.html`

包含：

- HTML 结构
- CSS 布局与动画
- JavaScript 游戏逻辑
- 内置 California K-8 年级词库
- Mia 当前课程词库和历史累计词库的本地保存逻辑
- 本地图标

没有使用：

- 构建工具
- 外部 JavaScript 库
- 后端服务
- 登录系统

主要 JavaScript 模块概念：

- `wordBanks`：按年级分组的单词库。
- `californiaVocabularyBank`：补充的本地 California K-8 核心词库。
- `customCurrentWords`：Mia 当前课程词库，只保存最近一次新增的词。
- `customAllWords`：Mia 历史累计词库，保存所有添加过的词并自动去重。
- `activeRoundSize`：当前这一轮实际需要完成的词数，支持自定义词库完整覆盖。
- `getRoundTargetSize()`：根据词库类型决定本轮使用完整词表还是使用 `Round` 随机数量。
- `buildRoundQueue()`：先按词库规则确定本轮词数，再随机打乱词汇顺序并生成本轮队列。
- `updateRoundControl()`：当 `Round` 不适用于当前自定义词库时禁用下拉菜单。
- `parseWords()`：清洗、去重、过滤词表输入。
- `renderBankOptions()`：生成 `Word Bank` 下拉菜单。
- `renderCustomWordLists()`：刷新 `Current List` 和 `All Added Words` 两个可视词表。
- `renderWordList()`：生成每个词的可编辑行和删除按钮。
- `addWordsToList()`：向当前列表或历史列表新增单词。
- `updateWordAt()`：逐词修改当前列表或历史列表。
- `removeWordAt()`：逐词删除当前列表或历史列表。
- `functionKey()` / `letterKey()` / `dualKey()` / `arrowStackKey()`：声明屏幕键盘中的功能键、字母键、上下双字符键和方向键堆叠。
- `keyToFinger`：键到手指的映射。
- `fingerHomeKeys`：每根手指默认放置的 home key。
- `renderKeyboard()`：生成带数字键和功能键的完整屏幕键盘。
- `bindVirtualKey()`：把屏幕键盘按下、松开和点击行为接到统一按键逻辑。
- `normalizeKeyboardEvent()`：把实体键盘事件转换成屏幕键盘的键位 ID。
- `readCapsLockState()` / `syncCapsLockFromEvent()`：从真实键盘事件中读取并同步系统 `CapsLock` 状态。
- `heldShiftKeyForFinger()`：判断左右小指是否正在按住对应 `Shift`，用于把该小指的静止位置临时锚定到 `Shift` 键。
- `pressKey()` / `releaseKey()`：处理真实键盘和屏幕键盘的按下、松开、Shift 按住和 Caps 锁定，并让 Caps 视觉先更新再播放反馈动画。
- `updateKeyboardLayer()`：根据 `Shift` 和 `Caps` 状态更新字母大小写和符号层视觉。
- `flashKeyFeedback()` / `animateFingerForKey()`：让任意键触发键帽反馈、手指移动和目标圈动画。
- `showPressedCoach()`：在 Typing Coach 中显示刚按下的键和对应手指。
- `renderWord()`：根据 `Word Practice` 或 `Dictation` 渲染完整单词或只显示已打对的听写字母。
- `placeHomeFingers()`：把手指定位到 home row 和 Space。
- `updateMotionCue()`：在 `Word Practice` 中根据目标键移动对应手指，并定位目标键 pulse。
- `speakCurrentWord()`：根据当前模式播放 1 遍或排队播放 3 遍。
- `clearSpeechQueue()`：清除尚未播放的语音计时器并停止当前语音。
- `handlePracticeKey()`：处理练习运行中的正确、错误和非输入型按键。
- `handleWrongKey()`：处理错误提示。
- `shouldIgnoreGlobalKey()`：词库弹窗或输入框获得焦点时，阻止练习键盘逻辑拦截普通文字输入。
- `updateStats()`：更新统计。

## 14. 当前验收状态

已经检查：

- 页面可以打开。
- 游戏界面无中文文案。
- `Start` 后单词、统计、手指和键盘在 1280 x 720 窗口中同屏可见。
- `Start` 后单词、统计、手指和键盘在 1280 x 650 窗口中也能完整显示。
- 屏幕键盘包含数字行、`Tab`, `Caps`, `Shift`, `Enter`, `Backspace`, `control`, `option`, `command`, `Space` 等参照键。
- 屏幕键盘按参考照片的 Mac 风格键位排布，包含真实宽键占位、符号键、功能键行和方向键区。
- 屏幕键盘默认显示小写字母，`Caps` 可锁定大写显示。
- 左右 `Shift` 都由对应小指操作；按住 `Shift` 时字母键临时大写，数字符号键凸显上层符号。
- 所有屏幕键都可以按下并显示键帽、手指和 Typing Coach 反馈。
- 键盘区域上方空白已缩小，数字行和功能键使用原先多余空间。
- 左手四指的指尖落在 `A S D F` 键帽范围内。
- 右手四指的指尖落在 `J K L ;` 键帽范围内。
- 大拇指落在 `Space`。
- 手掌已移除，只保留手指覆盖层。
- 目标键高亮。
- 目标手指会移动到目标键。
- `Word Practice` 中会提前提示目标键和目标手指。
- `Dictation` 中不会提前提示目标键、目标字母或目标手指。
- `Dictation` 中按下字母后，键盘和手指只反馈刚刚按下的字母。
- `Dictation` 中当前单词会播放三遍，每遍开始时间间隔 3 秒。
- 错键不会写入单词。
- 错键后错误次数增加。
- 错键后仍停留在当前字母。
- 浏览器控制台无错误。
- `Banks` 可以打开自定义词库弹窗。
- `Banks` 弹窗能同时直接看到 `Current List` 和 `All Added Words` 的全部词与各自总数。
- `Current List` 可以新增词、逐词修改、逐词删除和清空。
- `All Added Words` 可以新增词、逐词修改、逐词删除和清空。
- `Word Bank` 中始终有 `Current List` 和 `All Added Words` 两个自定义词库。
- `Banks` 弹窗不再提供自定义词库名称输入，当前课程词库固定叫 `Current List`。
- 保存 Mia 新词后，当前课程词库只包含本次新增词。
- 保存 Mia 新词后，历史累计词库包含所有添加过的词并自动去重。
- 选择 `Current List` 后，`Word Practice` 和 `Dictation` 都覆盖当前列表全部词，`Round` 自动禁用，`Words` 统计显示实际总数。
- 选择 `All Added Words` 且总词数不超过 30 个时，练习和听写覆盖全部词，`Round` 自动禁用。
- 选择 `All Added Words` 且总词数超过 30 个时，每轮按 `Round` 随机抽取 10、20 或 30 个词。
- `Current List` 和 `All Added Words` 的完整覆盖轮次不会按列表原始顺序出题，而是每轮先随机打乱。
- `Dictation` 模式隐藏完整单词和总字母数量，只在字母打对后逐字显示。
- Online CA Standards Mix 入口已删除。
- 内置年级词库每次点击 `Start` 都按 `Round` 随机抽取 10、20 或 30 个词。

仍可继续优化：

- 手指形状可以进一步画得更像真实儿童教学图。
- 可以增加“只练左手”“只练右手”“只练 home row”等模式。
- 可以增加每个年级更多词。
- 可以增加导入/导出自定义词库文件。

## 15. 更新记录

### 2026-09-05

- 创建初版 HTML 打字游戏。
- 加入 Kindergarten 到 Grade 8 词库。
- 加入 `Word Practice` 和 `Finger Drill`。
- 加入错键不输入、不重来、不需要删除的练习逻辑。
- 加入统计、发音和错误提示音。
- 第一次重构：把单词、统计、指法提示和键盘放到同屏布局中。
- 第二次重构：把独立 Finger Guide 改成键盘上的半透明指法覆盖层。
- 加入 `;` 和 `Space` 键作为 home row 与大拇指位置参照。
- 加入从 home row 移动到目标键的手指动画。
- 明确规定以后任何改动必须同步更新本设计文档。

### 2026-09-06

- 调整手指定位方式：四指以指尖为锚点贴在 `A S D F` 和 `J K L ;` 键帽上，而不是整根手指悬在键帽上方。
- 缩短手指视觉高度，让半透明手指覆盖键盘时更紧凑。
- 压缩顶部栏、设置栏、练习区、统计区和 Typing Coach 的垂直间距。
- 增加低高度桌面窗口的紧凑布局，在 1280 x 650 下仍能完整显示单词、统计、手指、键盘和 Space。
- 将设置项从 `Grade` 升级为 `Word Bank`，支持内置年级词库和自定义词库。
- 新增 `Banks` 弹窗，支持保存 Mia 当前课程词库并累计到 Mia 历史词库。
- 将 `Finger Drill` 模式替换为 `Dictation` 模式：完整单词隐藏，正确输入后逐字显示。
- 移除早先的 `Update CA Mix` / `Refresh CA Mix` 在线刷新方向，当前版本不再保留联网 CA Mix。
- 更新本设计文档，明确以后所有功能、交互和词库改动都必须同步记录。
- 移除键盘上的半透明手掌，只保留当前手指层和目标手指动画，让键盘区域更清爽。
- 删除 Online CA Standards Mix 入口和联网刷新逻辑，改为完全本地内置 California K-8 年级核心词库。
- 扩充内置 K-8 年级词库，并在每次 `Start` 时按 `Round` 随机抽取 10、20 或 30 个词。
- 将自定义词库改为两个固定 Mia 词库：当前课程词库只保存本次新增词，历史累计词库保存所有添加过的词。
- 将 `Banks` 弹窗改为固定的 Mia 当前课程词库和历史累计词库管理入口。
- `Dictation` 发音改为每个单词播放三遍，每遍开始时间间隔 3 秒。
- `Dictation` 不再提前提示目标键、目标字母或目标手指，只对孩子实际按下的字母做键盘和手指反馈。
- 重新设计 `Banks` 弹窗：同时显示 `Current List` 和 `All Added Words`，每个词都可以直接编辑或删除，两个列表都可以新增和清空。
- 更新自定义词库出题规则：`Current List` 总是覆盖全部词；`All Added Words` 在 30 个以内覆盖全部词，超过 30 个才按 `Round` 随机抽取。
- 当当前自定义词库覆盖全部词时，`Round` 下拉菜单自动禁用，并由 `Words` 统计显示本轮实际总词数。
- 修复词库弹窗输入体验：弹窗打开或输入框获得焦点时，练习键盘监听不会拦截家长正在输入的单词。

### 2026-09-07

- 删除 `Current List Name`，自定义当前课程词库固定显示为 `Current List`。
- 简化 `Banks` 弹窗：顶部只保留粘贴当前词表入口，下方保留 `Current List` 和 `All Added Words` 两个直接可编辑清单。
- `Dictation` 不再显示未输入字母的占位格或短横线，避免暴露单词总字母数。
- 扩展屏幕键盘：新增数字行、`Tab`, `Caps`, `Shift`, `Enter`, `Backspace`, `control`, `option`, `command` 等参照键。
- 压缩 Typing Coach 键盘区域上方空白，让数字行和功能键进入原先较空的位置。
- 保持自定义词库覆盖规则不变，同时明确 `Current List` 和 `All Added Words` 的练习、听写顺序每轮都要随机打乱。
- 根据用户提供的实体键盘照片重排屏幕键盘：改为统一 58 单位横向网格，宽键真实占位，加入 `esc`、`F1-F12`、`Power`、符号键和方向键，使字母键位置更接近真实键盘。
- 将屏幕键盘升级为完整交互键盘：所有键都可以按下并显示反馈，`Shift` 按住时切换临时大写和上层符号，`Caps` 可锁定大写显示。
- 新增统一按键逻辑，让实体键盘和屏幕键盘共用同一套动画、指法和练习判断。
- 修正实体键盘 `CapsLock` 同步：真实键盘输入会优先使用浏览器提供的系统 Caps 状态，`keydown` 与 `keyup` 都会校准，Caps 显示层也改为先更新再播放动画，减少按下后的视觉延迟。
- 修正 `Shift` 长按指法：左/右 `Shift` 被按住时，对应小指会保持停在 `Shift` 键上，不会被 home row 或其他按键动画提前拉回。

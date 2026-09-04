<h1 align="center">GitHub Follower Watchdog</h1>

<p align="center"><strong>مراقبة ساعية لمتابعي حسابك على GitHub — تعمل داخل CI، وتُسجَّل في git، وتُنشر عبر Pages</strong></p>

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/langyo/github-follower-watchdog/blob/master/LICENSE)
[![GitHub](https://img.shields.io/badge/github-langyo%2Fgithub--follower--watchdog-blue.svg)](https://github.com/langyo/github-follower-watchdog)

</div>

<div align="center">

[English](../../../README.md) ·
[简体中文](../../zh-CN/guides/README-github-follower-watchdog.md) ·
[繁體中文](../../zh-TW/guides/README-github-follower-watchdog.md) ·
[日本語](../../ja/guides/README-github-follower-watchdog.md) ·
[한국어](../../ko/guides/README-github-follower-watchdog.md) ·
[Français](../../fr/guides/README-github-follower-watchdog.md) ·
[Español](../../es/guides/README-github-follower-watchdog.md) ·
[Русский](../../ru/guides/README-github-follower-watchdog.md) ·
**العربية**

</div>

‏GitHub Follower Watchdog هو مراقِب متابعين بلا خادم يعيش بالكامل داخل مستودع واحد، ويعمل في ثلاث حركات:

1. **فحص ساعي** — مهمة مجدولة على GitHub Actions تشغّل سكربت Python يعتمد على المكتبة القياسية فقط (بلا `pip install` وبلا خطوات تجهيز)، يتصفّح واجهة المتابعين العامة صفحةً صفحة وينتهي في ثوانٍ.

2. **تسجيل الفروق في git** — كل تشغيل يقارن القائمة الجديدة بـ `data/current.json` ويضيف أحداث المتابعة وإلغاء المتابعة إلى السجل القابل للإلحاق فقط `data/history.jsonl`. التغييرات الحقيقية وحدها تُنشئ commit ‏(`🔄 Sync follower snapshot.`)؛ الساعة الهادئة لا تكتب شيئًا إطلاقًا — فسجل git هو نفسه سجل التغييرات.

3. **لوحة متابعة تُنشر عبر Pages** — مع كل تغيير يُعاد نشر لوحة صفحة واحدة ‏(Vue 3 · TSX · SCSS · vue-i18n، بثماني لغات، بمظهر داكن وفاتح) تعرض اتجاه عدد المتابعين، وخط زمني للمتابعات وإلغاءاتها، والقائمة الحالية.

وإلى جانب القائمة الخام، يجمع الـ watchdog **ملفًا تعريفيًا لكل متابع ضمن حدود صارمة لحدود المعدل** (حجم المساهمات في السنة الأخيرة، وتوازن المتابعة/المتابعين، وعدد المستودعات العامة، واكتمال الملف الشخصي، وعمر الحساب)، وتحوّل لوحة المتابعة هذه الوقائع إلى درجة شفافة من 0 إلى 100 تفصل البشر المحتملين عن بوتات المتابعة الجماعية المشبوهة.

اعمل fork للمستودع ويصبح **لك**: الحساب المراقَب يُستنتج تلقائيًا من مالك المستودع، والسجلات الموروثة تُصفَّر عند أول تشغيل في الـ fork، ويسهِر نفس الـ workflow على تفعيل GitHub Pages للـ fork ونشره تلقائيًا.

## البدء السريع

كل ما يلي يستغرق نحو دقيقتين بعد الـ fork.

1. **اعمل fork للمستودع** — الاسم حر؛ يفترض ما يلي أنك أبقيت الاسم `github-follower-watchdog`.

2. **فعِّل Actions في الـ fork** — افتح في المتصفح `https://github.com/<أنت>/github-follower-watchdog/actions`. يعطّل GitHub مهام الـ workflows في الـ forks الجديدة افتراضيًا؛ انقر **I understand my workflows, go ahead and enable them**.

3. **شغِّل أول فحص** — من نفس صفحة Actions، اختر **Watch** من الشريط الجانبي ← **Run workflow** ← **Run workflow**. (يمكنك رفع *Max accounts to enrich* هنا إن أردت اكتمال الدرجات أسرع.) التشغيل الأول يسجِّل متابعيك الحاليين كخط أساس وينشر موقعك.

4. **افتح لوحتك** — ‏`https://<أنت>.github.io/github-follower-watchdog/`. بعدها يتحدّث من نفسه كل ساعة، عندما يتغيّر شيء.

إذا توقف التشغيل الأول عند خطوة *Configure Pages* — يرفض GitHub أحيانًا أن ينشئ رمز الـ workflow الموقع — فافتح `https://github.com/<أنت>/github-follower-watchdog/settings/pages` واجعل **Source** هو **GitHub Actions** ثم شغِّل **Watch** مرة أخرى.

**ملء الدرجات أسرع (اختياري لكنه موصى به).** رمز الـ Actions يعيش تحت حدود معدل أشد من رمزك أنت، والـ CI لا يُثري أكثر من `WATCH_ENRICH_CAP` ‏(افتراضيًا 40) حسابًا في كل تشغيل ساعي. مع قائمة صغيرة هذا مجرد إحماء لطيف — لكن مع ألف متابع فهذا يعني نحو 25 ساعة من تشغيلات الـ CI تطحن طلبات التعبئة الرجعية المخنوقة قبل أن تحمل كل بطاقة درجة. نفّذ المرحلة الأولى على جهازك أنت، حتى قبل تفعيل أي شيء:

```bash
git clone https://github.com/<أنت>/github-follower-watchdog
cd github-follower-watchdog && npm --prefix site install
export GITHUB_TOKEN=$(gh auth token)   # رمزك أنت: 5000 طلب/ساعة
WATCH_ENRICH_CAP=200 just watch        # أعد التشغيل حتى يطبع «no changes»
```

ثم اعمل commit لسجلات `data/` الناتجة على فرع، وافتح PR وادمجه — أول تشغيل ساعي تالٍ يتبنى الملف ولا يحدّث إلا ما قدِم.

**أين تعيش البيانات.** ‏`data/current.json` هي القائمة الحالية، و`data/history.jsonl` سجل المتابعة وإلغائها القابل للإلحاق فقط، و`data/accounts.json` وقائع كل حساب التي تقوم عليها الدرجات. الثلاثة يكتبها الـ CI وحده وتُرفع إلى الـ fork الخاص بك — و`git log -- data/` هو خط التدقيق الكامل: لا خدمات خارجية، ولا قواعد بيانات، ولا شيء تستثني git من الثقة به.

**مراقبة شخص آخر.** اضبط `WATCH_USER` في `.github/workflows/watch.yml` (أو مرِّر الحساب وسيطًا إلى `just watch <اسم المستخدم>` محليًا) لمراقبة أي حساب عام بدلًا من حسابك.

## كيف يعمل

- ‏`scripts/watchdog.py` — المُجلب بالكامل: تصفّح محدود الصفحات، وكتابة ذرّية، وترتيب «اللقطة أولًا ثم التاريخ» (التشغيل المتوقف قد يفقد سطرًا واحدًا من الخط الزمني لكنه لا يكرّر الأحداث أبدًا)، وقاعدة صارمة: عند أي فشل في الـ API لا تُكتب أي بيانات لللقطة. ومرحلة ثانية من بذل الجهد تُثري حتى `WATCH_ENRICH_CAP` ‏(افتراضيًا 40، بحد أقصى 200) حسابًا في كل تشغيل عبر واجهة REST للمستخدم استعلامًا واحدًا مجمّعًا على GraphQL، ولا تكتب إلا إذا تغيّرت واقعة فعليًا.
- ‏`data/current.json` + `data/history.jsonl` + `data/accounts.json` — السجلات نفسها؛ **لا يكتبها إلا الـ CI** ‏(AGENTS.md §5).
- ‏`.github/workflows/watch.yml` — cron ساعي + تشغيل يدوي + push: ‏watchdog ← commit عند التغيير ← بناء الموقع ← النشر على Pages. الساعات بلا تغييرات تتخطى البناء وتنتهي في نحو 20 ثانية، ومسار التغيير يبقى حول الدقيقة. (يعطّل GitHub المهام المجدولة بعد 60 يومًا من خمول المستودع — وcommits البيانات نفسها تُحتسب نشاطًا.)
- ‏`site/` — لوحة المتابعة. ‏Vite + Vue 3 عبر TSX ‏(بلا ملفات `.vue`) + SCSS + vue-i18n، بثماني لغات. تُنسخ السجلات كما هي إلى حِزمة البناء كأصول عامة ويجلبها الـ page في وقت التشغيل، لذا فإن تغيير البيانات وحده لا يتطلب إعادة بناء التطبيق أبدًا؛ وحساب الدرجات يتم بالكامل في المتصفح ‏(`site/src/data/scoring.ts`).

## نموذج الدرجة

الدرجة مصمَّمة عمدًا لتكون قابلة للتفسير — تُجمع نقاط على إشارات الإنسان الكلاسيكية، ثم يعاقب مضروبان شكليَي البوت الكلاسيكيين:

| الإشارة | النقاط |
| --- | --- |
| توازن المتابعة/المتابعين (صفر متابعة، أو نسبة ≤ 2) | حتى +25 |
| المساهمات في السنة الأخيرة (GraphQL) | حتى +30 |
| المستودعات العامة | حتى +15 |
| اكتمال الملف الشخصي (الاسم، النبذة، الشركة، الموقع، المدونة) | حتى +10 |
| عمر الحساب | حتى +15 |
| شكل «المتابعة الجماعية» (متابعة ≥ 500 ومتابعون < 50) | × 0.5 |
| شكل «الحساب الفارغ» (لا مساهمات ولا مستودعات) | × 0.6 |

يمكن التصفية في اللوحة حسب المجموعات: **بشر** (≥ 60) و**مشبوهون** (30–59) و**مشبهون بالبوتات** (< 30). تُحدَّث الملفات التعريفية تدريجيًا (بعيّنة عشوائية، نحو 40 حسابًا في الساعة) دون أن تقترب من حدود المعدل قط.

## التطوير المحلي

```bash
npm --prefix site install   # مرة واحدة
just watch                  # تشغيل واحد للـ watchdog (الهدف: مالك origin، أو مرِّر اسم مستخدم)
just dev                    # خادم تطوير الموقع على :5174
just build                  # فحص الأنواع + بناء الإنتاج
just lint-msg               # فحص عناوين الـ commits في master..HEAD (AGENTS.md §1)
```

‏`GITHUB_TOKEN` اختياري لمجرد قراءة قائمة المتابعين، لكن إثراء الحسابات (أي الدرجات) لا يعمل إلا بوجود رمز في البيئة — ‏`export GITHUB_TOKEN=$(gh auth token)`.

## الوثائق

‏READMEs المترجمة موجودة في [`docs/`](../../) ‏(`docs/<lang>/guides/README-github-follower-watchdog.md`، ثماني لغات غير هذه). قواعد المستودع — لوكلاء الذكاء الاصطناعي والمساهمين البشر على السواء — في [`AGENTS.md`](../../../AGENTS.md).

المصدر: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).

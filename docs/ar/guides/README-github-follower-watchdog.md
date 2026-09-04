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

اعمل fork للمستودع ويصبح **لك**: الحساب المراقَب يُستنتج تلقائيًا من مالك المستودع، والسجلات الموروثة تُصفَّر عند أول تشغيل في الـ fork، ويسهِر نفس الـ workflow على تفعيل GitHub Pages للـ fork ونشره تلقائيًا. بنية الواجهة وبنية البناء وقواعد المستودع منقولة عن [wowsp](https://github.com/langyo/wowsp).

## البدء السريع

1. اعمل fork للمستودع.
2. فعِّل **Actions** في الـ fork — يعطّل GitHub مهام الـ workflows في الـ forks الجديدة افتراضيًا (Repository → Actions → «I understand my workflows, go ahead and enable them»).
3. شغِّل الـ workflow المسمى **Watch** مرة واحدة عبر **Run workflow** — التشغيل الأول يسجِّل متابعيك الحاليين كخط أساس وينشر موقعك على Pages.
4. افتح `https://<أنت>.github.io/github-follower-watchdog/` — بعدها يتحدّث من نفسه كل ساعة.

إذا فشل التشغيل الأول عند خطوة *Configure Pages* — يرفض GitHub أحيًا أن ينشئ رمز الـ workflow الموقع — فعِّله مرة واحدة عبر **Settings → Pages → Source: GitHub Actions** ثم أعد تشغيل الـ workflow.

لمراقبة أي حساب عام آخر، اضبط `WATCH_USER` في `.github/workflows/watch.yml`.

## كيف يعمل

- ‏`scripts/watchdog.py` — المُجلب بالكامل: تصفّح محدود الصفحات، وكتابة ذرّية، وترتيب «اللقطة أولًا ثم التاريخ» (التشغيل المتوقف قد يفقد سطرًا واحدًا من الخط الزمني لكنه لا يكرّر الأحداث أبدًا)، وقاعدة صارمة: عند أي فشل في الـ API لا تُكتب أي بيانات.
- ‏`data/current.json` + `data/history.jsonl` — السجلات نفسها؛ **لا يكتبها إلا الـ CI** ‏(AGENTS.md §5)، كل تغيير = إلحاق واحد + commit واحد.
- ‏`.github/workflows/watch.yml` — cron ساعي + تشغيل يدوي + push: ‏watchdog ← commit عند التغيير ← بناء الموقع ← النشر على Pages. الساعات بلا تغييرات تتخطى البناء وتنتهي في نحو 20 ثانية، ومسار التغيير يبقى أقل من دقيقة بهامش مريح. (يعطّل GitHub المهام المجدولة بعد 60 يومًا من خمول المستودع — وcommits البيانات نفسها تُحتسب نشاطًا.)
- ‏`site/` — لوحة المتابعة. ‏Vite + Vue 3 عبر TSX ‏(بلا ملفات `.vue`) + SCSS + vue-i18n، على بنية موقع wowsp نفسها. تُنسخ السجلات كما هي إلى حِزمة البناء كأصول عامة ويجلبها الـ page في وقت التشغيل، لذا فإن تغيير البيانات وحده لا يتطلب إعادة بناء التطبيق أبدًا.

## التطوير المحلي

```bash
npm --prefix site install   # مرة واحدة
just watch                  # تشغيل واحد للـ watchdog (الهدف: مالك origin، أو مرِّر اسم مستخدم)
just dev                    # خادم تطوير الموقع على :5174
just build                  # فحص الأنواع + بناء الإنتاج
just lint-msg               # فحص عناوين الـ commits في master..HEAD (AGENTS.md §1)
```

‏`GITHUB_TOKEN` اختياري محليًا — يرفع حد الـ API من 60 إلى 5000 طلب في الساعة.

## الوثائق

‏READMEs المترجمة موجودة في [`docs/`](../../) ‏(`docs/<lang>/guides/README-github-follower-watchdog.md`، ثماني لغات غير هذه). قواعد المستودع — لوكلاء الذكاء الاصطناعي والمساهمين البشر على السواء — في [`AGENTS.md`](../../../AGENTS.md).

المصدر: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).

## الحالة

🎉 **جاهز** — المراقبة الساعية والتاريخ المسجَّل في git ولوحة الـ Pages تعمل جميعها؛ كما يفعّل الـ workflow صفحة Pages في الـ forks الجديدة تلقائيًا. خارطة الطريق قصيرة عمدًا: مزيد من لغات الصفحة، ووضع فوري قائم على webhook، هما الفكرتان الوحيدتان في القائمة.

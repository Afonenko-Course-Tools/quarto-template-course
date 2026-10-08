---
type: plan
component: template-course
status: in-progress
updated: 2026-10-08
---

# Документация-шаблон и gh-pages: план владельца

Статус: первая публикация шагов 14–15 выполнена: main `8b050033…`,
gh-pages `a55b0e3…`, Core 4.0.0. Для выявленного student book href/caption
выпущены Core 4.0.1 и новый core demo; native локальные проверки прошли
в отдельном worktree. Независимое review/CI/merge и повторная публикация ожидаются. Пункты 14–15/17–18
[линейного плана](../../../quarto-course/docs/plans/2026-10-08-course-tools-implementation.md).
Сначала читать [действующие контракты Core 4.0.1](https://github.com/Afonenko-Course-Tools/quarto-course/blob/v4.0.1/spec/index.md).
Весь шаблон, его инструкции/проекты и тексты готовить на ultra, если настройка
поддерживается; локальные проверки — до финального CI. Ресурсы/дедлайн —
общие условия главного плана.

## 1. Руководство по авторской разметке

Сохранить обычный native website; менять `index.qmd`, `_quarto.yml`, README,
`guide/*.qmd`, `extensions/index.qmd`, `catalog/index.qmd`, `Taskfile.yml` и
`tests/{site.cjs,fetch.py}`. В sidebar включить все руководства, а обслуживание
самого сайта (fetch/check/publish) объяснять в README, не в начале работы автора.

Каждый внешний контрактный факт получает авторскую страницу и небольшой
копируемый Markdown/YAML с объяснением ситуации и результата. Ready пример —
дополнение, а не единственное объяснение. Не писать второй нормативный контракт:
ссылаться на владельца/конкретный release tag и проверять тот же результат.

| Страница | Что автор сможет сделать |
| --- | --- |
| `guide/index.qmd`, `start.qmd` | Выбрать средство, установить/включить его; обычный website/book/Reveal без банка |
| `guide/model.qmd`, новая `exercises.qmd` | Включить банк; собственные difficulty/time, statement-visibility и default; сравнить стандартный exr вне банка; оформить разные задачи и target/project |
| Новая `solutions.qmd` | Парный sol-ID и анонимная вложенная solution; открытое условие без публичного решения и явная demonstration |
| Новая `roles.qmd` | Все оставшиеся course-role: значение, допустимые контексты exr/Div/материала, рекомендация и буквальная разметка каждого |
| Новая `assessments.qmd` | Одна QMD/работа; lab/seminar/practical/test; YAML и нативный заголовок; несколько stage, required/optional/work-mode, preview, required/all и theory-time |
| Новая `answers.qmd` | Single-choice, manual, numeric, multipart, matching: корректные минимальные блоки, публичные поля/закрытые ключи/notes и поддержка адаптеров |
| `profiles.qmd`, `presentation.qmd` | Student/full и ограничения банковских задач; обычные функциональные профили/форматы; notes/решения/поиск/печать/native fragments |
| `composition.qmd` | Самостоятельные подпроекты, Publisher vs QRC, ссылки, ownership ресурсов и архивы Download |
| `export.qmd` и связанные extension страницы | Явные root/book/work команды, selected source input; реальный Print PDF, Moodle XML, PL binding/client/tests/reference, Cloud VM/actions; что реально поддержано |
| Новая `windows.qmd` | Известные Windows-пути, исправленные сравнения/CUE TEMP и отдельный upstream Cyrillic-path workaround |
| Новая `specifications.qmd` | Где актуальный внешний контракт, status/версия/владелец, main unreleased и ссылки на точные теги; истории не придавать силу текущего контракта |

Минимальные связные сценарии: лабораторная по программированию без stage;
семинар с разбором/аудиторией/домом; отдельная practical на распечатках рядом
с lab; test с общедоступным preview и restricted назначениями. Для каждого
показать точные QMD банка/работы, результат student/full и состав экспорта.
У практической/контрольной примеры решения доступны только как preview ссылки;
в participant документ они не попадают. Full демонстрирует все условия/решения.

Заметка Windows: проект на другом диске относительно TEMP допустим после нового
Core-патча; пути с пробелами приводить в кавычках, относительные пути ресурсов
привязывать к документированному владельцу. `recoverEncode` на кириллице
в Quarto 1.11.5 отделить от исправленных ошибок Course; до подтверждённого
upstream исправления показать проверенный путь вроде `D:\Cybersecurity`.
Не обещать, что перенос папки исправляет все Windows проблемы.

## 2. Согласованность и проверенный результат

Обновить Taskfile pins/URL всех восьми готовых групп на новые неизменяемые
выпуски из шага 13. Проверять BUILD commit/dependencies/sourceDirty:false
и точное соответствие опубликованным pins, не только непустые значения.
Готовые деревья копировать побайтно, языковые среды остаются у производителей.
Новый менеджер пакетов или автоматический rebuild всех демо не вводить.

Дополнить текущие `tests/site.cjs`/`fetch.py`: новые страницы/anchors/навигация,
локальные href/src, search corpus, отсутствие service/source публикации,
все asset hashes/provenance и native source URL соответствующего выпуска.
Небольшие QMD из руководства проверить теми же owner fixtures/native render,
чтобы показываемая разметка реально работала. Убрать дубли code-tools/source
и repo-actions/source; нативный просмотр исходника сохранить без собственного UI.

Свою документацию и producer авторский текст писать по-русски; API/CLI имена
не переводить. Демо должны содержать смысловые задачи, без test markers.
Отменённые роли/виды/решения и `.step` удалить из текущих положительных примеров,
README и руководства. Собственные diagnostic справочники связать с владельцами.

Проверки в корне шаблона: `task install`, `task fetch`, `task render`,
`task check`, `python3 tests/fetch.py`. Quarto 1.11.5; PR workflow только проверяет,
не публикует. Review всего authoring-покрытия по spec index владельцев;
затем merge PR в main и проверка чистого merged SHA.

## 3. Штатная публикация и очистка

Сохранить `Taskfile.yml` `publish`: сначала check, затем
`quarto publish gh-pages --no-render`. Публиковать дерево, заново собранное
на проверенном main с точными новым pins/assets, без повторного рендера в publish.
Использовать обычную ветку `gh-pages` и GitHub Pages source branch/root.
Не заменять этот маршрут на native artifact deployment.

Перед публикацией сверить GitHub repository/Pages configuration и URL. После
публикации проверить live guide/search/source/demo/resources; сохранить main SHA,
gh-pages SHA, теги/пины и результат. Публикация явно входит в этот этап,
прежний запрет из исторического плана не действует.

Очистка в самом конце: локальные/удалённые main + gh-pages + точные heads
открытых автоматических PR. Сначала сохранить нужные человеческие изменения
в main/Git-истории и освободить только учтённые worktrees; tag/release оставить.
Здесь записать итоговые SHA/site URL/checks и завершённый branch inventory.

## Выполнение шагов 1–2 — 8 октября 2026

Общий старт: 02:36 Europe/Minsk; дедлайн: 11:36. Рабочая ветка — `feat/authoring-model-20261008`, создана в существующем checkout; дополнительные репозитории/worktrees не создавались.

- [x] Fresh `git fetch origin --tags`, live remote heads, releases и OPEN PR: сохранены в [inventory/history](../history/2026-10-08/README.md). Открытых PR на момент чтения нет. Все старые refs/tags и пользовательские worktrees оставлены.
- [x] Dirty tracked/untracked owner-планы и выбранные root mixed документы сохранены exact snapshots: `717d473ee53b3366a572f946cc1d6113be4a2706`. [Provenance](../history/2026-10-08/provenance.json) содержит исходный путь, mtime, bytes и SHA-256; старые evidence не считаются текущим CI.
- [x] Свежий `origin/main` `b3fa91d17c3c426b3c079ffeba4ea15ead069afe` объединён в рабочую ветку коммитом `f763e03e6127ee26646580b97dd8463a4623e582`. Старый план документации объединился автоматически; первоначальная dirty версия и upstream версия сохраняются в Git.
- [x] Добавлен [spec/index.md](../../spec/index.md), type/component/status, links из README, явный main unreleased и accepted-next. Прежний план и historical snapshots удалены из активной ветки после exact Git-byte проверки; карта истории и исходные root файлы сохранены.

Текущая база: Core pin `v3.0.2`; ready groups Core/composition/QRC/PL/Cloud/external `demo-20261007-ru1`, Print/Moodle `demo-20261007-ru2`; собственный прежний тег `v1.0.0`.

Проверки: exact bytes/SHA-256 всех выбранных root snapshots; Git whitespace check; локальная проверка новых документационных links/меток; diff относительно свежего origin/main ограничен документацией и историей. Runtime suites и CI не запускались: эти шаги не меняют поведение. Восемь дополнительных user worktrees чисты и сохранены на прежних refs. Meaningful ignored авторских исходников вне известных generated/cache/dependency trees не найдено; BUILD и hashes ready archives учтены, существующие результаты оставлены на диске.

Сохранение истории завершено до cleanup: исходные тексты восстанавливаются по preservation/merge SHA, а active docs/spec содержат действующие документы и dated owner-план. Root источники, runtime, generated результаты и пользовательские worktrees не удалялись.

Ограничение исполнителя: текущий агент наследует настройку родителя; отдельное включение ultra для этой документационной подзадачи через доступные инструменты не выполнялось. Блокеров шагов 1–2 нет; реализация следующего контракта, проверки, новые pins/releases и публикация ожидают последовательных шагов 14–15/12–18.


## Подготовка шага 14 — 8 октября 2026

- Подготовлено полное русское руководство: явный bank opt-in и policy/default,
  собственные difficulty/time, обе связи решений, все 12 ролей, четыре вида работ,
  Span назначения/stage/preview, четыре итога и fractional theory-time, ответы,
  профили/форматы, композиция/QRC/Download, selected export и Windows.
- Все страницы включены в native sidebar/search. Minimum — Quarto 1.11.5;
  CI устанавливает CUE 0.17.1, PR проверяет и не публикует. Native gh-pages
  publish сохранён. Старые tool/demo pins не заменялись.
- `tests/guide-examples.py --core-source ../quarto-course` копирует локальный
  текущий Core read-only в временный native book и буквально использует QMD
  из руководства. Прошли student/full + check.ts, обычные exr вне банка, две
  формы решения, все роли, четыре сценария работ и пять форм ответа, selected
  Body с qualified items/assignments и разделением closed fields, четыре итога
  35/75/50/90, theory-time 7.5 и partial render без ложного полного итога.
- Native render сайта на Quarto 1.11.5 прошёл с доступным временным
  XDG_CACHE_HOME; docs-only проверка — 28 страниц документации, sidebar/source/
  anchors/search и 1775 локальных ссылок. Полная ready проверка прежних assets
  теперь честно RED: composition/book/control.html не имеет lang=ru. Consumer
  старые immutable bytes не исправляет; новые assets ожидаются у производителей.
- Fetch проверяет архив SHA-256 до распаковки, точный BUILD/sourceDirty:false,
  зависимости, каждый file digest, source ref и дубли source UI. Manifest
  пока сохраняет только прежние реальные producer archives/trees; новые записи
  появятся после выпуска. Регрессия Task/curl/tar использует тестовые архивы,
  проверяет отказы и сохранение прежней группы в Unicode/spaces пути.
- Визуальный browser review локального file:// не выполнен: IAB URL policy
  запрещает протокол и обходы. Проверка публичного URL после штатной публикации
  остаётся в завершающем этапе; screenshot/layout success не заявлен.

Остаются новые точные выпуски/source refs/assets, удаление подготовительных
пометок после подтверждения, полный installed `task install/fetch/render/check`,
CI/review, merge/main и штатная gh-pages публикация. Открытые PR, публикацию,
релизы и ветки исполнитель руководства самостоятельно не менял; дополнительные
пользовательские worktrees и ready asset trees сохранены.


Решение о следующей линии версий получено от координатора; теги ещё не опубликованы:
Core 4.0.0, Publisher 5.0.0, QRC 3.0.0, Print 0.3.0, Moodle 0.3.0,
PrairieLearn 3.0.0, Cloud 3.0.0, Download 2.0.0. Свежий demo tag планируется
отдельно от прежних immutable tags. Эта карта — подготовка обновления,
не команды установки и не подтверждение существования Releases.


Уточнение фактического public solution witness Core отражено в руководстве:
для экспортируемой demonstration рекомендуются переносимые suffix/nested
контейнеры без when-format/when-meta. HTML другой операции не доказывает
доступность в source JSON; stage проверяется по текущему native результату.
Копируемые положительные сценарии уже используют эту переносимую форму.

## Шаг 14 — новые выпуски и локальная проверка 8 октября 2026

Руководство переведено на current выпущенные контракты. Команды установки,
спецификации и диагностика закреплены на точных тегах; переходный next-документ
не используется как нормативная ссылка. Windows recoverEncode описан условно,
без утверждения о текущем воспроизведении в Windows.

| Инструмент | Опубликованный tag | Source SHA |
| --- | --- | --- |
| Core / Presentation / Navigation | `v4.0.0` | `d58494171e3020957b64ed229cbc8537751e3beb` |
| Publisher | `v5.0.0` | `215309b5c41669e56a857a1bc3e4f7f2ce782c5f` |
| QRC | `v3.0.0` | `559583805a514ae8a244b6ea4cb5124867064024` |
| Print | `v0.3.0` | `00c51f7342da376e85027a925dd9f1207783f924` |
| Moodle | `v0.3.0` | `60ce53d0d52a93e66ca545f2a6cd96f97f09d1e6` |
| PrairieLearn | `v3.0.0` | `b9821b5b62863b7e1ae380a4c1a0a0bef855f8ba` |
| Cloud | `v3.0.0` | `552612450b093b0cff2e33187a1cb5b9234c050a` |
| Download | `v2.0.0` | `ee5ae76255d265ad7c7f43a765bc061ffc8eec75` |

Все восемь групп семи производителей скачаны заново из опубликованного
immutable `demo-20261008`. Архивные bytes/размер/SHA-256, полный BUILD и
549 файлов сверены с независимыми receipts шага 13. [Manifest](../../tests/ready-assets.json)
создан только из этих actual bytes; native sourceRef — tool tag на том же SHA,
каталог исходников — demo tag. Producer HTML и opaque ресурсы не исправлялись
в consumer. Все восемь отдельных native ready checks прошли.

Последовательные команды 04:04–04:08 UTC на Quarto 1.11.5, CUE 0.17.1,
Task 3.54.0, с writable cache/data/Jupyter/IPython каталогами:

```sh
task install
task fetch
task render
task check
python3 tests/fetch.py
```

- Native `task install` обновил bundle без overlays: все 62 пути и bytes
  `_extensions/Afonenko-Course-Tools/` равны Git object Core `d584941…`.
- `task fetch` проверил все архивы/BUILD/files/lang/source и заменил группы
  только после проверки. `task render` собрал все 28 страниц сайта документации.
- `task check`: 61 HTML-страница, 2459 локальных ссылок, native sidebar/source,
  search без учебных тел и полное побайтное копирование готовых ресурсов;
  literal QMD — student/full, обычные exr, suffix/nested решения, 12 ролей,
  четыре сценария работ, пять форм ответа, selected public/teacher Body,
  четыре итога времени, theory-time 7.5 и частичный run без ложной полной суммы.
- `python3 tests/fetch.py`: настоящий Task/curl/tar в пути с кириллицей и
  пробелами, отказы archive/BUILD/file/dependency/hash/lang/source,
  сохранение прежней группы и повторная успешная замена.
- 28 уникальных tagged source/spec/diagnostic ссылок проверены по точным
  producer Git objects. `tests/site.cjs`, `fetch.py`, `guide-examples.py`,
  render/publish workflow и resource/native UI конфигурация не ослаблялись.

Точный CUE — `/home/tolya/course-tools/local-tools/cue/cue`; системный
`/usr/bin/cue` имеет другую devel версию. CUE/Task directories добавлены в PATH,
`CUE`/`TASK` указывают на эти проверенные binaries. Logs/receipts текущей сессии:
`/tmp/template-release-finalize-20261008/`.

Browser QA не подтверждён: CUA вернул unavailable для IAB и пустой список
доступных browsers. Временный локальный HTTP server остановлен. Live URL/source/
search/resources проверяются после штатной публикации. Пользовательские
worktrees сохранены; push/PR/merge/Pages/branch cleanup этим исполнителем
не выполнялись. Следующий gate — независимое review/CI и чистый merged main.

## Исправление финального review — 8 октября 2026

По независимому review `28d5053…` исправлены два оставшихся подготовительных
абзаца: каталог сообщает текущие восемь `demo-20261008` групп и соответствие
source/tool tags одной producer ревизии; введение Presentation относит
банковскую политику к уже выпущенному Core 4.0.0. Изменены только prose этих
двух QMD и этот журнал.

Повторные `task render`, полный `node tests/site.cjs` и `git diff --check`
прошли: 61 HTML / 2459 локальных ссылок. Все 549 ready файлов совпадают в
manifest, `examples/`, `_site/examples/` и скачанных деревьях. Fenced blocks
всех 27 тематических страниц и literal guide inputs равны `28d5053…`;
pins/manifest/harness/vendor/config не менялись, поэтому прежний фактический
native guide PASS остаётся применимым без повторения широкой suite.
Машинные proofs/receipts — `review-fix-*.json` в ранее указанном `/tmp`.
Следующий gate — bounded re-review нового HEAD тем же reviewer, затем CI/merge.


## Подготовка Core 4.0.1 — 8 октября 2026

В отдельном worktree `quarto-template-core-patch-20261008`, ветка
`fix/core-student-link-guide-pins-20261008` от опубликованного source main
`8b050033b594eeae4270ca6f55f12a1d6e8f1243`, подготовлены только source pins
Core `v4.0.1`, ссылки на его спецификации/Source и core demo
`demo-20261008-1`. Авторская модель, схемы и NativeRun/Body API 4.0.0 сохраняются.
README/версионная страница явно сообщают pending выпуск; это не свидетельство
доступности будущих тегов или новых готовых bytes.

Все остальные семь ready групп остаются на прежних точных `demo-20261008`
producer refs; их BUILD/dependencies с Core 4.0.0 не переписываются. Manifest
и весь установленный bundle пока побайтно равны опубликованному main.
Ранее опубликованные main/gh-pages остаются действующим сайтом до нового
native publish. Установка, fetch/render/check, commit/PR/CI/merge и публикация
на этой подготовительной стадии не выполнялись.

После actual immutable Core/tool+demo receipt: независимо скачать и проверить
архив/sourceSHA/BUILD/full file map, заменить только core запись manifest,
штатно установить весь native 4.0.1 bundle без overlays и сверить каждый путь
и byte с новым tool Git object. Затем последовательно выполнить `task install`,
`task fetch`, `task render`, `task check`, `python3 tests/fetch.py`, проверить
полное копирование восьми групп и `git diff --check`; далее независимое review,
CI/merge и повторный clean-main native publish у координатора.


## Core 4.0.1 — фактические выпуски и локальные gates

Опубликованы immutable Core `v4.0.1` (Release 406473961) и новый
`demo-20261008-1` (Release 406475550) на одном producer SHA
`a9a439bd6e6498806d4d4943efd71232e70170be`; exact main CI
`37734901545` прошёл перед публикацией. Новый core archive самостоятельно
скачан из Release: 2 783 070 bytes, SHA-256
`fe90b587569891455694836a48385d102960e906e07f2011c1f28092d4455ae4`.
Все 107 файлов и полный BUILD совпадают с native producer receipt;
sourceRef/dependency — `v4.0.1`, sourceDirty — false. Существующий ready
checker прошёл: 8 HTML, 230 локальных ссылок. Manifest заменяет только core
запись; семь остальных producer records/BUILD/files на `demo-20261008`
побайтно/по значениям сохранены, включая их исходные Core 4.0.0 dependencies.

В этом worktree последовательно выполнены штатные команды, все exit 0:

```sh
task install
task fetch
task render
task check
python3 tests/fetch.py
```

Quarto 1.11.5, Task 3.54.0 и CUE 0.17.1; `CUE` указывает на
`/home/tolya/course-tools/local-tools/cue/cue`, local CUE/Task стоят в PATH;
cache/data/Jupyter/IPython каталоги writable в `/tmp`. Native установка
содержит ровно 63 пути/файла, каждый byte равен tool Git object `a9a439bd…`;
нет overlays или extras. Новый `deferred-assignments.lua` входит в bundle.

Render: 28 страниц документации. Full site check: 61 HTML, 2459 local links,
sidebar/source/search и точное копирование всех 549 opaque ready файлов.
Literal guide native suite прошла student/full, ordinary exr, обе формы
решений, 12 ролей, четыре работы, пять форм ответа, selected Body, четыре
суммы времени и partial-run omission. Реальный fetch regression прошёл
Unicode/spaces, отказы download/archive/file/BUILD/hash/dependency/lang/source,
сохранение предыдущей группы и повторную замену. Все 28 tagged Git paths
Source/spec/diagnostic проверены по actual producer SHA.

Авторская модель, схемы и NativeRun/Body API 4.0.0 не меняются: 28 QMD /
95 fenced blocks равны base main, кроме трёх shell install tags.
`tests/site.cjs`, `tests/guide-examples.py`, `tests/fetch.py`, workflow и native
resource/source/search configuration не менялись. `git diff --check` прошёл.
Exact logs/proofs — `/tmp/template-core-patch-20261008/`.

Source и receipts заморожены для независимого ultra review; commit/PR,
CI/merge, clean-main повтор и native Task gh-pages publish ещё не выполнялись.
Текущая первая публикация остаётся source `8b050033…` / gh-pages `a55b0e3…`.
Все собственные native/process sessions завершены.

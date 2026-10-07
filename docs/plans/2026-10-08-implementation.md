---
type: plan
component: template-course
status: in-progress
updated: 2026-10-08
---

# Документация-шаблон и gh-pages: план владельца

Статус: шаги 1–2 выполнены; runtime следующей модели ещё не реализован. Пункты 14–15/17–18
[линейного плана](../../../quarto-course/docs/plans/2026-10-08-course-tools-implementation.md).
Сначала читать [целевой контракт Core](../../../quarto-course/spec/authoring-model-next.md).
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

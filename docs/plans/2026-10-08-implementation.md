# Документация-шаблон и gh-pages: план владельца

Статус: следующий этап, реализация не начата. Пункты 14–15/17–18
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

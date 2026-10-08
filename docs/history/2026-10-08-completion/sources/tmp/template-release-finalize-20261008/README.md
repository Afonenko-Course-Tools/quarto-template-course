# Финализация шаблона после actual ready assets — 8 октября 2026

Подготовка выполнена read-only в отношении владельцев. Шаблон остаётся чистым
на `feat/authoring-model-20261008`, HEAD
`15df3cdc6da055e55eecb55da618555b6f2184b8`; собственного AGENTS.md нет.
Родитель управляет линейными шагами 12–13, CI/merge/publish. До его сообщения
о готовности опубликованных assets файлы шаблона не меняются.

## Точные ограниченные изменения шага 14

1. `Taskfile.yml`: единственный установленный bundle Core `v3.0.2` →
   фактически выпущенный `v4.0.0`. Сайт использует только Core/Presentation;
   восемь отдельный owner install refs остаются на соответствующих страницах.
2. Команды установки и diagnostic/spec source refs в `guide/`, `extensions/`,
   `reference/`: Core `v4.0.0`, Publisher `v5.0.0`, QRC `v3.0.0`,
   Print/Moodle `v0.3.0`, PrairieLearn/Cloud `v3.0.0`, Download `v2.0.0`.
   Ссылки нормативных документов используют тот же точный tool tag;
   исторический `v1.0.0` шаблона сохраняется.
3. Все восемь `fetch:*` URL и catalog tree URL — новый actual immutable
   `demo-20261008`, после подтверждения его существования. Имена archives
   и source paths сохраняются по таблице ниже.
4. `tests/ready-assets.json`: только реально скачанные опубликованные архивы.
   Для каждой группы брать полный actual `BUILD.json`, digest архивных bytes,
   digest каждого обычного файла и реальный source link ref producer HTML.
   `build.commit` сверять с producer source SHA/release receipt; сохранить
   `sourceDirty:false`, точные dependencies/extensionVersion, native source
   и opaque ресурсы (PL tests/reference/source attachments включительно).
   Не подставлять ожидаемый digest или вымышленные поля вместо фактических.
5. Статусы `README.md`, `spec/index.md`, `spec/site.md`, `index.qmd`,
   `guide/index.qmd`, `guide/specifications.qmd` и вводные тематических guide
   перевести с подготовки accepted-next на реализованные exact release
   контракты. Current тематический Core index заменяет historical transition
   `authoring-model-next.md` в авторском объяснении. Main сайта не является
   старым выпуском шаблона `v1.0.0` и не получает вымышленную свою версию.
6. `guide/windows.qmd`: Core-патч обозначить выпущенным только по actual tag;
   `recoverEncode` — условный случай: «Если в вашей Windows-сессии Quarto
   1.11.5 завершается с recoverEncode при кириллическом пути …». Сохранить
   источник прежнего наблюдения и проверенный workaround, но не утверждать
   текущую воспроизводимость/Windows verification без новой сессии.
7. План владельца: concise actual pins/commit/check receipts после проверок.
   Исторические результаты подготовки сохраняются как история, не текущий gate.

## Группы

| group | repo | archive | sourcePath |
| --- | --- | --- | --- |
| core | quarto-course | course.tar.gz | examples/course |
| composition | quarto-project-publish | composite-course.tar.gz | examples/course |
| qrc | quarto-reference-catalog | catalog-cross-project.tar.gz | examples/course |
| print | quarto-course-print | paper.tar.gz | examples/paper |
| prairielearn | quarto-course-prairielearn | java-gradle.tar.gz | examples/java-gradle |
| moodle | quarto-course-moodle | moodle-questions.tar.gz | examples/questions |
| cloud | quarto-course-cloud | cloud.tar.gz | examples/course |
| external | quarto-reference-catalog | external-catalog.tar.gz | examples/external |

Repository prefix: `Afonenko-Course-Tools/`. QRC выпускает две группы;
Download не имеет отдельной группы. Native producer source links могут
использовать tool tag, а catalog ссылку — demo tag: нельзя предполагать
их равенство или массово заменять bytes producer HTML на стороне consumer.

## Проверка опубликованных assets до обновления manifest

- Получить exact опубликованные release metadata и archive download receipts.
- Скачать архивы штатно, сверить archive SHA-256 с проверенным receipt.
- Без небезопасных путей/symlinks извлечь в `/tmp`, не поверх `examples/`.
- Сверить весь BUILD и source commit с чистым merged producer SHA/tool/demo tag.
- Сверить реальный Quarto 1.11.5, extensionVersion, dependencies и projection.
- Пройти `tests/site.cjs --demo-dir … --demo-group …` с temporary manifest
  во временном working directory: actual русского HTML, native source ref,
  single source UI и локальных href/src без изменения проверяющего кода.
- Producer дефект возвращать владельцу; strict site/fetch tests не ослаблять.
- Внешний reference snapshot/vendor HTML остаётся opaque и побайтным.

## Authoring QA и локальный этап

Read-only review покрывает явный банк/default/override, обычный Quarto exr,
собственные difficulty/time, suffix/nested решения, demonstration native witness,
12 ролей, 4 вида работ, несколько task-items/stage/required/optional/work-mode,
preview, четыре суммы времени и дробное theory-time, 5 форм ответа,
student/full/search/resources/ZIP, функциональные профили, composition/QRC,
participant/teacher selected Body и реальные границы Print/Moodle/PL/Cloud.

Существующий `tests/guide-examples.py` читает literal QMD из guide и проверяет
native student/full, selected public/teacher packages, assignments, внутренние
заголовки, закрытые поля, суммы 35/75/50/90, theory-time 7.5 и partial run.
Не добавлять HTML parser, docs generator, shared runtime или новый render path.

Окружение: Quarto `/usr/bin/quarto`, CUE
`/home/tolya/course-tools/local-tools/cue/cue` **0.17.1** (системный
`/usr/bin/cue` — другая devel версия, его не использовать), Node `/usr/bin/node`;
Task `/home/tolya/course-tools/local-tools/task/task` (не находится в обычном PATH).
Перед локальными шагами prepend local-tools/cue и local-tools/task в PATH,
установить CUE/TASK на точные пути и использовать writable
`XDG_CACHE_HOME` в `/tmp/template-release-finalize-20261008/cache`.

Последовательные обязательные команды в owner checkout:

```sh
task install
task fetch
task render
task check
python3 tests/fetch.py
git diff --check
```

После local PASS — ultra review final diff/content, owner CI, merge main.
Родитель повторяет install/fetch/render/check на чистом merged main и
`task publish` → native `quarto publish gh-pages --no-render`; хранит main SHA,
gh-pages SHA, pins/assets и live QA guide/source/search/resources.

Пользовательские worktrees (8 дополнительных) сохранены. Их checkout/ветки,
других владельцев и курс Cybersecurity агент шаблона не изменяет.

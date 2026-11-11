---
type: documentation
component: template-course
status: current
updated: 2026-11-12
---

# Документация инструментов Quarto

Обычный Quarto website: руководство, страницы средств, справочник и каталог
исторических готовых демонстраций. Автор курса начинает с `guide/index.qmd`;
этот README описывает сопровождение сайта. [Индекс спецификаций](spec/index.md)
связывает действующие контракты с их владельцами.

Требуются Quarto >=1.11.5, Task 3, curl, tar и Node.js.
На Arch Linux Task устанавливается пакетом `go-task`, команда — `go-task`;
на системах с командой `task` используйте её вместо `go-task`.

```sh
go-task install
go-task fetch
go-task render
go-task check
go-task preview
```

`install` вызывает штатный `quarto add` с выбранным тегом из `Taskfile.yml`.
Quarto устанавливает целые пакеты в `_extensions/Afonenko-Course-Tools/`;
эти каталоги хранятся в Git. Фактически установленную версию сообщает
`_extension.yml` каждого пакета. Отдельной матрицы версий нет.

`fetch` скачивает восемь исторических HTML-групп из неизменяемых Releases,
не запускает языковые среды демонстраций. Их архивные URL, SHA-256 и исходные
refs находятся в `tests/ready-assets.json`; это сведения о готовых результатах,
а не зависимости исходного кода. Обновление Core не меняет эти архивы.

SHA-256 архива проверяется до распаковки в чистый staging. Он уже защищает
все файлы, включая `BUILD.json`, поэтому повторные per-file SHA и копия BUILD
в manifest не нужны. Проверка читает происхождение из самого BUILD, проверяет
чистоту исходников, source links и локальные ресурсы. Только успешный staging
заменяет прежнюю группу. Рендер проверяет побайтовое копирование всего дерева,
включая ресурсы и вложения, которые не имеют ссылок из HTML.

`render` создаёт `_site` с уже полученными группами; `check` проверяет ссылки,
поиск, native source, копирование ресурсов и буквальные QMD руководства через
настоящий native book. `preview` открывает локальный просмотр. `examples/`,
`.demo-staging/` и `_site/` исключены из Git.

После изменения получения выполните:

```sh
TASK=go-task python3 tests/fetch.py
```

Проверка исполняет Task/curl/tar в пути с кириллицей и пробелами, отвергает
повреждённый архив, неполный результат и неверный source, сохраняет прежнюю
группу при отказе и проверяет повторное получение. На Windows используются
PowerShell-команды Taskfile; фактическая локальная проверка выполняется на Linux.

Обновление установленного bundle выполняйте штатным Quarto workflow: выберите
опубликованный тег в задаче `install`, выполните её и сохраните целые
`_extensions` вместе с Taskfile. Затем выполните `fetch`, `render` и `check`.
Исторические демонстрации обновляются отдельным решением по новому producer
Release; опубликованные теги и assets не заменяются.

Для проверки локального Core до его выпуска доступны:

```sh
python3 tests/guide-examples.py --core-source /path/to/quarto-course
python3 tests/navigation-examples.py --core-source /path/to/quarto-course
```

Обычный `check` использует установленный bundle. Эти проверки копируют компоненты
во временные native проекты; готовые producer assets не пересобираются.
`node tests/site.cjs --documentation-only` проверяет только сайт объяснений.

Публикация выполняется отдельно: `go-task publish` проверяет сайт и вызывает
`quarto publish gh-pages --no-render`. PR workflow проверяет сайт и не публикует
его. Публикуйте проверенное дерево чистого `main`. Исторические сведения о
публикации сохранены в [отчёте реализации](docs/releases/2026-10-08-implementation.md).

Новые тексты готовьте по-русски по
[общему языковому правилу](https://github.com/Afonenko-Course-Tools/quarto-course/blob/main/docs/russian-language-policy.md).
Рабочий порядок и примеры — [тексты репозитория](guide/repository-texts.qmd).

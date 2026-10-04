# Источники установленных расширений

Полные каталоги `_extensions` хранятся в Git и используются непосредственно
при сборке. Обновление переносит целый архивированный пакет, включая vendor
и лицензии. Фильтры, обработчики и тема подключаются явно в YAML.

| Поставщик | Exact commit | Exact tree |
|---|---|---|
| [quarto-course](https://github.com/Afonenko-Course-Tools/quarto-course) | `7014d0532b058a5bbddbd04ddd9be102653b5551` | `8bbc5144a55a0a8a4fe0ca80693579b8a4be69e0` |
| [quarto-project-publish](https://github.com/Afonenko-Course-Tools/quarto-project-publish) | `ab481838a92bbe1d7705a3df7dc3194fb97b334c` | `4da5b9e489fa41157c8b20ee139e88b355c79656` |
| [quarto-reference-catalog](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog) | `d366cacf37457802506c5b75e87f39f89d31c373` | `f2283f0b038a1e2972037b93420774df69cd54cc` |
| [quarto-project-download](https://github.com/Afonenko-Course-Tools/quarto-project-download) | `d78a533b14c38e3dd64dbfbd59e437a82e2752fd` | `7e21f82dd770eb2c1593aae54bebedf1b8e6cbaf` |
| [quarto-course-print](https://github.com/Afonenko-Course-Tools/quarto-course-print) | `12ef8b905ef5477b384789ce8ae268ad0076ddde` | `a06f4812bb872742f0b5152afe042411a50cedb7` |
| [quarto-course-cloud](https://github.com/Afonenko-Course-Tools/quarto-course-cloud) | `66675ed4988e035828a03826f7c6f38747f2afe9` | `94e709100592029e4d1bdfc1a513fee3eeab5486` |
| [quarto-course-prairielearn](https://github.com/Afonenko-Course-Tools/quarto-course-prairielearn) | `d296a0841a53a2035cfc79eaf3db5ea471c90408` | `2dc11045c27703c29bb4a997391bf932549df684` |

Core, Presentation и Navigation происходят из одного Core U. Cloud/PL содержат
совместимость с Source capture этого U: при capture они пассивны, а расширение
модели выполняется во время настоящего native render. Их runtime-пакеты
устанавливаются целиком.

| Пакет | Файлов в полном payload | Установленные scope |
|---|---:|---|
| `course-core` | 119 | `root`, `tasks`, `book`, `essay`, `lectures`, `practice`, `examples/cloud`, `examples/prairielearn` |
| `course-presentation` | 11 | `theory`, `tasks`, `handbook`, `book`, `essay`, `lectures`, `practice`, `examples/cloud`, `examples/prairielearn` |
| `course-navigation` | 7 | `lectures`, `practice` |
| `project-publish` | 20 | `root` |
| `reference-catalog` | 85 | `root` |
| `project-download` | 11 | `tasks`, `book`, `essay` |
| `course-print` | 31 | внешняя installed production Print probe |
| `course-cloud` | 7 | `examples/cloud` |
| `course-prairielearn` | 6 | `examples/prairielearn` |

Все девять пакетов прошли штатный local `quarto add` из frozen git archives.
После test-only fixture corrections новые Core/PL archives дополнительно
прошли whole-add и заменили Core8/PL1 copies. Полные `_extensions` Git trees
новых refs совпадают с прежними; Presentation/Navigation имеют тот же payload
финального Core. Отдельная карта `final-ref-composition/manifest.json` сохраняет
эту эквивалентность, девять замен и итоговую проверку всех26 copies; прежние
installation/native receipts остаются привязанными к своим исходным refs.
Для 26 product copies сверены полный file set, SHA256, размеры и права файлов;
сохранены все bundled license files. Полные карты, архивы и их SHA256 находятся
в `whole-installations.json` и соседних archives evidence отчёта Task7a.
Print используется внешней production-пробой, а не добавляется в нейтральный сайт.

`ACTUAL_MAIN_INSTALLATIONS` проверяет 24 product copies шести общих поставок:
все восемь Core, девять Presentation, две Navigation, три Download и root
Publisher/QRC. Две optional adapter copies отдельно проверяются native route
Cloud/PL и полной Source-аутентификацией. Существующий
`tests/probes/portal-provider-refs.json` сохраняет ровно четыре ключа
`core/download/publisher/qrc`; он не заменяется новым реестром.

BSU theme в Original остаётся whole payload из
[quarto-theme-bsu](https://github.com/BSU-RFCT-Afonenko-Courses/quarto-theme-bsu/tree/176701f68e32c6424c67ca00a31deb15aeca6818),
commit `176701f68e32c6424c67ca00a31deb15aeca6818`.
Все три theme copies (book/lectures/practice, по шесть файлов) побайтно и по
правам совпадают с BASE Template; карта сохранена в
`unchanged-theme-provenance.json` evidence Task7a. Нейтральный курс использует стандартную тему.

Это provenance установленной композиции. Полные Original student/full/late,
Pages и Body/Print/Download native gates проверяются на свежих Source attempts
после заморозки Template; прежние результаты других pins не объявляются
приёмкой текущего Source. Точная авторская миграция — в
[карте Original](docs/original-author-migration.md).

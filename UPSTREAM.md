# Источники установленных расширений

Полные каталоги `_extensions` хранятся в Git и используются непосредственно
при сборке. Обновление переносит целый архивированный пакет, включая vendor
и лицензии. Фильтры, обработчики и тема подключаются явно в YAML.

| Поставщик | Exact commit | Exact tree |
|---|---|---|
| [quarto-course](https://github.com/Afonenko-Course-Tools/quarto-course) | `da4c3730ec4779206588cbb1e9532ec541421c9f` | `196dbc08b01113b43b54c4cb3a7d6dd26c71bf05` |
| [quarto-project-publish](https://github.com/Afonenko-Course-Tools/quarto-project-publish) | `ab481838a92bbe1d7705a3df7dc3194fb97b334c` | `4da5b9e489fa41157c8b20ee139e88b355c79656` |
| [quarto-reference-catalog](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog) | `d366cacf37457802506c5b75e87f39f89d31c373` | `f2283f0b038a1e2972037b93420774df69cd54cc` |
| [quarto-project-download](https://github.com/Afonenko-Course-Tools/quarto-project-download) | `d78a533b14c38e3dd64dbfbd59e437a82e2752fd` | `7e21f82dd770eb2c1593aae54bebedf1b8e6cbaf` |
| [quarto-course-print](https://github.com/Afonenko-Course-Tools/quarto-course-print) | `12ef8b905ef5477b384789ce8ae268ad0076ddde` | `a06f4812bb872742f0b5152afe042411a50cedb7` |
| [quarto-course-cloud](https://github.com/Afonenko-Course-Tools/quarto-course-cloud) | `edd4c9c62ce6dfe94e1ca0f9e8f7f9d3f47848ff` | `6b973b6abe460bff0c30416ee7d7e5378fd5fe2b` |
| [quarto-course-prairielearn](https://github.com/Afonenko-Course-Tools/quarto-course-prairielearn) | `fe1f3d9bc71979cdfbfba49a81f44bb75d19bbfd` | `acaaf1f885a6023c544781c71e7df0c1bee2de60` |

Core, Presentation и Navigation происходят из одного Core U. Cloud/PL содержат
совместимость с Source capture этого U: при capture они пассивны, а расширение
модели выполняется во время настоящего native render. Их runtime-пакеты
устанавливаются целиком.

| Пакет | Файлов в полном payload | Установленные scope |
|---|---:|---|
| `course-core` | 119 | `root`, `theory`, `tasks`, `handbook`, `book`, `essay`, `lectures`, `practice`, `examples/cloud`, `examples/prairielearn` |
| `course-presentation` | 11 | `theory`, `tasks`, `handbook`, `book`, `essay`, `lectures`, `practice`, `examples/cloud`, `examples/prairielearn` |
| `course-navigation` | 7 | `lectures`, `practice` |
| `project-publish` | 20 | `root` |
| `reference-catalog` | 85 | `root` |
| `project-download` | 11 | `tasks`, `book`, `essay` |
| `course-print` | 31 | внешняя installed production Print probe |
| `course-cloud` | 7 | `examples/cloud` |
| `course-prairielearn` | 6 | `examples/prairielearn` |

Все девять пакетов прошли штатный local `quarto add` из frozen git archives.
Исторические U1/U2 и PL installation/native receipts сохраняют исходные refs;
`final-ref-composition/manifest.json` фиксирует прежнюю полную эквивалентность
U1/U2 и PL и проверку всех 26 copies. После исправлений видимости и owning
context новый Core V3 архив прошёл отдельный штатный whole-add для каждого
из восьми Core scopes. Полный file set, SHA256, размеры, права и bundled
license paths каждой копии сверены с точным архивом frozen V3 Source.
Presentation/Navigation побайтно совпадают с соответствующими пакетами того
же V3 Source. Финальные CI-only Source refs PL/Cloud из таблицы выше имеют
полный `_extensions` Git tree, побайтно идентичный прежним PL d296 и Cloud
66675. Их installed runtime payload и исходные installation receipts сохранены;
`adapter-final-source-equivalence.json` фиксирует свежую архивную provenance.
Новая карта `acceptance/template-V3-verifier-fix/core-v3-composition/manifest.json`
сохраняет provenance, восемь замен и свежую проверку всех 26 product copies;
прежние native receipts не объявляются приёмкой нового Core или Template.
Полные исторические карты и архивы остаются в `whole-installations.json`
и соседних archives evidence отчёта Task7a.
Print используется внешней production-пробой, а не добавляется в нейтральный сайт.

Нейтральные книги `theory` и `handbook` имеют собственные полные Core installs: штатный Quarto не наследует расширения из корневого проекта. Эти две копии добавлены целыми архивами исходного Core `6bdb904fa51971ff0f21b92897c43fe6e22a7711` (tree `2c9c352ad27cfb33ae5f92a0e5e638e4ba14407e`); все 119 файлов, режимы и четыре bundled license paths каждого пакета побайтно совпадают с Core V3 из таблицы. Карта `acceptance/template-V7-ci-correction/member-core-installations.json` сохраняет новые whole-add receipts и оригинальную provenance. Теперь установлены 28 product copies; все прежние 26 copies и три theme copies сохранены без изменений.

`ACTUAL_MAIN_INSTALLATIONS` проверяет 26 product copies шести общих поставок:
все десять Core, девять Presentation, две Navigation, три Download и root
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

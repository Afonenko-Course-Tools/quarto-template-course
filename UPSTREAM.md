# Источники установленных расширений

В курс включены согласованные исходники текущих расширений. Каталоги
`_extensions` хранятся в Git и используются непосредственно при сборке;
сеть для установки зависимостей при рендере не требуется.

| Пакеты | Исходный репозиторий | Проверенный коммит |
|---|---|---|
| `course-core`, `course-presentation`, `course-navigation`, `bsu-theme` | [programming-course-core-specification](https://github.com/AfonenkoA/programming-course-core-specification) | [d5e31f204eadf17ba5a4477ccc30aecbaee574ec](https://github.com/AfonenkoA/programming-course-core-specification/tree/d5e31f204eadf17ba5a4477ccc30aecbaee574ec) |
| `reference-catalog` | [quarto-reference-catalog](https://github.com/AfonenkoA/quarto-reference-catalog) | [6b19450fd31c28c5aae17c658a01123c67cc4f7b](https://github.com/AfonenkoA/quarto-reference-catalog/tree/6b19450fd31c28c5aae17c658a01123c67cc4f7b) |
| `course-cloud` | [programming-course-cloud-specification](https://github.com/AfonenkoA/programming-course-cloud-specification) | [f88e56ddda18591cffb525eaf7bbddcbf2a84357](https://github.com/AfonenkoA/programming-course-cloud-specification/tree/f88e56ddda18591cffb525eaf7bbddcbf2a84357) |
| `course-prairielearn` | [programming-course-prairielearn-specification](https://github.com/AfonenkoA/programming-course-prairielearn-specification) | [e38d4f0b7965cc09ae3d09153d4cb4855efe3429](https://github.com/AfonenkoA/programming-course-prairielearn-specification/tree/e38d4f0b7965cc09ae3d09153d4cb4855efe3429) |

Набор установленных файлов и подключение расширений разделены: пакет
используется только при явном подключении в настройках подпроекта.
Выбора версии учебной модели или API адаптера в YAML нет. При обновлении
проверяются контракт, примеры и обе профильные сборки.

Для обновления используйте стандартный `quarto add` с выбранным коммитом
или тегом. Убедитесь в пути установки: GitHub-источник может добавить
пространство имён владельца. Коммитьте установленную копию целиком.
Изменения реализации сначала вносятся в исходный репозиторий расширения.

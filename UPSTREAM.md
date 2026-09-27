# Источники установленных расширений

Каталоги `_extensions` хранятся в Git и используются непосредственно при сборке.
Установка не включает пакет: фильтры, обработчики и тема подключаются явно в YAML.
При обновлении меняют целую установленную копию и проверяют оба профиля.

| Пакеты | Исходный репозиторий | Проверенный коммит |
|---|---|---|
| `course-core, course-presentation, course-navigation` | [Afonenko-Course-Tools/quarto-course](https://github.com/Afonenko-Course-Tools/quarto-course) | [1afcc929f5006a7b4252310851e12d456cba00cd](https://github.com/Afonenko-Course-Tools/quarto-course/tree/1afcc929f5006a7b4252310851e12d456cba00cd) |
| `reference-catalog` | [Afonenko-Course-Tools/quarto-reference-catalog](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog) | [f99d38d945b168e0113b9b6a3de506d9ffe761c0](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog/tree/f99d38d945b168e0113b9b6a3de506d9ffe761c0) |
| `project-publish` | [Afonenko-Course-Tools/quarto-project-publish](https://github.com/Afonenko-Course-Tools/quarto-project-publish) | [d9cc5ee0f810c91c38e4bb6d1dc0093b085d016d](https://github.com/Afonenko-Course-Tools/quarto-project-publish/tree/d9cc5ee0f810c91c38e4bb6d1dc0093b085d016d) |
| `project-download` | [Afonenko-Course-Tools/quarto-project-download](https://github.com/Afonenko-Course-Tools/quarto-project-download) | [e00f34a40308380263d119c522e5c18a9381817b](https://github.com/Afonenko-Course-Tools/quarto-project-download/tree/e00f34a40308380263d119c522e5c18a9381817b) |
| `bsu-theme` | [BSU-RFCT-Afonenko-Courses/quarto-theme-bsu](https://github.com/BSU-RFCT-Afonenko-Courses/quarto-theme-bsu) | [176701f68e32c6424c67ca00a31deb15aeca6818](https://github.com/BSU-RFCT-Afonenko-Courses/quarto-theme-bsu/tree/176701f68e32c6424c67ca00a31deb15aeca6818) |
| `course-prairielearn` | [Afonenko-Course-Tools/quarto-course-prairielearn](https://github.com/Afonenko-Course-Tools/quarto-course-prairielearn) | [95c6718640210b654c1f332bd8ba48effa1a92a6](https://github.com/Afonenko-Course-Tools/quarto-course-prairielearn/tree/95c6718640210b654c1f332bd8ba48effa1a92a6) |
| `course-cloud` | [Afonenko-Course-Tools/quarto-course-cloud](https://github.com/Afonenko-Course-Tools/quarto-course-cloud) | [5ff8d85762f428e24a20b1a5a5d295c7b2ec8c01](https://github.com/Afonenko-Course-Tools/quarto-course-cloud/tree/5ff8d85762f428e24a20b1a5a5d295c7b2ec8c01) |

Cloud и PrairieLearn установлены только в самостоятельных `examples/`.
Обычная публикация не подключает их и не требует учебной платформы.

Сведения о коммитах фиксируют происхождение этой поставки, а не поддерживаемые
варианты схем. Учебная модель имеет один текущий контракт. Изменения реализации
вносятся в указанные исходные репозитории. При установке через `quarto add`
учитывайте возможное пространство имён владельца в пути пакета.

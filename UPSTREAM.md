# Источники установленных расширений

Каталоги `_extensions` хранятся в Git и используются непосредственно при сборке.
Установка не включает пакет: фильтры, обработчики и тема подключаются явно в YAML.
При обновлении меняют целую установленную копию и проверяют оба профиля.

| Пакеты | Исходный репозиторий | Проверенный коммит |
|---|---|---|
| `course-core, course-navigation` | [Afonenko-Course-Tools/quarto-course](https://github.com/Afonenko-Course-Tools/quarto-course) | [5eaf483fdd6d5189d096aca24536482ae5679a41](https://github.com/Afonenko-Course-Tools/quarto-course/tree/5eaf483fdd6d5189d096aca24536482ae5679a41) |
| `course-presentation` | [Afonenko-Course-Tools/quarto-course](https://github.com/Afonenko-Course-Tools/quarto-course) | [5eaf483fdd6d5189d096aca24536482ae5679a41](https://github.com/Afonenko-Course-Tools/quarto-course/tree/5eaf483fdd6d5189d096aca24536482ae5679a41) |
| `reference-catalog` | [Afonenko-Course-Tools/quarto-reference-catalog](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog) | [9a4bf6aafd73aff0daf51ae208247f3f194057c2](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog/tree/9a4bf6aafd73aff0daf51ae208247f3f194057c2) |
| `project-publish` | [Afonenko-Course-Tools/quarto-project-publish](https://github.com/Afonenko-Course-Tools/quarto-project-publish) | [ef313672b7392f51838fde3546aaca465ffa0900](https://github.com/Afonenko-Course-Tools/quarto-project-publish/tree/ef313672b7392f51838fde3546aaca465ffa0900) |
| `project-download` | [Afonenko-Course-Tools/quarto-project-download](https://github.com/Afonenko-Course-Tools/quarto-project-download) | [d78a533b14c38e3dd64dbfbd59e437a82e2752fd](https://github.com/Afonenko-Course-Tools/quarto-project-download/tree/d78a533b14c38e3dd64dbfbd59e437a82e2752fd) |
| `bsu-theme` | [BSU-RFCT-Afonenko-Courses/quarto-theme-bsu](https://github.com/BSU-RFCT-Afonenko-Courses/quarto-theme-bsu) | [176701f68e32c6424c67ca00a31deb15aeca6818](https://github.com/BSU-RFCT-Afonenko-Courses/quarto-theme-bsu/tree/176701f68e32c6424c67ca00a31deb15aeca6818) |
| `course-prairielearn` | [Afonenko-Course-Tools/quarto-course-prairielearn](https://github.com/Afonenko-Course-Tools/quarto-course-prairielearn) | [95c6718640210b654c1f332bd8ba48effa1a92a6](https://github.com/Afonenko-Course-Tools/quarto-course-prairielearn/tree/95c6718640210b654c1f332bd8ba48effa1a92a6) |
| `course-cloud` | [Afonenko-Course-Tools/quarto-course-cloud](https://github.com/Afonenko-Course-Tools/quarto-course-cloud) | [5ff8d85762f428e24a20b1a5a5d295c7b2ec8c01](https://github.com/Afonenko-Course-Tools/quarto-course-cloud/tree/5ff8d85762f428e24a20b1a5a5d295c7b2ec8c01) |

Cloud и PrairieLearn установлены только в самостоятельных `examples/`.
Обычная публикация не подключает их и не требует учебной платформы.

Сведения о коммитах фиксируют происхождение этой поставки, а не поддерживаемые
варианты схем. Учебная модель имеет один текущий контракт. Изменения реализации
вносятся в указанные исходные репозитории. При установке через `quarto add`
учитывайте возможное пространство имён владельца в пути пакета.

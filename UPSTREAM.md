# Источники установленных расширений

Обновление интеграции учебных элементов, 27 сентября 2026 года.
Копии в `_extensions` являются входными данными сборки и хранятся в Git.
При рендере ничего не скачивается.

| Пакеты | Исходник | Проверенный commit |
|---|---|---|
| course-core 1.2.0; course-presentation 0.1.0; course-navigation 0.2.0; bsu-theme 0.2.0 | [programming-course-core-specification](https://github.com/AfonenkoA/programming-course-core-specification) | [7ea756ba67860d7c9c731ff0fe88fae5ff30744f](https://github.com/AfonenkoA/programming-course-core-specification/tree/7ea756ba67860d7c9c731ff0fe88fae5ff30744f) |
| reference-catalog 1.1.1 | [quarto-reference-catalog](https://github.com/AfonenkoA/quarto-reference-catalog) | [63483d8f2331245a75715bc20cea5e3763ac99ee](https://github.com/AfonenkoA/quarto-reference-catalog/tree/63483d8f2331245a75715bc20cea5e3763ac99ee) |

Установлены только используемые пакеты соответствующего подпроекта; прочие
адаптеры оценивания не менялись. Версии IR и API различаются: новые учебные
элементы включаются через `course.schema: "1.1"`, старые проекты могут оставаться
на `1.0`. Именованных брендовых форматов нет.

Обновляйте исходники стандартным `quarto add` с выбранным commit/tag,
проверяйте путь установки (GitHub-источник может добавить namespace владельца)
и коммитьте установленную копию целиком. После обновления обязательны обе
профильные сборки. Не смешивайте редактирование vendored-копий и обновление:
изменения реализации сначала вносятся в upstream. Git submodules не нужны.

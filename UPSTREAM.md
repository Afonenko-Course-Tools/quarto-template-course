# Закреплённые выпуски расширений

Документация устанавливает опубликованный bundle Course из репозиториев
[Afonenko-Course-Tools](https://github.com/Afonenko-Course-Tools).
Точная команда `quarto add` находится в [Taskfile.yml](Taskfile.yml), задача `install`.
Компоненты Core, Presentation и Navigation имеют одну версию bundle;
конфигурация определяет, какие из них активны.

Готовые демонстрации получаются отдельно задачей `fetch` из точных URL.
В каждом `BUILD.json` записаны исходный коммит, закреплённые зависимости
и проекция. Готовые деревья копируются целиком, включая ресурсы и вложения;
потребитель не меняет их HTML. Исходные папки каталога ссылаются на соответствующие
ревизии производителей.

Для обновления выберите проверенный опубликованный выпуск, измените конкретный
pin в Taskfile и ссылки руководства, выполните `task install`, затем явно
`task fetch`, `task render`, `task check`. Регрессия `python3 tests/fetch.py`
проверяет получение в пути с кириллицей и пробелами и сохранение прежнего результата
при неудаче. Обычный рендер использует уже установленные компоненты и готовые группы.

Производитель проверяет изменения локально, согласует код и документацию в PR,
сливает его в main и выпускает инструмент из проверенного коммита. Assets
демонстрации прикладываются и проверяются в draft перед неизменяемым Release.
Опубликованные теги и assets не заменяются; исправление получает новый выпуск.

Ветка coordinated-authoring устанавливает реально опубликованный Corev5.0.1 для
новых literal snippets и использует опубликованный Downloadv3.0.0 contract.
Исторические ready assets сохраняются с прежними source/ref/hash и не подменяются
новыми HTML. Core 5.0.1 и exporter 5.0.0 опубликованы; Java validated head ещё ожидается.
Текущая Platform metadata 1.0.1 закрепляет actual normal merged main source
`0083e3e102f47860cabc1d1e62e6434353f5c4c6`. Published Java/Community digests и actual image build provenance
записаны на странице extensions/prairielearn.qmd. Source tag v1.0.1 ещё ожидается;
анонимный pull и validated Java exacthead остаются отдельными gates.
Исторические Platform v1.0.0 pins/READY producer assets не заменяются новой
приёмкой; финальные source tag/spec links обновляются только после публикации.

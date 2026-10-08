---
type: specification-index
component: template-course
status: current
updated: 2026-10-08
---

# Индекс спецификаций Документация-шаблон

Шаблон — сайт документации, собственного `_extension.yml` и версии расширения у него нет. Состояние сайта определяется Git SHA, закреплённые инструменты и восемь готовых групп — [Taskfile.yml](../Taskfile.yml). Версия каждого установленного компонента определяется его `_extension.yml` на том же Git ref; текущий установленный Core — [_extension.yml](../_extensions/Afonenko-Course-Tools/course-core/_extension.yml). Выпуск `v1.0.0` сохраняет прежний учебный шаблон; нынешнее `main` является **unreleased** документацией и не выдаётся за этот выпуск.

`current` означает правила кода на выбранном ref; `accepted-next` — согласованный контракт будущего выпуска, который ещё не реализован. `historical` сохраняет происхождение решений без нормативной силы. У каждого правила один владелец: общую модель задаёт Core, этот репозиторий задаёт только свой экспорт или сопровождение сайта. README, руководство, планы и примеры не образуют отдельного общего контракта.

| Документ | type | component | status | Нормативный владелец и область |
| --- | --- | --- | --- | --- |
| [Документация-шаблон: действующий контракт](site.md) | specification | template-course | current | native website, producer ready assets, source/search и штатный gh-pages |
| [Руководство и обзор](../guide/index.qmd) | documentation | template-course | accepted-next | Подготовка следующего выпуска; прежние pins не подтверждают новую разметку; нормативные правила у владельцев |
| [Body Core](../../quarto-course/docs/body-export.md) | specification | course-core | implementation-in-progress | Общий producer transport и selected source input |
| [Следующая авторская модель](../../quarto-course/spec/authoring-model-next.md) | specification | course-core | accepted-next | Банк, условия, решения и назначения следующего выпуска |
| [План владельца](../docs/plans/2026-10-08-implementation.md) | plan | template-course | in-progress | Шаги 14–15 и завершение общего маршрута |
| [Карта сохранённой истории](../docs/history/2026-10-08/README.md) | history | template-course | historical | Исходные планы, probes/evidence, refs и provenance |

Новый `exercise-bank`, `statementVisibility`, `assignments`, stage и новая связь решений остаются `accepted-next` до совместного изменения Core и потребителей. Этот индекс не объявляет их поддержанными существующим выпуском. Порядок внедрения — [линейный план](../../quarto-course/docs/plans/2026-10-08-course-tools-implementation.md).

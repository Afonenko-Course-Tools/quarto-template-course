---
type: specification-index
component: template-course
status: current
updated: 2026-10-08
---

# Индекс спецификаций Документация-шаблон

Шаблон — сайт документации, собственного `_extension.yml` и версии расширения у него нет. Состояние сайта определяется Git SHA, закреплённые инструменты и восемь готовых групп — [Taskfile.yml](../Taskfile.yml) и [точный manifest](../tests/ready-assets.json). Версия каждого установленного компонента определяется его `_extension.yml` на том же Git ref; текущий установленный Core `4.0.0` — [_extension.yml](../_extensions/Afonenko-Course-Tools/course-core/_extension.yml). Выпуск `v1.0.0` сохраняет прежний учебный шаблон; нынешний сайт документации не выдаётся за этот выпуск.

`current` означает правила кода на выбранном ref; `accepted-next` — согласованный контракт будущего выпуска, который ещё не реализован. `historical` сохраняет происхождение решений без нормативной силы. У каждого правила один владелец: общую модель задаёт Core, этот репозиторий задаёт только свой экспорт или сопровождение сайта. README, руководство, планы и примеры не образуют отдельного общего контракта.

| Документ | type | component | status | Нормативный владелец и область |
| --- | --- | --- | --- | --- |
| [Документация-шаблон: действующий контракт](site.md) | specification | template-course | current | native website, producer ready assets, source/search и штатный gh-pages |
| [Руководство и обзор](../guide/index.qmd) | documentation | template-course | current | Авторские действия для exact release pins; нормативные правила у владельцев |
| [Body Core 4.0.0](https://github.com/Afonenko-Course-Tools/quarto-course/blob/v4.0.0/docs/body-export.md) | api-contract | course-core/body-export | current | Общий producer transport и selected source input |
| [Учебные элементы Core 4.0.0](https://github.com/Afonenko-Course-Tools/quarto-course/blob/v4.0.0/spec/learning-elements.md) | specification | course-core | current | Банк, условия, решения, назначения и время |
| [План владельца](../docs/plans/2026-10-08-implementation.md) | plan | template-course | in-progress | Шаги 14–15 и завершение общего маршрута |
| [Карта сохранённой истории](../docs/history/2026-10-08/README.md) | history | template-course | historical | Исходные планы, probes/evidence, refs и provenance |

`exercise-bank`, `statementVisibility`, `assignments`, stage и suffix/nested решения внедрены в Core `v4.0.0`. Возможности потребителей закреплены на [странице версий](../guide/specifications.qmd). Порядок внедрения и оставшиеся публикационные этапы — [линейный план](../../quarto-course/docs/plans/2026-10-08-course-tools-implementation.md).

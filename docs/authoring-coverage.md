# Покрытие авторского формата после Source/Body union

Это матрица текущей composition, а не декларация полного выполнения нормативных P1/P2.
Нейтральный root расширяет прежний five-parts corpus, Original остаётся отдельным
полным regression. Итоговая installed-композиция проверяется после заморозки
поставщиков; проверки раннего smoke не считаются новым frozen native proof.

| Требование | Доступная демонстрация/доказательство | Оставшийся предметный контракт |
|---|---|---|
| Пять частей и portal | root theory/tasks/lectures/practice/handbook; существующий Publisher/QRC | Финальная native installed matrix на обоих каналах |
| Один canonical exr в tasks | минимальный paragraph-only exr без target, два развёрнутых exr; другие части — ссылки и exm; product guard на дублирование | Финальная native installed matrix |
| Явные IDs, назначение и сложность | sec/exr заданы вручную; обязательные course-role и difficulty у каждой задачи; явный H2 темы в книге | Core доказывает ближайший авторский Header; chapter H1/slug не заменяют тему, сложность задания не наследуется |
| Source owner/ID, Body и ресурсы | сохранён Body-consumer merge; публичный пакет Core → потребители; Original full-source guards | Совместный frozen producer/consumer proof после установки |
| Темы и prerequisites | sec-ID, текстовые objectives/prerequisites и QRC-ссылки | Семантические required/recommended связи, конфликты, циклы, графовые факты |
| План | `tasks/plans/01.qmd`: обычный упорядоченный план занятия | Типизированное включение required/recommended/optional, повторы и identity плана |
| Одна работа на QMD | `tasks/labs/01.qmd`: assessment.kind, sec-ID, один assessment-items; Body opt-in проверяет явный первый Header и фиксированный состав | Типизированные планы и транспорт закрытого контроля; обычный assessment и строгий Body proof имеют разные границы |
| Ручная сдача | exr с одним абзацем без target; текст результата, критерии и способ передачи; Body opt-in поддерживает manual submission=text | Типизированные file/paper и автоматическая передача результата; явный target=manual по-прежнему требует ведущий Header |
| Ответы | обычный sol только в full, sol демонстрации публичный с приоритетом закрытого предка; явный Body opt-in: manual text, single-choice, numeric, matching, manual/numeric multipart, CUE-валидация и public AST отдельно от ключей | Ответы вне поддержанного Body/default-book owner API; shortanswer, multiple-choice, file/paper и более широкий multipart |
| Public student/full | явные native profiles; Core закрывает control, sol, grading-notes и ключи по текущему контракту; `.when-full`, profile-scoped ресурсы и product leak checks | Приватный контрольный транспорт для Print/export и настоящая LMS выдача; открытый Git не обеспечивает секретности исходников |
| Diagnostics | прежние 163 Original transport/receipt/retention guards сохранены; новые origin/neutral guards | Дополнительные предметные Source errors поставляются с Core |
| STYLE | стандартные Cosmo/Reveal, без дисциплинарного бренда; Presentation роли | Полная review каждого нового семантического UI после Core freeze |
| Скачиваемые данные | нейтральный worksheet ZIP, отдельный full instructor ZIP, reference исключён | Нативное финальное подтверждение обеих проекций |
| Программирование | Original Java corpus и независимые examples/cloud, examples/prairielearn сохранены | Compiler/infra/LMS delivery не следует из render декларации |
| Печать | Original PDF проверяется прежними утверждениями; Print имеет отдельную поставку | Новые печатные targets neutral курса не включены в этот tranche |
| Каталог и карта | QRC export адресов и native book navigation | Пользовательский семантический каталог/граф, не заменять им текущий QRC JSON |
| Environment | окружение authored проекта сохраняется при переносе | Учебные environment snapshots и dependency graph |
| LMS | независимые существующие декларации адаптеров | Реальный импорт, student delivery и grading gates; XML/JSON не являются таким proof |

Канонические задания используют обязательные `course-role` и `difficulty`;
`target` необязателен. Без target достаточно абзаца под настоящей авторской темой
`## … {#sec-ID}`; явный target сохраняет требование ведущего Header внутри задачи.
Прямой render без текущего owner proof отказывает; штатная managed-команда
использует prepare/activate, успешный native render, finish и проверку текущих
ресурсов. `course-check` сам не создаёт owner proof.

Структурированные YAML-ответы доступны через явный `body.sources` opt-in
поддержанного native default/book owner API, а не включены во всех книгах.
Передача потребителю требует текущего `validateOwnerBodies` и только publicPackage.
Public Body не принимает control, Cloud/PrairieLearn targets, rich QRC Cite,
raw HTML/TeX, inline Note и неподдерживаемый AST; Jupyter body не поддерживается.
Точная область — [контракт Body Core](https://github.com/Afonenko-Course-Tools/quarto-course/blob/da4c3730ec4779206588cbb1e9532ec541421c9f/docs/body-export.md).

Original мигрирован только по авторской границе canonical exr:
сохранены все условия, include, материалы, четыре Listing, book4/essay5 и
current/late/resource-нагрузка. Точный перечень — в
[карте миграции](original-author-migration.md). Шаблон не подменяет реальную
компиляцию утверждениями: product checker читает native HTML, а standalone
adapter route проверяет модель, полученную installed Core из native fragments.

# Минимальная миграция Original

База: `976aa3c45f4367e459c075cd650d138aac5becc9`. Сохранены все 93 авторских файла
Original, включая программные проекты, ресурсы и закрытые данные. В 10 QMD
изменены 14 строк атрибутов и добавлены пять тематических H2; остальные 83 файла
побайтно совпадают с базой. Все условия, прежние заголовки/ID, include, четыре
Listing и состав book4/essay5 сохранены. README не входит в историческую карту.

У самостоятельных исследований назначение `independent-study`, у скрытых
проверочных задач — `control`. Сложность essay скопирована в каждое задание
из страницы; для проверки clamp явно закреплён вводный уровень той же темы.
Демонстрации сохраняют своё назначение.

Lecture prediction/discussion и practice self-check — display-примеры `exm`.
Суффиксы и ID решений, их текст и локальные пары сохранены; `.when-full`
явно сохраняет прежнюю закрытость. Нативные handout exr остаются без изменений,
поскольку handouts не включают Core и используют native Quarto.

| Файл и исходная строка | До | После |
|---|---|---|
| `book/topics/contracts/_control.qmd:3` | `:::: {#exr-clamp-instructor target="manual" project="/projects/clamp"}` | `:::: {#exr-clamp-instructor course-role="control" difficulty="introductory" target="manual" project="/projects/clamp"}` |
| `book/topics/contracts/_exercises.qmd:1` | `:::: {#exr-clamp target="manual" project="/projects/clamp" difficulty="introductory" work-mode="individual"}` | `:::: {#exr-clamp course-role="independent-study" target="manual" project="/projects/clamp" difficulty="introductory" work-mode="individual"}` |
| `essay/text/decoding/_control.qmd:5` | `:::: {#exr-utf8-experiment target="manual" project="/text/decoding/projects/experiment"}` | `:::: {#exr-utf8-experiment course-role="control" difficulty="intermediate" target="manual" project="/text/decoding/projects/experiment"}` |
| `essay/text/decoding/_control.qmd:17` | `:::: {#exr-utf8-test-design target="manual" project="/text/decoding/projects/test-design"}` | `:::: {#exr-utf8-test-design course-role="control" difficulty="intermediate" target="manual" project="/text/decoding/projects/test-design"}` |
| `essay/text/decoding/_control.qmd:31` | `:::: {#exr-utf8-implementation target="manual" project="/text/decoding/projects/implementation"}` | `:::: {#exr-utf8-implementation course-role="control" difficulty="intermediate" target="manual" project="/text/decoding/projects/implementation"}` |
| `essay/text/decoding/index.qmd:11` | `:::: {#exr-utf8-research target="manual"}` | `:::: {#exr-utf8-research course-role="independent-study" difficulty="intermediate" target="manual"}` |
| `essay/text/immutability/index.qmd:9` | `:::: {#exr-text-immutability target="manual"}` | `:::: {#exr-text-immutability course-role="independent-study" difficulty="advanced" target="manual"}` |
| `essay/text/representation/index.qmd:10` | `:::: {#exr-text-representation target="manual" course-role="demonstration"}` | `:::: {#exr-text-representation target="manual" course-role="demonstration" difficulty="introductory"}` |
| `lectures/01/contracts.qmd:19` | `:::: {#exr-clamp-prediction course-role="prediction" difficulty="introductory" time="2" work-mode="individual"}` | `:::: {#exm-clamp-prediction course-role="prediction" difficulty="introductory" time="2" work-mode="individual"}` |
| `lectures/01/contracts.qmd:25` | `::: {#sol-clamp-prediction for="exr-clamp-prediction"}` | `::: {#sol-clamp-prediction .when-full for="exm-clamp-prediction"}` |
| `lectures/01/contracts.qmd:33` | `:::: {#exr-contract-discussion course-role="discussion" time="3" work-mode="pair"}` | `:::: {#exm-contract-discussion course-role="discussion" time="3" work-mode="pair"}` |
| `lectures/01/contracts.qmd:40` | `::: {#sol-contract-discussion for="exr-contract-discussion"}` | `::: {#sol-contract-discussion .when-full for="exm-contract-discussion"}` |
| `practice/01/clamp.qmd:19` | `:::: {#exr-clamp-self-check course-role="self-check" difficulty="introductory" work-mode="individual"}` | `:::: {#exm-clamp-self-check course-role="self-check" difficulty="introductory" work-mode="individual"}` |
| `practice/01/clamp.qmd:25` | `::: {#sol-clamp-self-check for="exr-clamp-self-check"}` | `::: {#sol-clamp-self-check .when-full for="exm-clamp-self-check"}` |

В native Book начальный H1 становится заголовком главы до захвата тела.
Для настоящей темы задания нужен явный Header в теле: перед следующими
заданиями/include добавлены тематические H2. Прежние H1, sec-ID, ссылки и exports
остаются на месте. Это авторские темы, а не восстановленная метадата заголовка.

| Файл | Добавленная тема |
|---|---|
| `book/topics/contracts/demonstration.qmd` | `## Исследование ограничения диапазона {#sec-clamp-investigation}` |
| `book/topics/contracts/index.qmd` | `## Применение контракта {#sec-contract-exercises}` |
| `essay/text/decoding/index.qmd` | `## Исследование декодирования {#sec-decoding-investigation}` |
| `essay/text/immutability/index.qmd` | `## Исследование сохранности {#sec-immutability-investigation}` |
| `essay/text/representation/index.qmd` | `## Исследование представления {#sec-representation-investigation}` |

Тема canonical exr определяется реальным reader Core по окружающему Header,
в том числе через сохранённые include. Никакая тема не дописана метаданными.
Полная before/after карта SHA256, размеров, атрибутов и добавленных тем хранится
в evidence `original-author-map.json` отчёта Task7a. Native acceptance обеих
stock-версий проверяется отдельно после заморозки всех поставщиков.

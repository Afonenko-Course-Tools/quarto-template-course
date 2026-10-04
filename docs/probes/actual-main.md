> Original авторский corpus теперь находится в `fixtures/probes/original-course/`.
> Runner создаёт свежий полный checkout и применяет фиксированное отображение
> Source origins; все frozen bytes, конфигурации и runtime-копии продолжают
> аутентифицироваться целиком. Корневой продукт теперь является нейтральным курсом.
> Прежние продуктовые проверки сохранены в `tests/check-original.ts --root <fresh-root>`
> и автоматически выполняются в releases/full-release после native guard проверок.

# Исходный пятичастный курс: отдельная native проверка

`actual-main-portal.yml` проверяет product managed portal на Quarto 1.10.18 и
1.11.5. Это отдельный исходный курс: все4 book и5 essay native inputs, остальные
три части, настоящая PDF-раздатка, прежние роли, visibility, archives и QRC/search
links обязательны. Эти три labels на каждом channel не входят в fixture25:
`actual-main-student`, `actual-main-full`, `actual-main-late-current-address`.

CI использует `student-release` и `full-release`: каждая phase запускает один
fresh audience с populated previous publications. Full получает только проверенные
public trees student phase того же run/channel. В `late` новая source/install попытка получает только полностью
проверенные публичные student/full files своего текущего workflow/channel.
Исходники, установленный payload, owners, native captures и permissions всегда
новые. `.project-publish`, `.quarto`, prepared handles, indexes и captures из
baseline не переносятся. Полный archive SHA и оба относительных file-set/SHA maps
сверяются до копирования public bytes.

```sh
ACTUAL_MAIN_RUN_ID=local-current quarto run tests/probes/actual-main-consumer.ts \
  --phase releases \
  --publisher /путь/к/quarto-project-publish \
  --qrc /путь/к/quarto-reference-catalog \
  --core /путь/к/quarto-course \
  --download /путь/к/quarto-project-download \
  --output /путь/к/new-release-evidence
```

`full-release` требует `--baseline` с public-only artifact `student-release`;
`late` — public-only artifact `full-release`. Runner принимает эти три finite
CI phases и local `releases` для полного student→full positive pair. Arbitrary
subset, smoke и resume отсутствуют.
Downstream artifact содержит ровно `publications.tar.gz` и `public-baseline.json`:
SHA/maps, source/install provenance и completed public attempt lineage. Native
logs, prepared handles, owner indexes/hashes, captures, private proofs и caches
остаются отдельным aggregate evidence и не поступают в fresh source job.
Все четыре clean companion refs закреплены в одном `portal-provider-refs.json`.
Все шесть payload archives проходят реальный `quarto add`; полные внешние и24
product установленные копии сверяются, включая8 Core,9 Presentation и2 Navigation.
Cloud/PL имеют отдельную whole-install provenance и проходят native route в Pages.

Тест заменяет только объявленные consumer `.ts` slots `_publication/` в новой
копии, фиксируя source/target SHA. Authored configs и QMD не переписываются ни
runner, ни hook: исходный root и все9 глав сравниваются с точными checkout bytes
до и после каждой попытки. Slot adapters используют те же documented public
Core/Publisher interfaces, actual `ctx.portal`, member boundaries и metadata
outputs. Root остаётся только навигацией, а book/essay получают собственные
current owners. Стандартные поисковые индексы Quarto проверяются отдельно у
root portal, book и essay; единый межкнижный индекс не требуется. QRC обновляет
текст всех фактических `search.json`, а проверки student visibility сохраняются
для каждого из них. `tests/check-original.ts --root <fresh-root>` отдельно проверяет реальные product controllers,
оба профиля, roles/archive assertions и local links; при запуске без `--skip-render`
он также собирает оба optional examples через поддерживаемый HTML owner route;
`tests/external.ts` сохраняет внешний каталог/HTTP gate.

Late fault выполняется обычным configured finalizer после QRC и успешного
child finish, перед navigation finish/current seal: меняются current mounted
bytes `handouts/contracts.pdf`. Требуются конкретный документированный provider
refusal, настоящее изменение SHA, exact lifecycle ordering, новые attempt/index
hashes и сохранность обоих прежних полных public trees без temporary file events.
`actual-main-settings.json` хранит только precise refusal и объявленные slots;
неопределённый код останавливает required gate. Произвольный nonzero не считается
доказательством.

Каждый student-release, full-release и fresh late job имеет budget 360 минут;
aggregate — 5 минут. Standard `pages.yml` проверяет нейтральный корневой курс
в обоих профилях, оба optional examples и external imports. Каждый native профиль
собирается в отдельном job с budget 360 минут: full, затем student в свежем
checkout того же Source/run/channel. Передаются только полные публичные деревья
full и двух optional examples; их bytes, modes и complete maps проверяются до
переноса и после student-сборки. Финальные jobs с прежними именами `Проверка`
проверяют оба нейтральных выпуска через `tests/check.ts --skip-render` и
`tests/external.ts`. Самостоятельный Original consumer вызывает сохранённый
`tests/check-original.ts --root <fresh-root> --skip-render` в releases/full-release
после появления обоих настоящих Original public trees. Только успешные
full/student Pages jobs допускают финальную проверку
и прежнюю conditional student Pages upload/deploy. Добавленные четыре workers
увеличивают Source-defined required set с 18 до 22 jobs; deploy остаётся отдельно.
Для исходных Markdown inputs prepare требует 16 book + 20 essay + 2 navigation
source/identity renders за попытку, 76 за positive pair. Эти 38 renders не
включают repeated current owner/parent inspect audits, native members/PDF,
QRC, finalization и setup. Исторические интервалы 216–224 секунды между
source/identity парами давали лишь нижний planning anchor, а не полный runtime.

На exact head `21ef5f0` оба student jobs завершились по лимиту 150 минут
(`The job has exceeded the maximum execution time of 2h30m0s`). В обоих
diagnostic artifacts последний из 8 observer markers — `child-owners-finished`;
последующие navigation finish/current seal и phase receipt не сохранены.
Full и late jobs были skipped из-за `needs`; они используют тот же fresh course
pipeline и свои completed public baselines. Поэтому все три native phase jobs
получают одинаковый лимит 360 минут без сокращения inputs, matrices, assertions
или preservation chain. Новый лимит требует проверки новым завершённым run;
это не гарантия длительности и не утверждение о native Green или acceptance.


Stable Pages на предшествующем `21ef5f0` завершился по hosted-job лимиту 6 часов;
prerelease завершился успешно. Повышение лимита выше 360 минут не используется.
Разделение сохраняет последовательность full→student и проверку сохранности
предыдущего выпуска, не переносит private Owner/captures/caches и не сокращает
native inputs или assertions. Длительность отдельного профиля и весь новый
Source требуют завершённых fresh local/CI проверок; приёмка ещё не заявлена.

Aggregation принимает только все шесть успешных phases/jobs текущего run,
exact clean Template head/tree/file map, одинаковые provider/installed maps,
полные native logs и actual metadata JSONL, совпадающие с observations. После
проверки lineage, source bytes, оригинального состава, release continuity,
late refusal и full preservation создаётся отдельный complete receipt с6 labels
на двух channels. Synthetic receipt guards и real archive-transfer guards
проверяют transport; они не заменяют native course proof.

Текущий exact provider set задан четырьмя ключами в
`tests/probes/portal-provider-refs.json`; полная установленная композиция описана
в `UPSTREAM.md`. Все активные Core/Presentation/Navigation copies берутся из
одного Core commit. Расширенный `ACTUAL_MAIN_INSTALLATIONS` включает нейтральные
части, Original book/essay, lectures/practice и оба самостоятельных адаптера.
Проверяются complete file sets, SHA256, bytes, modes и bundled licenses; равенство
источника/установки само по себе не закрывает native acceptance.

Каноническая author migration не меняет условия, проекты и состав native inputs.
Точная карта атрибутов и тематических H2 — в `docs/original-author-migration.md`.
Native Book извлекает chapter H1 до захвата тела; явный H2 сохраняет авторскую тему
в настоящем Source capture. Прежние H1 ID и QRC exports сохранены.
`source-root.json` сохраняет свежую source-копию, exact refs и начало попытки для
пассивного сохранения логов. Он не входит в public-only downstream artifacts.
Прежние native результаты не переносятся на новый pin: Native Green требует
завершённую текущую попытку.

Историческая малая native проба: `SOURCE.PUBLICATION_ADDRESS_CHANGED` фактически
получен на Quarto 1.10.18 после
QRC и child finish, до Nav finish/seal, через публичный child current accessor
при изменении mounted `handouts/contracts.pdf`. Малый native checkpoint использовал
точный Core29f payload96, затем восстановил PDF, подтвердил current positive и
завершил обычные Nav finish/seal. Тогдашний Core5eaf менял только CI environment;
все96 Core и пакеты Navigation/Presentation побайтно равны29f. Это наблюдение
accessor, не отрицательный вызов Nav finish и не original 9 late case. Оно относится
к прежнему payload 96 и не доказывает выбранный текущий Core. Required
original late CI вызывает реальный Nav finish после этой же мутации и обязан
наблюдать точный code, сохранить оба public trees и показать zero public events.
Generic nonzero не принимается.

Быстрые 178 transport/storage/Source/model проверки, прежние CLI paths, filtering, JUnit и
карта всех 33 split / 54 transfer cases описаны в
[actual-main-fast-tests.md](actual-main-fast-tests.md). Они запускаются перед
native попыткой в существующих student jobs и не заменяют native proof.

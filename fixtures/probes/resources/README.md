# Текущие body и resources одного установленного owner

Этот consumer поддерживает один HTML owner `tasks` и ровно профиль student либо full. Native book выбирает `corpus.qmd`, `work-one.qmd`, `work-two.qmd` как authored chapters для body и сохраняет отдельный `index.qmd` с обычной QRC navigation. У этих body chapters обычный YAML `title` и отдельный первый H2 с явным ID корпуса/работы. Core доказывает сохранённый H2 через paired native captures; Quarto забирает H1 главы до этой границы, и consumer не восстанавливает его из metadata. Штатная цепочка Core → Presentation → Download и native pre/post hooks сохраняется; owner-freeze обязан быть последним pre hook. `prepareOwner` делает captures с no-execute, metadata callback активирует только tasks с фактическим абсолютным `ctx.output`. Только после успешных native children и `finishOwner` сохраняется текущий `report.body`. Сохранённый attempt reference обязателен: Publisher загружает finalize module заново.

`validateOwnerResources` получает конкретные owner-relative selected paths. `allowed/reasons` и baseline/actual predicates принадлежат Core CUE. Consumer не читает прежний policy.json и не выводит приватность из каталогов, имён или project-download.profiles. QMD navigation links не являются raw selection; отдельно registered starter-QMD доставляется в полном starter project.

`validateOwnerBodies` и `validateOwnerResources` проверяют текущую попытку после finish, перед Print/ZIP и последним audit перед commit. В Print передаётся только проверенный `course-body-package-v1` publicPackage: canonical questions, явно фиксированные works и actual resource bytes. Receipt связывает source/SHA/target/effectiveBase с current owner index. Consumer не читает QMD/HTML для body, не запускает второй engine и не подставляет URLs в package. Финализация QRC обязана завершиться до Print; обычные ссылки корпуса уже являются авторскими окончательными URLs. Raw QMD, private/public packages, Session/captures/seals/receipt, producer modules и Print receipts служебны, включая renamed/ZIP copies.

Student positive вычисляет реальный paragraph/table/plot одним R pass. Две работы используют общие canonical questions, все choice options сохраняются, закрытые keys/solution/grading notes в Print не поступают. Full с generated plot без executed student proof отказывает; отдельный authored static-public full корпус поддержан без engine. Смена authored condition должна менять publicPackage и PDF новой попытки. Managed portal Publisher хранит прежний полный public file set и SHA при отказе; root не получает фиктивную member namespace.

Перед native Download utility проверяется весь конкретный starter набор через Core. До ZIP materializes текущий PDF, копируются только выбранные current Print targets. Последний audit проверяет обычные файлы и архивы: Python zipfile сохраняет infolist без потери duplicates, file/libmagic/tarfile распознают renamed/unsupported carriers. Проверяются entry paths, bytes, symlink metadata, count/size, отсутствие nested archives и exact текущие PDF/resource/ZIP hashes. Служебные hashes сохраняются до удаления временных Print directories.

Публичные runtime assets имеют отдельный producer-owned descriptor, который использует actual native registration. CUE возвращает runtimeEligibility, сохраняя raw source service/denied. Mature HTMLParser проверяет marked tags, типы, current bytes descriptor/entrypoint/source каждой собственной member copy и точный destination из URL. Только тот же service identity в этом конкретном ordinary output destination получает разрешённое производное отношение; ZIP/utility/renamed copy исключения не получают.

Нативная проба и exact installed byte manifest:

```sh
quarto run tests/probes/resource-consumer.ts \
  --core <body-Core-repo> --core-ref <immutable-body-commit> \
  --publisher <Publisher-repo> --publisher-ref <immutable-Publisher-commit> \
  --qrc <QRC-repo> --qrc-ref <immutable-QRC-commit> \
  --download <Download-repo> --download-ref <immutable-Download-commit> \
  --print <Print-repo> --print-ref <immutable-Print-commit> \
  --output <fresh-evidence-directory>
python3 tests/probes/resource-archive-guards.py
python3 tests/probes/resource-runtime-guards.py
```

Каждый complete extension устанавливается из immutable git archive через `quarto add`; manifest фиксирует commit/tree, archive hashes, полный file set/SHA и равенство member copies. QRC берётся из собственного exact provider tree; Body, Presentation и Navigation — из одного exact Core tree. Stock `quarto create-project --type default --no-scaffold --engine markdown` инициализирует metadata до owner freeze. `QUARTO` и `PATH` должны указывать на одну выбранную дистрибуцию Quarto; fresh XDG/DENO cache создаётся для каждой попытки. Проверка archive detector требует штатный `file` (libmagic), а PDF assertions — poppler-utils. Controlled negative finalizers находятся только в tests/probes/resource-faults.ts и подключаются тестом для конкретных отказов; обычные consumer finalizers не содержат mutations.

Тайминги fresh полного rebuild записываются в phaseTimings/printTimings и events: prepare/captures, native tasks render, duration R cell body, finish/index, Print, native Download и final audit. Они не доказывают incremental performance; адресный preview здесь не поддержан.

Границы: HTML student/full одного выбранного owner, явный knitr и native cell-output-display plot, известные installed producers. Auto-selected/другие engines, opaque dependencies/неизвестные carriers, A9 и preview остаются gate. Эта проба не доказывает педагогическое ownership всех child проектов. Историческая artifacts fixture сохраняет собственную прежнюю экспериментальную область доказательств.

Для устойчивого source scope используйте native anchored `./materials/**` либо конкретный owner-relative файл и проверяйте `quarto inspect` обоих профилей. Неограниченный `materials/**` может выбрать одноимённые файлы из output другого профиля после capture: в observed stable probe full resources выросли за счёт `_output/student/materials/**`, и Core отказал с SOURCE.CONFIGURATION_CHANGED. Эта рекомендация не добавляет новый registry/parser или warning gate; authority остаётся штатный native inspect и frozen Core audit.

Print-owned ZIP targets (`handout.pdf` и selected resources) зарезервированы для текущего Print результата: совпадающий starter source target отклоняется до copy. Последний audit независимо связывает ZIP PDF/resources с сохранённым Print receipt, даже если общий archive mapping заменён. После каждого успешного Core validator consumer обновляет и сохраняет hashes всей уже известной producer-owned `.course-owner` области, включая новые CUE transports; поздний renamed copy этих bytes запрещён.

CI запускает пять обязательных фаз `current`, `lifecycle`, `owner`, `body`, `delivery` на обеих версиях Quarto. По умолчанию runner выполняет весь набор; `--phase` меняет только orchestration. Явная таблица cases проверяется на полное покрытие без пересечений, а каждая фаза создаёт genuine student release для зависимых refusal/retention проверок. Body integrity — одна native attempt с 13 последовательными byte/handle mutations, точным restore и recovery через production `current(ctx)`; последний tamper проверяет обычный delivery отказ до Print/ZIP/commit. Это не 13 отдельных native builds.

Job budget составляет 150 минут: измеренный fresh baseline занял 801 секунд, из них prepare/captures 435 секунд. Консервативный план учитывает до 15 минут на каждый native build, 20 минут setup, 5 минут прочих проверок и до 3 минут на каждый из 28 дополнительных `current` вызовов body batch (включая fresh backing index перед generated mutation). Это runtime allowance, не сокращение проверок; aggregate фиксирует фактические результаты, provider refs и полные installed file maps. Populated prior release retention доказывают отдельные обязательные фазы; свежий smoke с исходными null maps этого не доказывает.

Каждый ожидаемый отказ сравнивает полные before/after file set и SHA сразу обоих public деревьев student/full. Точные карты, пути evidence и hashes сохраняются в final/partial outcomes до assertions; отказ guard сохраняет failed outcome. CI печатает outcomes и обе сохранённые карты с hashes даже при падении проверки.

Generated mutation использует только `actualPath` уникального generated entry из fresh проверенного public owner index, совпадающего с canonical body resource по source/SHA. Logical source не является физическим путём под SourceRoot: stock book переносит plot в native output. Перед изменением сохраняются current handle/index, SourceRoot/native output coordinates и actual byte SHA; final/partial outcomes сохраняют эту evidence вместе со всеми 13 точными отказами и восстановлениями.

Current Body, Presentation and Navigation are installed from the same `--core` / `--core-ref` archive; there is no independent current Navigation provider. Historical P0 probes keep their original pins.

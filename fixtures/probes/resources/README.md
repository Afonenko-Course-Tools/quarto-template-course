# Установленная попытка с production owner resources

Этот consumer поддерживает один HTML owner `tasks` и ровно профиль student либо full. Canonical tasks сохраняет штатную цепочку Core → Presentation → Download и native pre/post hooks; owner-freeze обязан быть последним pre hook. `prepareOwner` делает captures с no-execute, metadata callback активирует только tasks с фактическим абсолютным `ctx.output`, первый finalize получает finish/index после успешных native children. Сохранённый attempt reference обязателен: Publisher загружает finalize module заново.

`validateOwnerResources` получает конкретные owner-relative selected paths. `allowed/reasons` и baseline/actual predicates принадлежат Core CUE. Consumer не читает прежний policy.json и не выводит приватность из каталогов, имён или project-download.profiles. QMD navigation links не являются raw selection; отдельно registered starter-QMD доставляется в полном starter project.

Print body — отдельный экспериментальный snapshot-local producer из exact Core export payload. Он использует Pandoc/CUE без повторного engine. Receipt привязывает body inputs/producer/package bytes к текущим attempt/session, owner evidence и финальному QRC URL. Конкретные публичные input resources разрешены через bounded producer relation; raw QMD/package/session/producer/Print receipts служебны. Это не production педагогический пакет из того же native owner body.

Перед native Download utility проверяется весь конкретный starter набор через Core. До ZIP materializes текущий PDF, копируются только выбранные current Print targets. Последний audit проверяет обычные файлы и архивы: Python zipfile сохраняет infolist без потери duplicates, file/libmagic/tarfile распознают renamed/unsupported carriers. Проверяются entry paths, bytes, symlink metadata, count/size, отсутствие nested archives и exact текущие PDF/resource/ZIP hashes. Служебные hashes сохраняются до удаления временных Print directories.

Публичные runtime assets имеют отдельный producer-owned descriptor, который использует actual native registration. CUE возвращает runtimeEligibility, сохраняя raw source service/denied. Mature HTMLParser проверяет marked tags, типы, current bytes descriptor/entrypoint/source каждой собственной member copy и точный destination из URL. Только тот же service identity в этом конкретном ordinary output destination получает разрешённое производное отношение; ZIP/utility/renamed copy исключения не получают.

Нативная проба и exact installed byte manifest:

```sh
quarto run tests/probes/resource-consumer.ts \
  --core <production-Core-repo> --core-export <experimental-export-repo> \
  --publisher <Publisher-repo> --download <Download-repo> --print <Print-repo> \
  --output <fresh-evidence-directory>
python3 tests/probes/resource-archive-guards.py
python3 tests/probes/resource-runtime-guards.py
```

`QUARTO` и `PATH` должны указывать на одну выбранную дистрибуцию Quarto; fresh XDG/DENO cache создаётся для каждой попытки. Проверка archive detector требует штатный `file` (libmagic), а PDF assertions — poppler-utils. Controlled negative finalizers находятся только в tests/probes/resource-faults.ts и подключаются тестом для конкретных отказов; обычные consumer finalizers не содержат mutations.

Тайминги fresh полного rebuild записываются в phaseTimings/printTimings и events: prepare/captures, native tasks render, duration R cell body, finish/index, Print, native Download и final audit. Они не доказывают incremental performance; адресный preview здесь не поддержан.

Границы: HTML student/full, явный knitr и native cell-output-display plot, известные installed producers. Auto-selected/другие engines, opaque dependencies/неизвестные carriers, весь native body export, A9, preview и временный native portal output остаются gate. Историческая artifacts fixture сохраняет собственную прежнюю ограниченную область доказательств.

Для устойчивого source scope используйте native anchored `./materials/**` либо конкретный owner-relative файл и проверяйте `quarto inspect` обоих профилей. Неограниченный `materials/**` может выбрать одноимённые файлы из output другого профиля после capture: в observed stable probe full resources выросли за счёт `_output/student/materials/**`, и Core отказал с SOURCE.CONFIGURATION_CHANGED. Эта рекомендация не добавляет новый registry/parser или warning gate; authority остаётся штатный native inspect и frozen Core audit.

Print-owned ZIP targets (`handout.pdf` и selected resources) зарезервированы для текущего Print результата: совпадающий starter source target отклоняется до copy. Последний audit независимо связывает ZIP PDF/resources с сохранённым Print receipt, даже если общий archive mapping заменён. После каждого успешного Core validator consumer обновляет и сохраняет hashes всей уже известной producer-owned `.course-owner` области, включая новые CUE transports; поздний renamed copy этих bytes запрещён.

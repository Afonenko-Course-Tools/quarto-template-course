# Текущий integration-транш Codex — 3 октября 2026

План исполнения: `quarto-codex-handoff-2026-10-03.md` в пакете передачи; нормативные планы v91/v29/v6 сохранены без изменений. Merge в default branches и release не поручены.

## Progress

- Восстановлены девять чистых checkout из GitHub. Исходники не извлекались из evidence. Действующих AGENTS.md в этих checkout и родительских каталогах нет.
- Проверены SHA256 всех семи файлов передачи.
- Template `feat/native-listing-consumer` восстановлен с точным tree `f4689e7267359163abfc0573352e9c837869385c`.
- Core #15 сохраняет head `0f7f9a84f404c26a04d34d25602a7643ba3a6fd3`; на 13:33 по Минску прошли 10/12 checks. Navigation Stable/Pre в run `37112921790` ещё выполняются. Новые Actions runs не запускались.
- Локально прошли navigation root-address typecheck, Navigation model и девять PURE collision-authority cases. Это не OriginalCourse acceptance.

| Checkout | Branch | Commit | Tree |
| --- | --- | --- | --- |
| quarto-course | `feat/root-native-output-addresses` | `0f7f9a84f404c26a04d34d25602a7643ba3a6fd3` | `16bd466d4b3eb1d551d54100134d8ac49f05a95c` |
| quarto-course-cloud | `master` | `b9477d2af1ce7015595c55ba35c390583d5f1a7f` | `ebaf32b2237d6afc8fc013d9092335f4c83bd6b5` |
| quarto-course-moodle | `feat/installed-contract-ci` | `58d988ba1ee0ba940a0bf409e57af9c7fec595f8` | `0923f2dfec3537f44a03cbde52405376704a6c1e` |
| quarto-course-prairielearn | `master` | `e56027f141dbf0be954cb9bb47f0b076799fca9d` | `7877c78da0fbd06f6a4b4bffca3bfbc7030fd66d` |
| quarto-course-print | `feat/production-body-transport` | `1ae4f0c5697d415746c7fce94067b5a1e13db503` | `a52fce761d3b4691a176b3bc28fda5db8adf73be` |
| quarto-project-download | `feat/owned-request-state` | `d78a533b14c38e3dd64dbfbd59e437a82e2752fd` | `7e21f82dd770eb2c1593aae54bebedf1b8e6cbaf` |
| quarto-project-publish | `feat/failure-diagnostics` | `ae6b5320f99afba1b6adada654ead7978d8a8dab` | `22e97a507062072066092d3f838b3fe50063424f` |
| quarto-reference-catalog | `feat/managed-portal-namespace` | `9a4bf6aafd73aff0daf51ae208247f3f194057c2` | `373d092afe0d562e0b07744321da210348b5181c` |
| quarto-template-course | `feat/native-listing-consumer` | `0882865437d5dc752015ffe4695cb776d98c2e85` | `f4689e7267359163abfc0573352e9c837869385c` |

## Discoveries

- Stock Quarto 1.11.5 не может писать кеш/логи в домашние каталоги внутри sandbox. Штатные XDG cache/data directories перенесены в рабочую папку для каждого исполнителя/channel; runtime не изменён.
- Холодный параллельный `quarto run` с одним кешем вызвал гонку копирования `deno_std`. Кеши теперь инициализируются последовательно и отдельно.
- Workflow требует CUE v0.17.1; системный CUE имеет language v0.16.1. Установлен официальный v0.17.1 в `local-tools/cue` рабочего пакета. Quarto Stable 1.10.18 загружен из официального release, prerelease 1.11.5 — системный stock binary.

## Decision Log

- Свои изменения выполняются в новых локально восстановленных feature checkout; чужих изменений в них нет.
- Задачи 1→2→3→4→5→6 сохраняют порядок. Pending provider gates не объявляются принятыми; независимые быстрые тесты выполняются параллельно.
- Source и тестовые authored QMD/configs не упрощаются. Новый student attempt создаётся только после Core #15 acceptance и полного installed Template commit.

## Outcomes & Retrospective

Задача 1: восстановление refs и инструментов завершено; текущий полный GitHub registry сохраняется отдельно в пакете передачи. Первый незакрытый gate — Navigation Stable/Pre Core #15. Body/Nav интеграция, Original student/full/late обоих channels, текущая единая production композиция и дальнейший §7 backlog остаются открытыми.

Checkpoint:

```text
Scope: workspace restore / Core #15 current-head gate
Core commit/tree: 0f7f9a84f404c26a04d34d25602a7643ba3a6fd3 / 16bd466d4b3eb1d551d54100134d8ac49f05a95c
Template start commit/tree: 0882865437d5dc752015ffe4695cb776d98c2e85 / f4689e7267359163abfc0573352e9c837869385c
Running: Core Navigation run 37112921790, jobs 111174171572 Stable / 111174171790 Pre
Next: cwd /home/tolya/course-tools; gh api repos/Afonenko-Course-Tools/quarto-course/actions/runs/37112921790/jobs --jq '.jobs[] | {id,name,status,conclusion}'
Limits: native OriginalCourse not yet executed; no acceptance inferred from PURE checks
```

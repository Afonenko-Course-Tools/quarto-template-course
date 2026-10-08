# Публикация руководства — 8 октября 2026

Штатный `task publish` завершился с exit 0: существующая проверка сайта и примеров, затем `quarto publish gh-pages --no-render`. Использован чистый main `8b050033b594eeae4270ca6f55f12a1d6e8f1243`, без дополнительного render или изменения исходников.

Опубликованный gh-pages: `a55b0e399febec10b9dec4a87273adb5b603e732`. GitHub Pages подтвердил `built` для этого commit, legacy source `gh-pages:/`, HTTPS. Все 599 файлов совпали побайтово с проверенным `_site`; единственный дополнительный файл — штатный `.nojekyll`. Main остался чистым.

22 live HTTP-проверки подтвердили HTTP 200 и точные SHA256: главная, руководство, каталог, search.json, BUILD/index всех восьми групп, PDF и Moodle XML. Машинная квитанция: `verified-pages.json`; команда проверки: `python3 /tmp/verify-template-pages-20261008.py`.

В браузере Codex проверены главная, штатное окно исходника с фактическим QMD, поиск «банк» (22 результата), каталог восьми групп и переход в готовый Core HTML. Руководство оставлено открытым.

URL: https://afonenko-course-tools.github.io/quarto-template-course/

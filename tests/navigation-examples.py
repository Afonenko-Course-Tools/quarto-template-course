"""Проверка буквального HTML/Reveal-примера без изменения ready assets."""
from pathlib import Path
import argparse, json, os, re, shutil, subprocess, tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--core-source', type=Path)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
extensions = args.core_source/'_extensions' if args.core_source else repo/'_extensions/Afonenko-Course-Tools'
page = (repo/'guide/navigation.qmd').read_text()
def snippets(language):
    return re.findall(r'^```'+language+r'\n(.*?)^```\s*$', page, re.M | re.S)

with tempfile.TemporaryDirectory(prefix='guide-navigation-') as directory:
    root = Path(directory)
    shutil.copytree(extensions/'course-navigation', root/'_extensions/course-navigation')
    (root/'slides').mkdir()
    (root/'_quarto.yml').write_text(snippets('yaml')[0])
    index, lesson = snippets('qmd')
    (root/'index.qmd').write_text(index)
    (root/'slides/lesson.qmd').write_text(lesson)
    result = subprocess.run([os.environ.get('QUARTO', 'quarto'), 'render'], cwd=root,
                            capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
    html = (root/'_site/index.html').read_text()
    reveal = (root/'_site/slides/observation.html').read_text()
    assert 'href="./slides/observation.html"' in html or 'href="slides/observation.html"' in html
    assert 'https://github.com/owner/course/blob/main/lectures/index.qmd' in html
    assert 'https://github.com/owner/course/issues/new' in html
    payload = re.search(r'<script id="course-navigation-context" type="application/json">(.*?)</script>', reveal, re.S)
    assert payload, 'Нет native-контекста действий Reveal'
    links = json.loads(payload[1])['links']
    assert [(link['text'], link['href']) for link in links] == [
        ('Курс', 'https://example.org/course/index.html'),
        ('Все лекции', '../index.html'),
        ('Теория', 'https://example.org/course/theory/index.html'),
        ('Исходный код', 'https://github.com/owner/course/blob/main/lectures/slides/lesson.qmd'),
        ('Сообщить об ошибке', 'https://github.com/owner/course/issues/new'),
    ]
    assert (root/'_quarto.yml').read_text() == snippets('yaml')[0]
    assert (root/'slides/lesson.qmd').read_text() == lesson
    print('PASS буквальные native HTML/Reveal: output-file, вложенный источник, постоянные выходы, source/issue и авторские байты')

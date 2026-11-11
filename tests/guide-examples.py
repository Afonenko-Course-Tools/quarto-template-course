"""Render literal authoring snippets through native Quarto and the selected Core.

Default: verify the installed pinned extension. During unreleased preparation,
--core-source /path/to/quarto-course uses that owner's current source read-only.
No producer ready tree is generated or changed by this test.
"""
from pathlib import Path
import argparse, json, os, re, shutil, subprocess, tempfile, unittest

parser=argparse.ArgumentParser()
parser.add_argument('--core-source',type=Path)
args=parser.parse_args()
repo=Path(__file__).resolve().parents[1]
source=args.core_source/'_extensions' if args.core_source else repo/'_extensions/Afonenko-Course-Tools'
quarto=os.environ.get('QUARTO','quarto')
env=os.environ.copy()

def snippets(page, language='qmd'):
    text=(repo/'guide'/page).read_text()
    pattern=re.compile(r'^(`{3,})'+re.escape(language)+r'\n(.*?)^\1\s*$',re.M|re.S)
    return [match[2] for match in pattern.finditer(text)]

root=Path(tempfile.mkdtemp(prefix='native-guide-examples-'))
try:
    for component in ['course-core','course-presentation','course-navigation']:
        shutil.copytree(source/component,root/'_extensions'/component)
    (root/'bank').mkdir()
    (root/'works').mkdir()
    (root/'bank/_metadata.yml').write_text('exercise-bank: true\ndefault-exercise-statement-visibility: open\n')
    bank,*works=snippets('assessments.qmd')
    assert len(works)==4,'Expected the four literal work scenarios'
    (root/'bank/integrity.qmd').write_text(bank)
    for name,text in zip(['lab','seminar','practical','test'],works):
        (root/f'works/{name}.qmd').write_text(text)
    answers=snippets('answers.qmd')
    assert len(answers)==5,'Expected all five literal answer forms'
    (root/'bank/answers.qmd').write_text('# Формы ответа {#sec-answer-forms}\n\n'+'\n'.join(answers))
    (root/'bank/roles.qmd').write_text('# Педагогические роли {#sec-role-examples}\n\n'+'\n'.join(snippets('roles.qmd')))
    (root/'bank/solutions.qmd').write_text('# Решения {#sec-solution-examples}\n\n'+'\n'.join(snippets('solutions.qmd')[:2]))
    (root/'ordinary.qmd').write_text(snippets('exercises.qmd')[2])
    defaults=snippets('exercises.qmd','yaml')[1]
    assert 'default-exercise-difficulty: introductory' in defaults
    assert 'default-exercise-time: 90' in defaults
    (root/'bank/defaults.qmd').write_text('---\n'+defaults+'---\n\n# Итоговые defaults {#sec-effective-defaults}\n\n'+snippets('exercises.qmd')[-1])
    (root/'works/defaults.qmd').write_text('---\nassessment:\n  id: effective-defaults\n  kind: lab\n---\n\n# Итоговые defaults {#sec-default-work}\n\n::: {.task-items}\n1. @exr-inherited-estimate\n2. @exr-own-estimate\n:::\n')
    (root/'works/answers.qmd').write_text('---\nassessment:\n  id: answer-forms\n  kind: lab\n---\n\n# Формы ответа {#sec-answer-work}\n\n::: {.task-items}\n'+''.join(f'{i}. @exr-{name}\n' for i,name in enumerate(['explain','choose','size','parts','match'],1))+':::\n')
    (root/'index.qmd').write_text('# Примеры руководства\n')
    chapters=['index.qmd','bank/integrity.qmd','bank/answers.qmd','bank/roles.qmd','bank/solutions.qmd','bank/defaults.qmd','ordinary.qmd']+[f'works/{name}.qmd' for name in ['lab','seminar','practical','test','answers','defaults']]
    (root/'_quarto.yml').write_text('project:\n  type: book\n  pre-render: _extensions/course-core/entrypoints/pre.ts\n  post-render: _extensions/course-core/entrypoints/post.ts\nbook:\n  title: Проверка примеров руководства\n  chapters: CHAPTERS\ncourse:\n  id: integrity-course\nfilters: [course-core, course-presentation]\nformat: html\nlang: ru\nfail-if-warnings: true\n'.replace('CHAPTERS',json.dumps(chapters)))
    for view in ['student','full']:
        (root/f'_quarto-{view}.yml').write_text(f'project:\n  output-dir: _book-{view}\ncourse:\n  view: {view}\nformat:\n  html:\n    code-tools: {{source: false}}\n    keep-source: false\n')
    def run(arguments):
        result=subprocess.run([quarto,*arguments],cwd=root,env=env,capture_output=True,text=True)
        assert result.returncode==0,' '.join(arguments)+'\n'+result.stdout+result.stderr
    for view in ['student','full']:
        run(['render','--profile',view])
    student=(root/'_book-student/bank/integrity.html').read_text()
    full=(root/'_book-full/bank/integrity.html').read_text()
    assert 'id="exr-integrity-variant"' not in student
    assert 'id="exr-integrity-variant"' in full
    assert 'id="sol-collision"' not in student and 'id="sol-collision"' in full
    assert 'id="sol-repair"' not in student and 'id="sol-repair"' in full
    assert 'Сначала вычислим исходную сумму' in student
    for name in ['practical','test']:
        html=(root/f'_book-student/works/{name}.html').read_text()
        assert 'integrity.html#exr-integrity-variant' not in html
    student_answers=(root/'_book-student/bank/answers.html').read_text()
    assert 'В ответе должны быть разделены' not in student_answers
    assert 'id="sol-lab-1"' not in (root/'_book-student/bank/solutions.html').read_text()
    assert 'id="sol-lab-1"' in (root/'_book-full/bank/solutions.html').read_text()
    roles=(root/'_book-full/bank/roles.html').read_text()
    for role in ['Демонстрация','Обсуждение','Самостоятельная работа','Контроль','Цели',
                 'Предварительные знания','Материалы','Главное','Ограничение','Типичная ошибка','Критерии','Что сдавать']:
        assert role in roles,'Missing rendered pedagogical role: '+role
    ordinary=(root/'_book-student/ordinary.html').read_text()
    assert 'id="exr-observe"' in ordinary and 'id="sol-observe"' in ordinary
    defaults_html=(root/'_book-full/bank/defaults.html').read_text()
    for identity,difficulty,time,visibility in [('exr-own-estimate','advanced','35','restricted')]:
        opening=re.search(r'<div[^>]*id="'+identity+r'"[^>]*>',defaults_html).group()
        assert 'data-course-difficulty="'+difficulty+'"' in opening
        assert 'data-course-time="'+time+'"' in opening
        assert 'data-statement-visibility="'+visibility+'"' in opening
    defaults_student=(root/'_book-student/bank/defaults.html').read_text()
    assert 'id="exr-inherited-estimate"' in defaults_student
    assert 'id="exr-own-estimate"' not in defaults_student
    for identity,minutes in [('exr-checksum',10),('exr-collision',25),('exr-repair',40)]:
        opening=re.search(r'<div[^>]*id="'+identity+r'"[^>]*>',full).group()
        assert f'data-course-time="{minutes}"' in opening
    # Действующий HTML-контракт: https://github.com/Afonenko-Course-Tools/quarto-course/issues/81
    # После исправления unexpected success требует снять expectedFailure.
    class KnownCoreHTMLFailures(unittest.TestCase):
        @unittest.expectedFailure
        def test_assessment_time_summary(self):
            expected='Задачи: обязательные 35 мин; все 75 мин. Теория: 15 мин. Занятие: обязательные 50 мин; все 90 мин.'
            for view in ['student','full']:
                self.assertIn(expected, (root/f'_book-{view}/works/seminar.html').read_text())

        @unittest.expectedFailure
        def test_inherited_exercise_defaults(self):
            opening=re.search(r'<div[^>]*id="exr-inherited-estimate"[^>]*>',defaults_html)
            self.assertIsNotNone(opening)
            for attribute in ['data-course-difficulty="introductory"',
                              'data-course-time="90"',
                              'data-statement-visibility="open"']:
                self.assertIn(attribute, opening.group())

    result=unittest.TextTestRunner(verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(KnownCoreHTMLFailures))
    if not result.wasSuccessful():
        raise SystemExit(1)
    print('PASS literal guide native student/full book, roles, four work scenarios, five answer forms, authored time metadata and explicit defaults')
finally:
    shutil.rmtree(root)

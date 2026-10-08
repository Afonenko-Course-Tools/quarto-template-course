"""Render literal authoring snippets through native Quarto and the selected Core.

Default: verify the installed pinned extension. During unreleased preparation,
--core-source /path/to/quarto-course uses that owner's current source read-only.
No producer ready tree is generated or changed by this test.
"""
from pathlib import Path
import argparse, json, os, re, shutil, subprocess, tempfile

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
    (root/'bank/_metadata.yml').write_text('exercise-bank: true\nexercise-statement-visibility: open\n')
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
    (root/'works/answers.qmd').write_text('---\nassessment:\n  id: answer-forms\n  kind: lab\n---\n\n# Формы ответа {#sec-answer-work}\n\n::: {.task-items}\n'+''.join(f'{i}. @exr-{name}\n' for i,name in enumerate(['explain','choose','size','parts','match'],1))+':::\n')
    (root/'index.qmd').write_text('# Примеры руководства\n')
    chapters=['index.qmd','bank/integrity.qmd','bank/answers.qmd','bank/roles.qmd','bank/solutions.qmd','ordinary.qmd']+[f'works/{name}.qmd' for name in ['lab','seminar','practical','test','answers']]
    (root/'_quarto.yml').write_text('project:\n  type: book\n  pre-render: _extensions/course-core/entrypoints/pre.ts\n  post-render: _extensions/course-core/entrypoints/post.ts\nbook:\n  title: Проверка примеров руководства\n  chapters: CHAPTERS\ncourse:\n  id: integrity-course\nfilters: [course-core, course-presentation]\nformat: html\nlang: ru\nfail-if-warnings: true\n'.replace('CHAPTERS',json.dumps(chapters)))
    for view in ['student','full']:
        (root/f'_quarto-{view}.yml').write_text(f'project:\n  output-dir: _book-{view}\ncourse:\n  view: {view}\nformat:\n  html:\n    code-tools: {{source: false}}\n    keep-source: false\n')
    def run(arguments):
        result=subprocess.run([quarto,*arguments],cwd=root,env=env,capture_output=True,text=True)
        assert result.returncode==0,' '.join(arguments)+'\n'+result.stdout+result.stderr
    for view in ['student','full']:
        run(['render','--profile',view])
        run(['run','_extensions/course-core/entrypoints/check.ts','.',view])
    time_text='Задачи: обязательные 35 мин; все 75 мин. Теория: 15 мин. Занятие: обязательные 50 мин; все 90 мин.'
    for view in ['student','full']:
        assert time_text in (root/f'_book-{view}/works/seminar.html').read_text()
    student=(root/'_book-student/bank/integrity.html').read_text()
    full=(root/'_book-full/bank/integrity.html').read_text()
    assert 'id="exr-integrity-variant"' not in student
    assert 'id="exr-integrity-variant"' in full
    assert 'id="sol-collision"' not in student and 'id="sol-collision"' in full
    assert 'id="sol-repair"' not in student and 'id="sol-repair"' in full
    assert 'Сначала вычислим исходную сумму' in student
    for name in ['practical','test']:
        html=(root/f'_book-student/works/{name}.html').read_text()
        assert 'assessment-preview' in html
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
    expected={
      'checksum-lab':['exr-collision','exr-repair'],
      'sec-integrity-seminar':['exr-checksum','exr-collision','exr-repair'],
      'integrity-practical':['exr-integrity-variant'],
      'integrity-test':['exr-integrity-variant'],
      'answer-forms':['exr-explain','exr-choose','exr-size','exr-parts','exr-match'],
    }
    for work,ids in expected.items():
        run(['run','_extensions/course-core/entrypoints/export.ts','--book','.',
             '--work',work,'--output',f'_generated/{work}.json'])
        public=json.loads((root/f'_generated/{work}.public.json').read_text())
        teacher=json.loads((root/f'_generated/{work}.json').read_text())
        assert public['schema']=='course-body-package-v1'
        assert [question['id'] for question in public['questions']]==ids
        selected=public['works'][0]
        keys=['integrity-course/'+name for name in ids]
        assert selected['items']==keys
        assert set(selected['assignments'])==set(keys)
        assert all(not any(key in question for key in ['closedKey','solution','gradingNotes'])
                   for question in public['questions'])
        assert all(question['visibility']=='public' for question in public['questions'])
        if work in ['integrity-practical','integrity-test']:
            assert all(question['statementVisibility']=='restricted' for question in public['questions'])
            assert 'Проверяются выбор метода' not in json.dumps(public,ensure_ascii=False)
            assert 'Перед занятием изучите разбор' not in json.dumps(public,ensure_ascii=False)
        if work=='sec-integrity-seminar':
            assert selected['theoryTime']==15
            assert [selected['assignments'][key].get('stage') for key in keys]==['demonstration','classroom','homework']
            assert selected['assignments'][keys[1]]['workMode']=='pair'
            assert selected['assignments'][keys[2]]['requirement']=='optional'
        if work=='answer-forms':
            assert [question['answerType'] for question in public['questions']]==['manual','single-choice','numeric','multipart','matching']
            assert teacher['questions'][1]['closedKey']['correct']==0
            assert teacher['questions'][2]['closedKey']['key']['value']==32
            assert teacher['questions'][0]['gradingNotes']
    seminar=root/'works/seminar.qmd'
    seminar.write_text(seminar.read_text().replace('theory-time: 15','theory-time: 7.5'))
    run(['render','--profile','full'])
    assert 'Задачи: обязательные 35 мин; все 75 мин. Теория: 7.5 мин. Занятие: обязательные 42.5 мин; все 82.5 мин.' in (root/'_book-full/works/seminar.html').read_text()
    run(['render','works/seminar.qmd','--profile','student','--fail-if-warnings=false'])
    assert 'data-course-assessment-time="ready"' not in (root/'_book-student/works/seminar.html').read_text()
    print('PASS literal guide native student/full book, ordinary exercises, both solution forms, all roles, four work scenarios, five answer forms, selected Body exports, four time totals and partial-run omission')
finally:
    shutil.rmtree(root)

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const option = name => process.argv[process.argv.indexOf(name)+1];
const group = process.argv.includes('--demo-group') ? option('--demo-group') : null;
const pins = JSON.parse(fs.readFileSync(path.resolve('tests/ready-assets.json'),'utf8'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
if (process.argv.includes('--asset-file')) {
  assert.ok(group && pins[group], 'Known demo group required');
  assert.equal(digest(fs.readFileSync(option('--asset-file'))), pins[group].archiveSha256, 'Ready asset hash differs from pin: '+group);
  if (process.argv.includes('--archive-only')) {
    console.log('PASS pinned archive SHA-256: '+group);
    process.exit(0);
  }
}
const demoIndex = process.argv.indexOf('--demo-dir');
const demoOnly = demoIndex >= 0;
const site = path.resolve(demoOnly ? process.argv[demoIndex+1] : process.argv.find(a => a.startsWith('--site='))?.slice(7) || '_site');
const docsOnly = process.argv.includes('--documentation-only');
const groups = ['core','composition','qrc','print','prairielearn','moodle','cloud','external'];
assert.ok(fs.existsSync(path.join(site,'index.html')), 'Render documentation first');
if (!demoOnly) {
const search = JSON.parse(fs.readFileSync(path.join(site,'search.json'),'utf8'));
assert.ok(search.some(entry => String(entry.href).startsWith('guide/')), 'Guide missing from central search');
assert.ok(search.some(entry => String(entry.href).startsWith('catalog/')), 'Demo descriptions missing from search');
assert.ok(search.every(entry => !String(entry.href).startsWith('examples/')), 'Demo learning text entered central search');
const documentation = [
  'index', 'guide/index', 'guide/start', 'guide/model', 'guide/profiles',
  'guide/exercises', 'guide/solutions', 'guide/roles', 'guide/assessments',
  'guide/answers', 'guide/windows', 'guide/specifications',
  'guide/composition', 'guide/presentation', 'guide/export', 'extensions/index',
  'extensions/course', 'extensions/publisher', 'extensions/reference-catalog',
  'extensions/print', 'extensions/prairielearn', 'extensions/moodle',
  'extensions/cloud', 'extensions/download', 'reference/index',
  'reference/source', 'reference/diagnostics', 'catalog/index',
];
for (const page of documentation) {
  const html = fs.readFileSync(path.join(site, page+'.html'), 'utf8');
  assert.match(html, /<html[^>]+lang="ru"/, 'Russian document language missing: '+page);
  assert.match(html, /id="quarto-sidebar"/, 'Native sidebar missing: '+page);
  assert.equal([...html.matchAll(/id="quarto-code-tools-source"/g)].length, 1,
    'Expected one native source action: '+page);
  assert.match(html, /id="quarto-embedded-source-code-modal"/,
    'Embedded native source missing: '+page);
  assert.ok(!/data-quarto-source-url=/.test(html), 'Duplicate/repo source action: '+page);
  const sidebar = html.split('id="quarto-sidebar"')[1].split('</nav>')[0];
  const destinations = [...sidebar.matchAll(/href="([^"]+)"/g)].map(match =>
    path.resolve(path.dirname(path.join(site, page+'.html')), match[1]));
  for (const target of documentation.filter(p => p !== 'index')) {
    assert.ok(destinations.includes(path.join(site, target+'.html')),
      'Documentation page unreachable from sidebar: '+target+' from '+page);
  }
  assert.ok(search.some(entry => String(entry.href).split('#')[0] === page+'.html'),
    'Documentation page missing from search: '+page);
}
}
function checkBuild(directory, name) {
  assert.ok(pins[name], 'Ready group pin missing: '+name);
  const expected = pins[name];
  const build = JSON.parse(fs.readFileSync(path.join(directory,'BUILD.json'),'utf8'));
  assert.equal(build.sourceDirty, false, 'Dirty demo producer source: '+name);
  assert.deepEqual(build, expected.build, 'Demo BUILD differs from pinned producer/dependencies: '+name);
  assert.match(build.commit, /^[a-f0-9]{40}$/, 'Demo source revision missing: '+name);
  if (/^[a-f0-9]{40}$/.test(expected.sourceRef || '')) assert.equal(expected.sourceRef, build.commit,
    'Ready source SHA differs from producer commit: '+name);
  assert.ok(Object.keys(build.dependencies || {}).length, 'Pinned demo dependencies missing: '+name);
  const actual = {};
  function hashes(dir) {
    for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const file = path.join(dir,entry.name);
      assert.ok(!entry.isSymbolicLink(), 'Ready demo symlink: '+file);
      if (entry.isDirectory()) hashes(file);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(file);
        actual[path.relative(directory,file).split(path.sep).join('/')] = digest(bytes);
        if (file.endsWith('.html')) {
          const html = bytes.toString('utf8');
          if (/<meta name="generator" content="quarto-/i.test(html)) assert.ok(/<html[^>]+lang="ru"/.test(html), 'Russian ready page language missing: '+file);
          const repository = build.producer || build.sourceRepository;
          const sourceLinks = [...html.matchAll(/href=["'](https:\/\/github\.com\/[^"']+\/(?:blob|tree)\/[^"']+)["']/g)]
            .map(match => new URL(match[1])).filter(url => url.pathname.startsWith('/'+repository+'/'));
          for (const url of sourceLinks) assert.equal(url.pathname.split('/')[4], expected.sourceRef,
            'Ready source URL differs from published producer source ref: '+file);
          assert.ok(!(html.includes('id="quarto-code-tools-source"') && /class="toc-action"[^>]*>[\s\S]*?(?:Показать код|View source)<\/a>/.test(html)),
            'Duplicate native code-tools/source and repo-actions/source: '+file);
        }
      }
    }
  }
  hashes(directory);
  assert.deepEqual(actual, expected.files, 'Ready demo file hashes/composition differ from pin: '+name);
}
if (demoOnly) checkBuild(site, group);
if (!docsOnly && !demoOnly) for (const group of groups) {
  assert.ok(fs.statSync(path.join(site,'examples',group,'index.html')).size > 0, 'Missing '+group+' index');
  checkBuild(path.join(site,'examples',group), group);
  // Ready producer trees are opaque resources: private grader files and source
  // attachments must survive even when no HTML page links to each one.
  function checkCopied(directory) {
    for (const entry of fs.readdirSync(directory,{withFileTypes:true})) {
      const source=path.join(directory,entry.name);
      if (entry.isDirectory()) checkCopied(source);
      else if (entry.isFile()) {
        const target=path.join(site,path.relative(process.cwd(),source));
        assert.ok(fs.existsSync(target), 'Prepared demo file omitted: '+source);
        assert.ok(fs.readFileSync(source).equals(fs.readFileSync(target)), 'Prepared demo file altered: '+source);
      }
    }
  }
  checkCopied(path.resolve('examples',group));
}
if (!demoOnly) for (const name of ['tests','docs','tools','_extensions','_generated','.demo-staging','Taskfile.yml','README.md']) {
  assert.ok(!fs.existsSync(path.join(site,name)), 'Documentation service/source path published: '+name);
}
if (!demoOnly) {
  const taskfile = fs.readFileSync('Taskfile.yml','utf8');
  const catalog = fs.readFileSync('catalog/index.qmd','utf8');
  for (const name of groups) {
    const pin = pins[name];
    assert.ok(taskfile.includes('GROUP: '+name+'\n        URL: '+pin.url), 'Task URL differs from ready pin: '+name);
    const parsed = new URL(pin.url);
    const parts = parsed.pathname.split('/');
    const repository = parts[1]+'/'+parts[2], tag = parts[5];
    assert.equal(pin.build.producer || pin.build.sourceRepository, repository, 'Producer differs from release repository: '+name);
    assert.ok(catalog.includes('https://github.com/'+repository+'/tree/'+tag+'/'+pin.sourcePath), 'Catalog source URL differs from release pin: '+name);
  }
  const requiredAnchors = {
    'guide/exercises': ['bank-opt-in','statement-policy','ordinary-exercise','exercise-binding'],
    'guide/solutions': ['solution-suffix','solution-nested','solution-rules','solution-native-witness'],
    'guide/roles': ['role-contexts','activity-roles','preparation-roles','explanation-roles','result-roles'],
    'guide/assessments': ['scenario-bank','lab-scenario','seminar-scenario','practical-scenario','test-scenario','assessment-time'],
    'guide/answers': ['answer-manual','answer-single-choice','answer-numeric','answer-multipart','answer-matching','answer-support','answer-privacy'],
    'guide/profiles': ['audience-profiles','profile-composition','source-privacy','functional-profiles'],
    'guide/export': ['selected-source-export','body-contract','print-export','moodle-export','prairielearn-export','cloud-model'],
    'guide/windows': ['windows-paths','windows-course-fixes','windows-recover-encode'],
    'guide/specifications': ['guide-status','owner-contracts','contract-evidence'],
  };
  for (const [page, anchors] of Object.entries(requiredAnchors)) {
    const html = fs.readFileSync(path.join(site,page+'.html'),'utf8');
    for (const anchor of anchors) assert.ok(html.includes('id="'+anchor+'"'), 'Guide anchor missing: '+page+'#'+anchor);
  }
}
const files = [];
function walk(dir) { for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
  const p=path.join(dir,entry.name);
  if (entry.isDirectory()) walk(p); else if (p.endsWith('.html')) files.push(p);
} }
walk(site);
let links = 0;
for (const file of files) {
 if (docsOnly && file.startsWith(path.join(site,'examples')+path.sep)) continue;
 const html = fs.readFileSync(file,'utf8');
 for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
  const raw=match[1].replaceAll('&amp;','&');
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) continue;
  const name=decodeURIComponent(raw.split(/[?#]/)[0]); if (!name) continue;
  if (docsOnly && /(?:^|\/)examples\//.test(name)) continue;
  const target=name.startsWith('/') ? path.join(site,name) : path.resolve(path.dirname(file),name);
  assert.ok(fs.existsSync(target), 'Broken local resource in '+path.relative(site,file)+': '+raw);links++;
 }
}
console.log(`PASS documentation search and ${links} local links (${files.length} HTML pages)`);

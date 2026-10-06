const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
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
}
function checkBuild(directory) {
  const build = JSON.parse(fs.readFileSync(path.join(directory,'BUILD.json'),'utf8'));
  assert.match(build.commit, /^[a-f0-9]{40}$/, 'Demo source revision missing');
  assert.ok(Object.keys(build.dependencies || {}).length, 'Pinned demo dependencies missing');
}
if (demoOnly) checkBuild(site);
if (!docsOnly && !demoOnly) for (const group of groups) {
  assert.ok(fs.statSync(path.join(site,'examples',group,'index.html')).size > 0, 'Missing '+group+' index');
  checkBuild(path.join(site,'examples',group));
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

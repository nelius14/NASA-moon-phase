// Run: npm run compat
// The display is an iPad mini 2 on iOS 12.5 (Safari 12), which gets no more updates.
// This fails if the page uses CSS or JS that Safari 12 does not support.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'compat-'));
fs.writeFileSync(path.join(dir, 'page.css'), css);
fs.writeFileSync(path.join(dir, 'page.js'), js);

let failed = false;
const fail = msg => { console.error('FAIL', msg); failed = true; };

// Features Safari 12 lacks that the CSS checker can miss or only half-flag.
const banned = [
  [/(^|[^-\w])gap\s*:/, 'flexbox gap (Safari 14.1+); use margins or grid-gap'],
  [/\bclamp\(/, 'clamp() (Safari 13.1+)'],
  [/\binset\s*:/, 'inset shorthand (Safari 14.1+)'],
  [/aspect-ratio\s*:/, 'aspect-ratio (Safari 15+)'],
  [/scroll-behavior\s*:/, 'scroll-behavior (Safari 15.4+)'],
  [/:is\(|:where\(/, ':is()/:where() (Safari 14+)'],
];
for (const [re, why] of banned) if (re.test(css)) fail('CSS uses ' + why);

const bannedJs = [
  [/\?\.|\?\?/, 'optional chaining / nullish coalescing (Safari 13.1+)'],
  [/IntersectionObserver|ResizeObserver/, 'observer APIs'],
  [/\.replaceAll\(|\.at\(/, 'newer String/Array methods'],
];
for (const [re, why] of bannedJs) if (re.test(js)) fail('JS uses ' + why);

const run = (args) => spawnSync('npx', ['--yes', ...args], { cwd: dir, encoding: 'utf8' });
const d = run(['doiuse', '--browsers', 'ios_saf 12.2-12.5', 'page.css']);
const lines = (d.stdout + d.stderr).split('\n').filter(l => l.includes('not supported by'));
// dvh has a vh fallback on the line before it, so it is fine.
for (const l of lines) if (!l.includes('viewport-unit-variants')) fail(l);

const e = run(['es-check@7', 'es2017', 'page.js']);
if (e.status !== 0) fail('JS is newer than ES2017:\n' + e.stdout + e.stderr);

if (failed) process.exit(1);
console.log('ok   page is compatible with iOS 12 Safari');

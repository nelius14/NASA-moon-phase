// Finds NASA's next "Moon Phase and Libration" hourly frames and, with --write, switches the page to them.
//
//   node scripts/update-frames.js                 look for the next year's set and check its frames exist
//   node scripts/update-frames.js --write         ...and edit index.html (then run the tests)
//   node scripts/update-frames.js --year 2025     look for a specific year (for testing)
//   node scripts/update-frames.js --file copy.html --write
//
// Run monthly by .github/workflows/nasa-frames.yml, which opens a pull request when it finds a new set.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = n => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : null);
const file = opt('--file') || path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');

const current = +html.match(/const FRAME_YEAR\s*=\s*(\d+);/)[1];
const thisYear = new Date().getUTCFullYear();
const target = opt('--year') ? +opt('--year') : current + 1;

function out(key, value) {
  console.log(key + '=' + value);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, key + '=' + value + '\n');
}

async function head(url) {
  const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  return r.status;
}

(async () => {
  if (!opt('--year') && target > thisYear + 1) {
    console.log('The page already has frames for ' + current + '; nothing to do until ' + (thisYear) + ' is nearly over.');
    return out('changed', 'false');
  }

  // 1. Is the set published?
  let results = [], url = 'https://svs.gsfc.nasa.gov/api/search/?search=Moon+Phase+and+Libration&limit=100';
  while (url && results.length < 400) {
    const r = await fetch(url.replace('http://', 'https://'));
    if (!r.ok) throw new Error('SVS search failed: HTTP ' + r.status);
    const j = await r.json();
    results = results.concat(j.results);
    url = j.next;
  }
  const hit = results.find(r => r.title === 'Moon Phase and Libration, ' + target);
  if (!hit) {
    console.log("NASA has not published 'Moon Phase and Libration, " + target + "' yet.");
    return out('changed', 'false');
  }

  // 2. Where are its frames, and are they all there?
  const id = hit.id;
  const group = String(Math.floor(id / 100) * 100).padStart(6, '0');
  const base = 'https://svs.gsfc.nasa.gov/vis/a000000/a' + group + '/a' + String(id).padStart(6, '0') + '/frames/730x730_1x1_30p/';
  const days = (Date.UTC(target + 1, 0, 1) - Date.UTC(target, 0, 1)) / 86400000;
  const frames = days * 24;
  const name = n => 'moon.' + String(n).padStart(4, '0') + '.jpg';
  const [first, last, past] = await Promise.all([head(base + name(1)), head(base + name(frames)), head(base + name(frames + 1))]);
  if (first !== 200 || last !== 200 || past === 200) {
    console.log('Found SVS ' + id + ' but its frames do not look complete (first ' + first + ', last ' + last + ', one past the end ' + past + ').');
    return out('changed', 'false');
  }
  console.log('Found SVS ' + id + ': ' + frames + ' hourly frames for ' + target + ' at ' + base);
  out('year', target);
  out('svs', id);

  if (!flag('--write')) return out('changed', 'false');

  // 3. Point the page at them
  const jd = Date.UTC(target, 0, 1) / 86400000 + 2440587.5;
  const swap = (re, replacement) => {
    if (!re.test(html)) throw new Error('Could not find ' + re + ' in index.html');
    html = html.replace(re, replacement);
  };
  swap(/\/\/ SVS-\d+: \d+ frames, one per UTC hour of \d+\. Frame 1 = Jan 1, \d+ 00:00 UTC\./,
       '// SVS-' + id + ': ' + frames + ' frames, one per UTC hour of ' + target + '. Frame 1 = Jan 1, ' + target + ' 00:00 UTC.');
  swap(/const FRAME_YEAR(\s*)= \d+;/, 'const FRAME_YEAR$1= ' + target + ';');
  swap(/const JD_JAN1(\s*)= [\d.]+; \/\/ [^\n]*/, 'const JD_JAN1$1= ' + jd + '; // ' + target + '-01-01 00:00 UTC');
  swap(/const FRAMES_IN_YEAR = \d+;/, 'const FRAMES_IN_YEAR = ' + frames + ';');
  swap(/const BASE = '[^']*';/, "const BASE = '" + base + "';");
  swap(/During \d{4} we show/, 'During ' + target + ' we show');
  swap(/Outside \d{4} we show the \d{4} hour/, 'Outside ' + target + ' we show the ' + target + ' hour');
  swap(/Moon Phase and Libration 20\d\d \(Lunar/, 'Moon Phase and Libration ' + target + ' (Lunar');
  fs.writeFileSync(file, html);
  console.log('Updated ' + file);
  if (file === path.join(__dirname, '..', 'index.html')) spawnSync('node', [path.join(__dirname, 'stamp.js')], { stdio: 'inherit' });
  out('changed', 'true');
})().catch(e => { console.error(e); process.exit(1); });

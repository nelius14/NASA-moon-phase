// Run: npm run stamp   (npm test fails if you forget)
// Writes a short build id into index.html and version.json. The page checks version.json every
// 30 minutes and reloads itself when the id changes, so a tablet picks up new code without a touch.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const META = /<meta name="build" content="[^"]*">/;

function buildId(html) {
  const h = crypto.createHash('sha1');
  h.update(html.replace(META, '<meta name="build" content="">'));
  const imgDir = path.join(root, 'img');
  for (const f of fs.readdirSync(imgDir).sort()) h.update(f).update(fs.readFileSync(path.join(imgDir, f)));
  return h.digest('hex').slice(0, 10);
}

const html = fs.readFileSync(htmlPath, 'utf8');
if (!META.test(html)) { console.error('index.html has no <meta name="build"> tag'); process.exit(1); }
const id = buildId(html);
const current = html.match(META)[0].match(/content="([^"]*)"/)[1];
let versionFile = '';
try { versionFile = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).build; } catch (e) {}

if (process.argv.includes('--check')) {
  if (current !== id || versionFile !== id) {
    console.error('FAIL build id is stale (page ' + current + ', version.json ' + versionFile + ', expected ' + id + '). Run: npm run stamp');
    process.exit(1);
  }
  console.log('ok   build id', id);
} else {
  fs.writeFileSync(htmlPath, html.replace(META, '<meta name="build" content="' + id + '">'));
  fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ build: id }) + '\n');
  console.log('stamped', id);
}

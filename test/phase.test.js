// Run: node test/phase.test.js
// Checks the lunar maths in index.html against published new/full moon times.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// ── Clock')[0];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(script + ';this.api={elongation,toJD,moonData,phaseName,frameUrl}', ctx);
const { elongation, toJD, moonData, phaseName, frameUrl } = ctx.api;

// [label, UTC time, expected elongation in degrees]
const events = [
  ['new moon 2024-04-08',  '2024-04-08T18:21:00Z', 0],
  ['full moon 2024-04-23', '2024-04-23T23:49:00Z', 180],
  ['new moon 2026-11-09',  '2026-11-09T07:02:00Z', 0],
  ['full moon 2026-11-24', '2026-11-24T14:53:00Z', 180],
];
const TOLERANCE_DEG = 0.5; // about 1 hour of phase

for (const [label, iso, want] of events) {
  const got = elongation(toJD(Date.parse(iso)));
  const err = ((got - want + 540) % 360) - 180;
  assert(Math.abs(err) < TOLERANCE_DEG, `${label}: off by ${err.toFixed(2)} deg`);
  console.log('ok  ', label, `(${err.toFixed(2)} deg)`);
}

assert.strictEqual(phaseName(moonData(new Date('2026-11-24T14:53:00Z')).phase), 'Full Moon');
assert.strictEqual(phaseName(moonData(new Date('2026-11-09T07:02:00Z')).phase), 'New Moon');
console.log('ok   phase names');

// frame lookup returns a valid 2024 frame whose own phase is close to the request
const frame = frameUrl(0.5);
const n = Number(frame.match(/moon\.(\d{4})\.jpg$/)[1]);
assert(n >= 1 && n <= 8784, 'frame out of range');
const frameElong = elongation(2460310.5 + (n - 1) / 24);
assert(Math.abs(frameElong - 180) < 0.5, `frame ${n} elongation ${frameElong}`);
console.log('ok   frame lookup (frame', n + ')');

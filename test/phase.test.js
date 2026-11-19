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
vm.runInContext(script + ';this.api={elongation,toJD,moonData,phaseName,frameUrl,nextPhaseEvent}', ctx);
const { elongation, toJD, moonData, phaseName, frameUrl, nextPhaseEvent } = ctx.api;

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

// frame lookup
vm.runInContext(';this.frames={frameNumber,JD_JAN1}', ctx);
const { frameNumber, JD_JAN1 } = ctx.frames;

// inside 2026: exact UTC hour, frame 1 = Jan 1 00:00
assert.strictEqual(frameNumber(new Date('2026-01-01T00:10:00Z')), 1);
assert.strictEqual(frameNumber(new Date('2026-01-03T10:00:00Z')), 59);
assert.strictEqual(frameNumber(new Date('2026-12-31T23:30:00Z')), 8760);
assert(/moon\.0059\.jpg$/.test(frameUrl(new Date('2026-01-03T10:00:00Z'))));
console.log('ok   2026 frame numbers');

// outside 2026: nearest-phase frame, within half an hour of phase
for (const iso of ['2027-03-14T12:00:00Z', '2025-07-01T03:00:00Z']) {
  const d = new Date(iso);
  const n = frameNumber(d);
  assert(n >= 1 && n <= 8760, 'frame out of range');
  const diff = Math.abs(((elongation(JD_JAN1 + (n - 1) / 24) - elongation(toJD(d)) + 540) % 360) - 180);
  assert(diff < 0.5, `${iso}: frame ${n} off by ${diff.toFixed(2)} deg`);
}
console.log('ok   fallback frame matching');

// next full / new moon
const hoursOff = (a, iso) => Math.abs(a - new Date(iso)) / 3600000;
const nf = nextPhaseEvent(new Date('2026-11-19T18:00:00Z'), 180);
const nn = nextPhaseEvent(new Date('2026-11-01T00:00:00Z'), 0);
assert(hoursOff(nf, '2026-11-24T14:53:00Z') < 1, `next full: ${nf.toISOString()}`);
assert(hoursOff(nn, '2026-11-09T07:02:00Z') < 1, `next new: ${nn.toISOString()}`);
// asking again just after an event must return the following one, about a month on
const after = nextPhaseEvent(new Date(nf.getTime() + 3600000), 180);
const gapDays = (after - nf) / 86400000;
assert(gapDays > 28.5 && gapDays < 30.5, `gap ${gapDays}`);
console.log('ok   next full/new moon', nf.toISOString(), nn.toISOString());

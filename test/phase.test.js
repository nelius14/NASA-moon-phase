// Run: node test/phase.test.js
// Checks the lunar maths in index.html against published new/full moon times.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// ── UI')[0];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(script + ';this.api={elongation,toJD,moonData,phaseName,frameUrl,nextPhaseEvent,moonDistance,nextDistanceExtreme,lunation,distanceExtremes,planetPosition,planetSky,skyKind,PLANETS}', ctx);
const { elongation, toJD, moonData, phaseName, frameUrl, nextPhaseEvent, moonDistance, nextDistanceExtreme, lunation, distanceExtremes, planetPosition, planetSky, skyKind, PLANETS } = ctx.api;

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

// Distance. Reference values are NASA/JPL Horizons (DE441), geocentric, retrieved 2026-11-19.
const jdOf = iso => toJD(Date.parse(iso));
assert(Math.abs(moonDistance(jdOf('2026-11-19T18:00:00Z')) - 385490) < 150, 'distance now');
const peri = nextDistanceExtreme(new Date('2026-12-01T00:00:00Z'), true);
const apo  = nextDistanceExtreme(new Date('2026-11-01T00:00:00Z'), false);
assert(hoursOff(peri.date, '2026-12-24T09:00:00Z') < 3, `perigee ${peri.date.toISOString()}`);
assert(Math.abs(peri.km - 356648) < 150, `perigee km ${peri.km}`);
assert(hoursOff(apo.date, '2026-11-13T18:00:00Z') < 3, `apogee ${apo.date.toISOString()}`);
assert(Math.abs(apo.km - 405650) < 150, `apogee km ${apo.km}`);
console.log('ok   distance, perigee', peri.date.toISOString(), Math.round(peri.km), 'km');

// lunation brackets "now" and lasts 29.2 to 29.9 days
const ln = lunation(new Date('2026-11-19T18:00:00Z'));
assert(ln.start <= new Date('2026-11-19T18:00:00Z') && ln.end > new Date('2026-11-19T18:00:00Z'));
const lenDays = (ln.end - ln.start) / 86400000;
assert(lenDays > 29.2 && lenDays < 29.9, `lunation ${lenDays}`);
console.log('ok   lunation', ln.start.toISOString(), '->', ln.end.toISOString());

// Planets. Reference values are NASA/JPL Horizons (DE441), heliocentric ecliptic, 2026-11-19 19:00 UT.
const HORIZONS = {"Mercury": {"x": -0.2302, "y": 0.2373, "z": 0.0405, "e": -19.556, "delta": 0.97}, "Venus": {"x": 0.2094, "y": 0.6897, "z": -0.0026, "e": -33.951, "delta": 0.3562}, "Earth": {"x": 0.537, "y": 0.8296, "z": -0.0001}, "Mars": {"x": -0.5323, "y": 1.5225, "z": 0.045, "e": -90.028, "delta": 1.2748}, "Jupiter": {"x": -3.7693, "y": 3.7577, "z": 0.0687, "e": -91.298, "delta": 5.2078}, "Saturn": {"x": 9.1876, "y": 2.038, "z": -0.4012, "e": 130.819, "delta": 8.7439}, "Uranus": {"x": 8.7546, "y": 17.3484, "z": -0.0491, "e": -173.526, "delta": 18.45}, "Neptune": {"x": 29.8286, "y": 1.5371, "z": -0.719, "e": 124.291, "delta": 29.3091}, "Pluto": {"x": 20.0975, "y": -29.317, "z": -2.6756, "e": 65.962, "delta": 36.0359}};
const jdPl = toJD(Date.UTC(2026, 10, 19, 19, 0));
for (const n of PLANETS) {
  const p = planetPosition(n, jdPl), h = HORIZONS[n];
  const err = Math.hypot(p[0] - h.x, p[1] - h.y, p[2] - h.z);
  assert(err < 0.02, `${n} position off by ${err.toFixed(4)} AU`);
  if (n !== 'Earth') {
    const s = planetSky(n, jdPl);
    assert(Math.abs(s.e - h.e) < 0.3, `${n} elongation ${s.e.toFixed(2)} vs ${h.e}`);
    assert(Math.abs(s.delta - h.delta) < 0.02, `${n} distance from Earth ${s.delta} vs ${h.delta}`);
  }
}
console.log('ok   planet positions and elongations match Horizons');
assert.strictEqual(skyKind('Venus', -34).kind, 'dawn');
assert.strictEqual(skyKind('Saturn', 131).kind, 'dusk');
assert.strictEqual(skyKind('Mercury', -20).kind, 'glare');
assert.strictEqual(skyKind('Uranus', -174).kind, 'night');
assert.strictEqual(skyKind('Pluto', 66).kind, 'tele');
console.log('ok   sky pills');

// distance extremes in a window: one closest and one farthest inside four weeks
const ext = distanceExtremes(jdPl - 14.5, jdPl + 14.5);
assert(ext.some(e => e.closest) && ext.some(e => !e.closest), 'window should hold a perigee and an apogee');
console.log('ok   distance extremes', ext.map(e => (e.closest ? 'perigee ' : 'apogee ') + e.date.toISOString().slice(0, 10)).join(', '));

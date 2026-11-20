// Run: node test/phase.test.js
// Checks the lunar maths in index.html against published new/full moon times.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(process.env.INDEX_HTML || path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// ── UI')[0];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(script + ';this.api={elongation,toJD,moonData,phaseName,frameUrl,nextPhaseEvent,moonDistance,nextDistanceExtreme,lunation,distanceExtremes,planetPosition,planetSky,skyKind,PLANETS,nextRiseSet,topocentricMoonSun,londonSolarEclipse,lunarEclipseFromLondon,nextEclipses,eclipseGreatest,ECLIPSES,moonIconShape}', ctx);
const { elongation, toJD, moonData, phaseName, frameUrl, nextPhaseEvent, moonDistance, nextDistanceExtreme, lunation, distanceExtremes, planetPosition, planetSky, skyKind, PLANETS, nextRiseSet, topocentricMoonSun, londonSolarEclipse, lunarEclipseFromLondon, nextEclipses, eclipseGreatest, ECLIPSES, moonIconShape } = ctx.api;

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

// frame lookup: driven by the constants in index.html, so a new year's frames need no test edits
vm.runInContext(';this.frames={frameNumber,JD_JAN1,FRAME_YEAR,FRAMES_IN_YEAR,BASE}', ctx);
const { frameNumber, JD_JAN1, FRAME_YEAR, FRAMES_IN_YEAR, BASE } = ctx.frames;
const hoursInYear = (Date.UTC(FRAME_YEAR + 1, 0, 1) - Date.UTC(FRAME_YEAR, 0, 1)) / 3600000;
assert.strictEqual(FRAMES_IN_YEAR, hoursInYear, 'frame count should be one per hour of the year');
assert(Math.abs(JD_JAN1 - toJD(Date.UTC(FRAME_YEAR, 0, 1))) < 1e-9, 'JD_JAN1 should be 1 January 00:00 UTC');

// inside the frame year: exact UTC hour, frame 1 = 1 January 00:00
assert.strictEqual(frameNumber(new Date(Date.UTC(FRAME_YEAR, 0, 1, 0, 10))), 1);
assert.strictEqual(frameNumber(new Date(Date.UTC(FRAME_YEAR, 0, 3, 10, 0))), 59);
assert.strictEqual(frameNumber(new Date(Date.UTC(FRAME_YEAR, 11, 31, 23, 30))), FRAMES_IN_YEAR);
assert(/moon\.0059\.jpg$/.test(frameUrl(new Date(Date.UTC(FRAME_YEAR, 0, 3, 10, 0)))));
assert(BASE.startsWith('https://svs.gsfc.nasa.gov/vis/'));
console.log('ok   frame numbers for', FRAME_YEAR);

// outside the frame year: nearest-phase frame, within half a degree of phase
for (const d of [new Date(Date.UTC(FRAME_YEAR + 1, 2, 14, 12)), new Date(Date.UTC(FRAME_YEAR - 1, 6, 1, 3))]) {
  const n = frameNumber(d);
  assert(n >= 1 && n <= FRAMES_IN_YEAR, 'frame out of range');
  const diff = Math.abs(((elongation(JD_JAN1 + (n - 1) / 24) - elongation(toJD(d)) + 540) % 360) - 180);
  assert(diff < 0.5, `${d.toISOString()}: frame ${n} off by ${diff.toFixed(2)} deg`);
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

// Rise and set over London (51.51 N, 0.13 W). Reference times are NASA/JPL Horizons, UT.
const RTS = {"2026-11-19T12:00:00Z": {"Sun": [["2026-11-19T16:08:00Z", "s"], ["2026-11-20T07:26:00Z", "r"], ["2026-11-20T16:06:00Z", "s"]], "Moon": [["2026-11-19T13:38:00Z", "r"], ["2026-11-20T02:01:00Z", "s"], ["2026-11-20T13:50:00Z", "r"]], "Mercury": [["2026-11-19T15:35:00Z", "s"], ["2026-11-20T05:29:00Z", "r"], ["2026-11-20T15:33:00Z", "s"]], "Venus": [["2026-11-19T14:49:00Z", "s"], ["2026-11-20T04:15:00Z", "r"], ["2026-11-20T14:46:00Z", "s"]], "Mars": [["2026-11-19T13:27:00Z", "s"], ["2026-11-19T22:47:00Z", "r"], ["2026-11-20T13:24:00Z", "s"]], "Jupiter": [["2026-11-19T13:17:00Z", "s"], ["2026-11-19T22:45:00Z", "r"], ["2026-11-20T13:13:00Z", "s"]], "Saturn": [["2026-11-19T14:32:00Z", "r"], ["2026-11-20T02:48:00Z", "s"], ["2026-11-20T14:28:00Z", "r"]], "Uranus": [["2026-11-19T16:14:00Z", "r"], ["2026-11-20T08:11:00Z", "s"], ["2026-11-20T16:10:00Z", "r"]], "Neptune": [["2026-11-19T14:14:00Z", "r"], ["2026-11-20T02:15:00Z", "s"], ["2026-11-20T14:10:00Z", "r"]], "Pluto": [["2026-11-19T12:41:00Z", "r"], ["2026-11-19T20:25:00Z", "s"], ["2026-11-20T12:37:00Z", "r"]]}, "2026-06-21T12:00:00Z": {"Sun": [["2026-06-21T20:23:00Z", "s"], ["2026-06-22T03:43:00Z", "r"]], "Moon": [["2026-06-21T23:47:00Z", "s"], ["2026-06-22T12:55:00Z", "r"]], "Mercury": [["2026-06-21T21:46:00Z", "s"], ["2026-06-22T05:42:00Z", "r"]], "Venus": [["2026-06-21T22:44:00Z", "s"], ["2026-06-22T07:00:00Z", "r"]], "Mars": [["2026-06-21T17:17:00Z", "s"], ["2026-06-22T01:46:00Z", "r"], ["2026-06-22T17:18:00Z", "s"]], "Jupiter": [["2026-06-21T22:03:00Z", "s"], ["2026-06-22T06:01:00Z", "r"]], "Saturn": [["2026-06-21T13:17:00Z", "s"], ["2026-06-22T00:33:00Z", "r"], ["2026-06-22T13:13:00Z", "s"]], "Uranus": [["2026-06-21T18:05:00Z", "s"], ["2026-06-22T02:06:00Z", "r"]], "Neptune": [["2026-06-21T12:27:00Z", "s"], ["2026-06-22T00:11:00Z", "r"], ["2026-06-22T12:23:00Z", "s"]], "Pluto": [["2026-06-21T22:38:00Z", "r"], ["2026-06-22T06:29:00Z", "s"]]}};
let worstMin = 0;
for (const [from, bodies] of Object.entries(RTS)) {
  for (const [name, events] of Object.entries(bodies)) {
    const got = nextRiseSet(name, new Date(from));
    const wantRise = events.find(e => e[1] === 'r'), wantSet = events.find(e => e[1] === 's');
    for (const [kind, g, w] of [['rise', got.rise, wantRise], ['set', got.set, wantSet]]) {
      if (!w) continue;
      assert(g, `${name} ${kind} missing after ${from}`);
      const off = Math.abs(g - new Date(w[0])) / 60000;
      worstMin = Math.max(worstMin, off);
      assert(off < 4, `${name} ${kind} off by ${off.toFixed(1)} min on ${from}`);
    }
  }
}
console.log('ok   rise and set times within', worstMin.toFixed(1), 'min of Horizons for the Sun, Moon and all planets');

// Eclipses. The London sky is checked against the partial solar eclipse of 20 March 2015, where
// NASA/JPL Horizons gives the Sun and Moon 5.01 arcminutes apart at 09:31 UT, Sun 28.61 degrees up.
const p15 = topocentricMoonSun(toJD(Date.UTC(2015, 2, 20, 9, 31)));
assert(Math.abs(p15.sepArcmin - 5.01) < 0.3, `separation ${p15.sepArcmin}`);
assert(Math.abs(p15.sunAltDeg - 28.61) < 0.1, `sun altitude ${p15.sunAltDeg}`);
const l15 = londonSolarEclipse(new Date(Date.UTC(2015, 2, 20, 9, 46)));
assert(l15.cover > 0.82 && l15.cover < 0.88, `cover ${l15.cover}`);
assert(Math.abs(l15.when - Date.UTC(2015, 2, 20, 9, 32)) < 6 * 60000, `peak ${l15.when.toISOString()}`);
console.log('ok   London sees', Math.round(l15.cover * 100) + '% of the Sun on 20 March 2015, as NASA/JPL puts the Moon 5.0 arcmin from its centre');

// Catalogue sanity: in date order, and the next ones are the known 2027 pair
const next = nextEclipses(new Date('2026-11-19T20:00:00Z'), 3);
assert.strictEqual(next[0][1], '2027-02-06');
assert.strictEqual(next[2][1], '2027-07-18');
for (let i = 1; i < ECLIPSES.length; i++) assert(eclipseGreatest(ECLIPSES[i]) >= eclipseGreatest(ECLIPSES[i - 1]), 'eclipses out of order');
assert.strictEqual(lunarEclipseFromLondon(['L', '2026-03-03', '11:34:52', 'Total', '1.151', '03h27m 00h58m', '']), 'none');
console.log('ok   eclipse table in order,', ECLIPSES.length, 'eclipses to', ECLIPSES[ECLIPSES.length - 1][1]);

// Icon shape: waxing lights the right, waning the left, and the lit share follows the elongation
const quarter = moonIconShape(90), crescent = moonIconShape(45), gibbous = moonIconShape(135), waning = moonIconShape(270);
assert(quarter.waxing && Math.abs(quarter.lit - 0.5) < 1e-9 && Math.abs(quarter.terminator) < 1e-9, 'first quarter is half lit, straight edge');
assert(crescent.waxing && crescent.lit < 0.25 && crescent.terminator > 0, 'waxing crescent curves toward the lit limb');
assert(gibbous.waxing && gibbous.lit > 0.75 && gibbous.terminator < 0, 'waxing gibbous curves away from it');
assert(!waning.waxing && Math.abs(waning.lit - 0.5) < 1e-9, 'last quarter lights the left half');
assert(moonIconShape(0).lit < 1e-9 && moonIconShape(180).lit > 1 - 1e-9, 'new is dark, full is lit');
console.log('ok   moon icon shapes');

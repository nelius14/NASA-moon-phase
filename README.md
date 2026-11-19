# NASA-moon-phase

An always-on display for an old iPad (Safari 12): the Moon today, and the solar system around it. Everything is calculated in the page. There is no server and no data feed.

## What's on it
1. **The Moon.** NASA's photo for the current hour, phase name, age in the cycle, a fading cycle line, a fading four-week distance curve, and the next full and new moon.
2. **The solar system today.** All nine worlds in one tilted view, a ribbon of where each one sits relative to the Sun in our sky, and a row of morning/evening pills.
3. **How big is it, really?** True-scale distance and size, so you can see what the other pages squeeze.
4. **The Moon in detail.** Next quarters, closest and farthest points, apparent width.

Swipe up to move between sections. After two quiet minutes it glides back to the top.

## Run
No build step. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8080
```

## How it works
- **Moon and Sun:** ecliptic longitudes from Meeus, *Astronomical Algorithms* (truncated series). Phases match published new and full moon times to under 0.1 hour.
- **Moon distance:** Meeus ch. 47. Within about 55 km of NASA/JPL Horizons.
- **Planets and Pluto:** NASA/JPL "Approximate Positions of the Planets" (valid 1800 to 2050). Within 0.1° of Horizons.
- **Moon photo:** NASA SVS Moon Phase and Libration 2026 (hourly frames). Outside 2026 the page shows the 2026 hour whose true phase matches best. When NASA publishes the next year's set, update the frame constants in `index.html` (`FRAME_YEAR`, `JD_JAN1`, `FRAMES_IN_YEAR`, `BASE`).
- **Planet photos:** NASA missions via Wikimedia Commons, in `img/`.
- **Refresh:** every minute; the planets every five.

## Keeping the tablet up to date
`version.json` holds a build id that is also written into `index.html`. The page checks it every 30 minutes and reloads itself when it changes. It also reloads at 04:00 to start fresh. After any change, run:

```bash
npm run stamp
```

## Checks
```bash
npm test
npm run compat
```

`npm test` checks the maths against known new and full moons and against Horizons (distance, planet positions, elongations), and that the build id is current. `npm run compat` fails if the page uses CSS or JavaScript that iOS 12 Safari cannot handle (no flexbox `gap`, `clamp()`, `inset`, optional chaining and so on).

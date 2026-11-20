# NASA-moon-phase

An always-on display for an old iPad (Safari 12): the Moon today, and the solar system around it. Everything is calculated in the page. There is no server and no data feed.

## What's on it
1. **The Moon.** NASA's photo for the current hour, phase name, age in the cycle, a fading cycle line, a fading four-week distance curve, and the next full and new moon.
2. **The solar system today.** All nine worlds in one tilted view, a ribbon of where each one sits relative to the Sun in our sky, and a row of morning/evening pills.
3. **How big is it, really?** True-scale distance and size, so you can see what the other pages squeeze.
4. **The Moon in detail.** Next quarters, closest and farthest points, apparent width, and sunrise, sunset, moonrise and moonset for London.
5. **Eclipses.** The next four from NASA's catalogue, with what London sees, and the credits.

There are five pages, each exactly one screen tall (the page measures the visible height itself, because iOS counts the toolbars). When you stop scrolling it glides to the nearest page; dots on the right edge show where you are and can be tapped. If the content is taller than the screen, as in Brave with its toolbars, it is scaled down to fit. After two quiet minutes it glides back to page one (add `?idle=3` to the address to make that three seconds, for testing).

## Run
No build step. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8080
```

## How it works
- **Moon and Sun:** ecliptic longitudes from Meeus, *Astronomical Algorithms* (truncated series). Phases match published new and full moon times to under 0.1 hour.
- **Moon distance:** Meeus ch. 47. Within about 55 km of NASA/JPL Horizons.
- **Planets and Pluto:** NASA/JPL "Approximate Positions of the Planets" (valid 1800 to 2050). Within 0.1° of Horizons.
- **Moon photo:** NASA SVS Moon Phase and Libration (hourly frames for one year at a time). Outside that year the page shows the hour whose true phase matches best. A GitHub Action (`.github/workflows/nasa-frames.yml`) looks every Monday for the next year's set, tests the page with it and opens a pull request; merging that pull request is the whole update. It needs one setting: Settings, Actions, General, 'Allow GitHub Actions to create and approve pull requests' (otherwise it opens an issue instead). To do the same by hand: `node scripts/update-frames.js --write`.
- **Planet photos:** NASA missions via Wikimedia Commons, in `img/`. All nine are public domain.
- **Rise and set times:** calculated for London (51.51° N, 0.13° W). The Sun, Moon and all planets agree with Horizons to within 2 minutes.
- **Eclipses:** dates from NASA/GSFC (Fred Espenak), 2027 to 2040. What London sees is calculated here: lunar eclipses from the Moon's height, solar eclipses from the Sun and Moon's positions as seen from London.
- **Icon:** the browser-tab icon and the home-screen icon are drawn in the page from a NASA full-moon photograph (`img/moon-texture.jpg`), lit by tonight's calculated phase. The tab icon follows the Moon through the day. iOS fixes a home-screen icon when it is added, so that one shows the phase on the day you tapped "Add to Home Screen". `img/icon-180.png` and `img/icon-64.png` (a full moon) are the fallbacks if scripts are blocked.
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

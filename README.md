# NASA-moon-phase

A single-page display of the current moon phase using real NASA photography, built for an always-on tablet or new-tab page.

## What it shows
- Current phase name and illuminated percentage
- Local date and time
- A photo of the Moon at the matching phase, from NASA SVS-5187 (hourly frames covering 2024)

## Run
No build step. Open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8080
```

then open `http://localhost:8080/index.html`.

## How it works
- Phase is computed from the mean synodic month (29.5306 days) against a known new moon (2000-01-06). This can be off by several hours from the true phase.
- The NASA frames only cover 2024, so today's phase is mapped onto the 2024 frame with the same mean-model phase. The photo can therefore differ slightly from the true current Moon (up to about half a day of phase, plus libration).
- On wake from sleep the clock, photo and phase text refresh.

## Credits
Moon imagery: NASA Scientific Visualization Studio, SVS-5187 (public domain). Fonts: Google Fonts.

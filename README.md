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
- Phase is the Moon-minus-Sun ecliptic longitude (Meeus, *Astronomical Algorithms*, truncated series). It matched published new/full moon times to under 0.1 hour in spot checks (2024-04-08, 2024-04-23, 2026-11-09, 2026-11-24).
- The NASA frames only cover 2024, so the page computes the true elongation of each of the 8784 hourly 2024 frames and shows the one closest to now. The photo shows the same real phase as the text. Libration and distance still differ from today's Moon.
- On wake from sleep the clock, photo and phase text refresh.

## Credits
Moon imagery: NASA Scientific Visualization Studio, SVS-5187 (public domain). Fonts: Google Fonts.

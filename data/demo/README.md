# Demo fixtures

This app ships with `FORCE_DEMO: true` in `/config.js`, so **no external asset files
are required** — every demo path (scan photo, AI responses, class roster, attempt
history) is generated in-memory by `assets/js/demo-data.js` and
`assets/js/ai.js` (`OFFLINE_AI_FALLBACKS`).

- The "рентген тетради" demo photo is a hand-drawn SVG data URI baked into
  `assets/js/views/scan.js` (`DEMO_IMAGE`) — it survives with zero network and
  zero file I/O, which is more reliable on stage than a bundled JPEG.
- The demo student's 44 attempts, mastery map, and the seeded root gap
  (`ALG-7-05` под `ALG-9-04`) live in `demo-data.js#buildAttempts` /
  `#buildStudentMastery`.
- The demo class roster (12 students) is in `demo-data.js#buildClassRoster`.

If you'd rather demo against a real photo, drop one here (e.g. `sample-1.jpg`)
and swap it into `scan.js`'s `DEMO_IMAGE` constant as a `data:` URI or a
relative path served by any static host.

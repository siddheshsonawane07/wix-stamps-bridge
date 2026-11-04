# Demo video

A narrated, captioned demo of Ship by File, built in Remotion from the app's real screens with
example data. A local Kokoro voice reads it, so nothing is sent anywhere.

## Making it

1. **Screens.** Start the screen harness, which renders the app's own tabs with example data:
   ```sh
   cd ../app && npx vite --config video-harness/vite.config.mjs
   ```
   Then `npm run capture`. It clicks through the tabs and saves a screenshot per step, plus the
   box of whatever the cursor points at, to `public/demo/shots/`.
2. **Voice.** Edit `src/demo/voiceover.txt` (`id|line as captioned`), then `npm run voice -- demo`.
   `scripts/voice.py` has a `SAY` map for words the voice misreads. It holds "Stamps.com", which
   would otherwise be read as "Stamps", a pause, "com". The voice says "Stamps dot com" while the
   caption keeps "Stamps.com". The model lives in `.tts`, a link to a shared Kokoro setup
   (`kokoro-onnx`, voice `af_heart`, speed 0.95).
3. **Beats.** `src/demo/Demo.tsx` lists one beat per spoken line and what happens on screen while
   it is said (`show`, `move`, `click`, `ring`, `focus`). Zoom on a whole table (about 1.2–1.3),
   never on one button, so nothing gets cut off.
4. **Look.** `npm run studio`, or `npx remotion still src/index.ts demo out/f.png --frame=N`.
5. **Render.** `npm run render -- demo` writes `out/demo.mp4`, levelled to −16 LUFS.

## Notes

- Every app screen says **Example data**. Names and orders are made up.
- The ShipStation mention may not suit an App Market listing video. For the listing, change the
  `a2` line and the options card to say "a shipping platform" without the name.
- Remotion is free for individuals and companies of up to 3 people; check remotion.pro otherwise.
- Fonts: Inter, SIL OFL 1.1 (`public/fonts/INTER-LICENSE.txt`).

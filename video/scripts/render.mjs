// Renders one video to out/<id>.mp4, then evens out the loudness (−16 LUFS, the level for
// spoken video) without touching the picture.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const id = process.argv[2];
if (!id) throw new Error('Name the video: npm run render -- demo');
fs.mkdirSync('out', { recursive: true });
const raw = `out/${id}-raw.mp4`;
execFileSync('npx', ['remotion', 'render', 'src/index.ts', id, raw], { stdio: 'inherit' });
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', `out/${id}.mp4`], { stdio: 'inherit' });
fs.rmSync(raw);
console.log(`out/${id}.mp4`);

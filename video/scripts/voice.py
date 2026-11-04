"""Turns src/<video>/voiceover.txt into public/<video>/vo/<id>.wav with the local Kokoro voice,
and writes each line's text and length to src/<video>/voice.json, so the video's timing and its
captions follow the speech.

Captions show the line as written. The voice is given SAY's spoken form instead, because Kokoro
reads "Stamps.com" as "Stamps", a full stop, "com".

Run: npm run voice -- demo
"""
import json
import pathlib
import re
import sys

import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = pathlib.Path(__file__).resolve().parent.parent
TTS = ROOT / ".tts"  # link to the shared voice model in Graph Hacks' premise-video
VOICE = "af_heart"
SPEED = 0.95

# Written form -> how the voice should say it.
SAY = {
    "Stamps.com": "Stamps dot com",
}


def spoken(text: str) -> str:
    for written, said in SAY.items():
        text = re.sub(re.escape(written), said, text)
    return text


name = sys.argv[1]
kokoro = Kokoro(str(TTS / "model.onnx"), str(TTS / "voices.npz"))
out = ROOT / "public" / name / "vo"
out.mkdir(parents=True, exist_ok=True)
for old in out.glob("*.wav"):
    old.unlink()

lines = {}
for line in (ROOT / "src" / name / "voiceover.txt").read_text().splitlines():
    if not line.strip():
        continue
    clip_id, text = line.split("|", 1)
    samples, rate = kokoro.create(spoken(text), voice=VOICE, speed=SPEED, lang="en-us")
    sf.write(out / f"{clip_id}.wav", samples, rate)
    lines[clip_id] = {"text": text, "seconds": round(len(samples) / rate, 2)}
    print(clip_id, lines[clip_id]["seconds"])

(ROOT / "src" / name / "voice.json").write_text(json.dumps(lines, indent=2) + "\n")

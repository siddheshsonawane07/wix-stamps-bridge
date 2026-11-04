// The video engine: a list of beats (one spoken line each, plus what happens on
// screen while it is said) becomes a timeline of screenshots, a cursor, clicks,
// highlight rings, camera moves, voice clips and captions. Every tutorial uses it;
// what differs is its capture, its voiceover and its beats.
import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { C, SANS } from './brand';

export const FPS = 30;
export const W = 1920;
export const H = 1080;

export type Box = { x: number; y: number; w: number; h: number };
export type Shots = Record<string, { file: string; targets: Record<string, Box> }>;
export type Voice = Record<string, { text: string; seconds: number }>;

/** Times are seconds from the start of the beat's spoken line. A target is "shot.target". */
export type Ev =
  | { at: number; show: string }
  | { at: number; type: string[]; dur: number }
  | { at: number; move: string; dur?: number }
  | { at: number; click: true }
  | { at: number; ring: string; dur: number }
  | { at: number; focus: string | null; zoom?: number; dur?: number };

export type Beat = { id: string; kind: 'card' | 'app'; events?: Ev[]; lead?: number };

type Cam = { cx: number; cy: number; z: number };
export type Timeline = {
  total: number;
  beats: Array<{ id: string; kind: Beat['kind']; start: number; voiceAt: number; end: number }>;
  shows: Array<{ frame: number; file: string; fade: number }>;
  moves: Array<{ frame: number; dur: number; x: number; y: number }>;
  clicks: number[];
  rings: Array<{ start: number; end: number; box: Box }>;
  cams: Array<{ frame: number; dur: number; to: Cam }>;
  captions: Array<{ start: number; end: number; text: string }>;
};

const LEAD = 0.35; // silence before each line
const GAP = 0.45; // after a line, or after its last event, whichever is later
const f = (s: number) => Math.round(s * FPS);

/** Splits a line into caption chunks of about one sentence, timed by length. */
function captionChunks(text: string, start: number, seconds: number) {
  const parts = text.split(/(?<=[.!?])\s+/).flatMap((s) => {
    if (s.length <= 80) return [s];
    const mid = s.lastIndexOf(', ', Math.floor(s.length / 2) + 10);
    return mid > 0 ? [s.slice(0, mid + 1), s.slice(mid + 2)] : [s];
  });
  const total = parts.reduce((a, p) => a + p.length, 0);
  let t = start;
  return parts.map((p) => {
    const len = (p.length / total) * seconds;
    const chunk = { start: f(t), end: f(t + len), text: p };
    t += len;
    return chunk;
  });
}

export function buildTimeline(beats: Beat[], voice: Voice, shots: Shots): Timeline {
  const target = (ref: string): Box => {
    const [shot, name] = ref.split('.');
    const box = shots[shot]?.targets[name];
    if (!box) throw new Error(`No target ${ref} in shots.json`);
    return box;
  };
  const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const fileOf = (id: string) => {
    const s = shots[id];
    if (!s) throw new Error(`No shot ${id} in shots.json`);
    return s.file;
  };

  const tl: Timeline = { total: 0, beats: [], shows: [], moves: [], clicks: [], rings: [], cams: [], captions: [] };
  let t = 0;
  for (const beat of beats) {
    const v = voice[beat.id];
    if (!v) throw new Error(`No voice line ${beat.id}; run npm run voice`);
    const start = t;
    const at = start + (beat.lead ?? LEAD);
    let last = v.seconds;
    for (const e of beat.events ?? []) {
      const s = at + e.at;
      if ('show' in e) {
        tl.shows.push({ frame: f(s), file: fileOf(e.show), fade: 6 });
      } else if ('type' in e) {
        e.type.forEach((id, i) => tl.shows.push({ frame: f(s + (e.dur * i) / e.type.length), file: fileOf(id), fade: 0 }));
        last = Math.max(last, e.at + e.dur);
      } else if ('move' in e) {
        const c = center(target(e.move));
        tl.moves.push({ frame: f(s), dur: f(e.dur ?? 0.6), x: c.x, y: c.y });
        last = Math.max(last, e.at + (e.dur ?? 0.6));
      } else if ('click' in e) {
        tl.clicks.push(f(s));
        last = Math.max(last, e.at + 0.3);
      } else if ('ring' in e) {
        tl.rings.push({ start: f(s), end: f(s + e.dur), box: target(e.ring) });
        last = Math.max(last, e.at + e.dur);
      } else if ('focus' in e) {
        const c = e.focus ? center(target(e.focus)) : { x: W / 2, y: H / 2 };
        tl.cams.push({ frame: f(s), dur: f(e.dur ?? 0.8), to: { cx: c.x, cy: c.y, z: e.zoom ?? (e.focus ? 1.35 : 1) } });
        last = Math.max(last, e.at + (e.dur ?? 0.8));
      }
    }
    tl.captions.push(...captionChunks(v.text, at, v.seconds + 0.2));
    t = at + last + GAP;
    tl.beats.push({ id: beat.id, kind: beat.kind, start: f(start), voiceAt: f(at), end: f(t) });
  }
  tl.total = f(t) + 45; // hold the last card 1.5 s, so the final frame is the poster
  for (const list of [tl.shows, tl.moves, tl.cams] as Array<Array<{ frame: number }>>) list.sort((a, b) => a.frame - b.frame);
  return tl;
}

const ease = Easing.inOut(Easing.cubic);
const progress = (frame: number, start: number, dur: number) =>
  dur <= 0 ? (frame >= start ? 1 : 0) : interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

function camAt(tl: Timeline, frame: number): Cam {
  let cam: Cam = { cx: W / 2, cy: H / 2, z: 1 };
  for (const k of tl.cams) {
    if (frame < k.frame) break;
    const p = progress(frame, k.frame, k.dur);
    cam = { cx: cam.cx + (k.to.cx - cam.cx) * p, cy: cam.cy + (k.to.cy - cam.cy) * p, z: cam.z + (k.to.z - cam.z) * p };
  }
  return cam;
}

function cursorAt(tl: Timeline, frame: number) {
  let pos = { x: 1500, y: 980 };
  for (const m of tl.moves) {
    if (frame < m.frame) break;
    const p = progress(frame, m.frame, m.dur);
    pos = { x: pos.x + (m.x - pos.x) * p, y: pos.y + (m.y - pos.y) * p };
  }
  return pos;
}

/** The app's screenshots, the cursor and the rings, seen through the camera. */
const Screen: React.FC<{ tl: Timeline; scale: number }> = ({ tl, scale }) => {
  const frame = useCurrentFrame();
  const { cx, cy, z } = camAt(tl, frame);
  const vw = W / z;
  const vh = H / z;
  const vx = Math.min(Math.max(cx - vw / 2, 0), W - vw);
  const vy = Math.min(Math.max(cy - vh / 2, 0), H - vh);

  const visible = tl.shows.filter((s) => s.frame <= frame);
  const current = visible[visible.length - 1];
  const previous = visible[visible.length - 2];
  const fadeIn = current ? progress(frame, current.frame, current.fade) : 1;

  const cursor = cursorAt(tl, frame);
  const lastClick = [...tl.clicks].reverse().find((c) => c <= frame);
  const sinceClick = lastClick === undefined ? Infinity : frame - lastClick;
  const press = sinceClick < 6 ? 0.85 : 1;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ width: W, height: H, transformOrigin: '0 0', transform: `scale(${scale * z}) translate(${-vx}px, ${-vy}px)`, position: 'relative' }}>
        {previous && fadeIn < 1 ? <Img src={staticFile(previous.file)} style={{ position: 'absolute', width: W, height: H }} /> : null}
        {current ? <Img src={staticFile(current.file)} style={{ position: 'absolute', width: W, height: H, opacity: fadeIn }} /> : null}

        {tl.rings.map((r, i) => {
          if (frame < r.start || frame > r.end) return null;
          const o = Math.min(progress(frame, r.start, 6), 1 - progress(frame, r.end - 6, 6));
          const pad = 10;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: r.box.x - pad,
                top: r.box.y - pad,
                width: r.box.w + pad * 2,
                height: r.box.h + pad * 2,
                border: `${5 / z}px solid ${C.ring}`,
                borderRadius: 14,
                boxShadow: `0 0 0 ${8 / z}px ${C.ringGlow}`,
                opacity: o,
              }}
            />
          );
        })}

        {sinceClick < 14 ? (
          <div
            style={{
              position: 'absolute',
              left: cursor.x,
              top: cursor.y,
              width: 1,
              height: 1,
              borderRadius: '50%',
              boxShadow: `0 0 0 ${interpolate(sinceClick, [0, 14], [4, 46]) / z}px rgba(17, 109, 255, ${interpolate(sinceClick, [0, 14], [0.55, 0])})`,
            }}
          />
        ) : null}

        <svg
          width={34}
          height={44}
          viewBox="0 0 17 22"
          style={{ position: 'absolute', left: cursor.x - 3 / z, top: cursor.y - 2 / z, transform: `scale(${press / z})`, transformOrigin: '3px 2px' }}
        >
          <path d="M1.5 1.5 L1.5 17.5 L5.6 13.6 L8.4 20.2 L11.2 19 L8.5 12.6 L14.2 12.6 Z" fill={C.ink} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

/** The app in a window, the captions under it, and the voice. */
/**
 * A full-frame card (a title, a diagram) shown over a run of beats. It is told the
 * frame each of its lines starts at, counted from the card's own first frame.
 */
export type Card = { from: string; to: string; C: React.FC<{ at: Record<string, number> }> };

/** `dir` is the tutorial's folder under public/, holding vo/ and shots/. */
export const Tutorial: React.FC<{ tl: Timeline; dir: string; cards: Card[] }> = ({ tl, dir, cards }) => {
  const frame = useCurrentFrame();
  // The window is up for each run of app beats, so a card between two runs is seen.
  const runs: Array<{ start: number; end: number }> = [];
  tl.beats.forEach((b, i) => {
    if (b.kind !== 'app') return;
    if (i > 0 && tl.beats[i - 1].kind === 'app') runs[runs.length - 1].end = b.end;
    else runs.push({ start: b.start, end: b.end });
  });
  const run = runs.find((r) => frame >= r.start && frame < r.end);
  const appStart = run?.start ?? 0;
  const appEnd = run?.end ?? 0;
  const winScale = 0.84;
  const winW = W * winScale;
  const winH = H * winScale;
  const appOpacity = Math.min(progress(frame, appStart, 10), 1 - progress(frame, appEnd - 10, 10));
  const caption = tl.captions.find((c) => frame >= c.start && frame < c.end);

  return (
    <AbsoluteFill style={{ background: C.wash, backgroundColor: C.page, fontFamily: SANS, color: C.ink }}>
      {cards.map(({ from, to, C: Body }) => {
        const first = tl.beats.findIndex((b) => b.id === from);
        const last = tl.beats.findIndex((b) => b.id === to);
        if (first < 0 || last < first) throw new Error(`Card ${from}–${to} names no run of beats`);
        const run = tl.beats.slice(first, last + 1);
        const start = run[0].start;
        const at = Object.fromEntries(run.map((b) => [b.id, b.voiceAt - start]));
        return (
          <Sequence key={from} from={start} durationInFrames={(last === tl.beats.length - 1 ? tl.total : run[run.length - 1].end) - start}>
            <Body at={at} />
          </Sequence>
        );
      })}

      {frame >= appStart && frame < appEnd ? (
        <div
          style={{
            position: 'absolute',
            left: (W - winW) / 2,
            top: 34,
            width: winW,
            height: winH,
            borderRadius: 16,
            overflow: 'hidden',
            background: C.surface,
            boxShadow: '0 1px 2px rgba(17,24,39,0.08), 0 18px 48px rgba(17,24,39,0.14)',
            border: `1px solid ${C.line}`,
            opacity: appOpacity,
          }}
        >
          <Screen tl={tl} scale={winScale} />
        </div>
      ) : null}

      {frame >= appStart && frame < appEnd ? (
        <div style={{ position: 'absolute', right: 40, bottom: 26, fontSize: 20, color: C.ink3, opacity: appOpacity, fontWeight: 600 }}>
          Example data
        </div>
      ) : null}

      {caption ? (
        <div
          style={{
            position: 'absolute',
            left: 260,
            right: 260,
            bottom: 26,
            height: 104,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: 38,
            fontWeight: 600,
            lineHeight: 1.3,
            color: C.ink,
          }}
        >
          {caption.text}
        </div>
      ) : null}

      {tl.beats.map((b) => (
        <Sequence key={`vo-${b.id}`} from={b.voiceAt} layout="none">
          <Audio src={staticFile(`${dir}/vo/${b.id}.wav`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};


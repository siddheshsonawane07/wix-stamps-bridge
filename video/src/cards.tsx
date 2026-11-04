// The cards the video opens and closes on, and the small parts its diagrams are built from.
// Title, steps and diagram parts shared by the video's cards.
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, SANS } from './brand';
import type { Card } from './engine';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0 → 1 on a settled spring, starting at the given frame. */
export const useIn = (start: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 120 } });
};

/** Fades a card in over its first 10 frames and out over its last 12, so cards never pop. */
export const useFade = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame, [0, 10], [0, 1], clamp) * interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clamp);
};

/** Fades a card out over its last 12 frames. */
export const useFadeOut = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clamp);
};

export const Heading: React.FC<{ children: React.ReactNode; t?: number }> = ({ children, t = 1 }) => (
  <div style={{ position: 'absolute', top: 96, width: '100%', textAlign: 'center', fontSize: 58, fontWeight: 700, opacity: t, transform: `translateY(${(1 - t) * 16}px)` }}>
    {children}
  </div>
);

/** A labelled box: the Wix store or Stamps.com. */
export const Place: React.FC<{ x: number; y: number; title: string; sub: string; color: string; bg: string; t?: number }> = ({ x, y, title, sub, color, bg, t = 1 }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 480, height: 300, borderRadius: 24, border: `3px solid ${color}`, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: t, transform: `translateY(${(1 - t) * 20}px)` }}>
    <div style={{ fontSize: 46, fontWeight: 700, color }}>{title}</div>
    <div style={{ fontSize: 26, color: C.ink3, marginTop: 10 }}>{sub}</div>
  </div>
);

/** A file with a folded corner. */
export const FileTag: React.FC<{ x: number; y: number; label: string; t?: number }> = ({ x, y, label, t = 1 }) => (
  <svg width={200} height={116} style={{ position: 'absolute', left: x, top: y, opacity: t, overflow: 'visible' }}>
    <path d="M2 2 H170 L198 30 V114 H2 Z" fill={C.fileBg} stroke={C.file} strokeWidth={3} />
    <path d="M170 2 V30 H198" fill={C.file} />
    <text x={100} y={68} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={28} fill={C.file}>{label}</text>
  </svg>
);

/** A horizontal arrow drawn from x1 to x2; p is how far it has grown. */
export const Arrow: React.FC<{ x1: number; x2: number; y: number; p: number; color?: string }> = ({ x1, x2, y, p, color = C.file }) => {
  const xe = x1 + (x2 - x1) * p;
  const dir = Math.sign(x2 - x1);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <line x1={x1} y1={y} x2={xe} y2={y} stroke={color} strokeWidth={5} strokeLinecap="round" opacity={p > 0 ? 1 : 0} />
      {p > 0.05 ? <path d={`M ${xe} ${y} L ${xe - 22 * dir} ${y - 12} L ${xe - 22 * dir} ${y + 12} Z`} fill={color} /> : null}
    </svg>
  );
};

export const Pill: React.FC<{ children: React.ReactNode; top: number; bg?: string; t?: number }> = ({ children, top, bg = C.accent, t = 1 }) => (
  <div style={{ position: 'absolute', top, width: '100%', display: 'flex', justifyContent: 'center', opacity: t }}>
    <div style={{ background: bg, color: '#fff', fontWeight: 700, fontSize: 32, padding: '16px 34px', borderRadius: 999 }}>{children}</div>
  </div>
);

/** The app's name over what it does. */
export const titleCard = (title: string, sub: string): Card['C'] => () => {
  // Live from frame 0: the first frame is the thumbnail, so nothing fades in from blank.
  const a = 1;
  const b = 1;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 140, fontFamily: SANS, opacity: useFadeOut() }}>
      <div style={{ fontSize: 150, fontWeight: 700, lineHeight: 1, letterSpacing: -3, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>{title}</div>
      <div style={{ fontSize: 44, color: C.ink3, marginTop: 30, fontWeight: 600, opacity: b, transform: `translateY(${(1 - b) * 20}px)` }}>{sub}</div>
    </AbsoluteFill>
  );
};

/** The title again, and the steps as numbered chips. */
export const stepsCard = (title: string, steps: string[], foot: string[]): Card['C'] => () => {
  const head = useIn(2);
  const shown = steps.map((_, i) => useIn(10 + i * 8));
  const end = useIn(10 + steps.length * 8 + 6);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 150, fontFamily: SANS }}>
      <div style={{ fontSize: 120, fontWeight: 700, lineHeight: 1, letterSpacing: -2, opacity: head }}>{title}</div>
      <div style={{ display: 'flex', gap: 22, marginTop: 56 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 28px', background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, opacity: shown[i], transform: `translateY(${(1 - shown[i]) * 20}px)` }}>
            <span style={{ fontSize: 44, fontWeight: 700, color: C.accent, lineHeight: 1 }}>{i + 1}</span>
            <span style={{ fontSize: 30, fontWeight: 600 }}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, color: C.ok, marginTop: 50, opacity: end }}>Free · No subscription · Nothing to host</div>
      <div style={{ position: 'absolute', bottom: 150, width: '100%', textAlign: 'center', fontSize: 22, color: C.ink3, lineHeight: 1.5, opacity: end }}>
        {foot.map((l) => <div key={l}>{l}</div>)}
      </div>
    </AbsoluteFill>
  );
};

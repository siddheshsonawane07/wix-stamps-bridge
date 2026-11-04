// Ship by File: the problem, the options, the idea, then the app's three tabs.
// Captured by capture/capture.mjs; spoken from voiceover.txt.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, SANS } from '../brand';
import { Arrow, clamp, FileTag, Heading, Pill, Place, stepsCard, titleCard, useFade, useIn } from '../cards';
import { type Beat, type Card, type Shots, type Voice, buildTimeline, Tutorial, FPS } from '../engine';
import shotsJson from '../../public/demo/shots/shots.json';
import voiceJson from './voice.json';

const shots = shotsJson as Shots;
const voice = voiceJson as Voice;
const s = (seconds: number) => Math.round(seconds * FPS);

const beats: Beat[] = [
  { id: 'h1', kind: 'card', lead: 0.8 },
  { id: 'x1', kind: 'card' },
  { id: 'x2', kind: 'card' },
  { id: 'g1', kind: 'card' },
  { id: 'a1', kind: 'card' },
  { id: 'a2', kind: 'card' },
  { id: 'a3', kind: 'card' },
  { id: 'a4', kind: 'card' },
  { id: 'i1', kind: 'card' },
  { id: 'i2', kind: 'card' },
  {
    id: 's1',
    kind: 'app',
    lead: 0.7,
    events: [
      { at: -0.7, show: '01-setup' },
      { at: 0.1, move: '01-setup.setupTab', dur: 0.6 },
      { at: 0.2, ring: '01-setup.setupTab', dur: 1.2 },
      { at: 1.6, move: '01-setup.upload', dur: 0.6 },
      { at: 2.3, ring: '01-setup.upload', dur: 1.5 },
      { at: 3.9, click: true },
      { at: 4.0, show: '02-mapped' },
      { at: 4.2, focus: '02-mapped.table', zoom: 1.2, dur: 0.9 },
      { at: 4.5, ring: '02-mapped.headers', dur: 2.8 },
    ],
  },
  {
    id: 's2',
    kind: 'app',
    events: [
      { at: 0.1, move: '02-mapped.matched', dur: 0.6 },
      { at: 0.2, ring: '02-mapped.matched', dur: 3.0 },
      { at: 3.3, show: '03-mapped-end' },
      { at: 3.5, move: '03-mapped-end.noMatch', dur: 0.6 },
      { at: 3.6, ring: '03-mapped-end.noMatch', dur: 2.6 },
    ],
  },
  {
    id: 's3',
    kind: 'app',
    events: [
      { at: -0.2, show: '04-history' },
      { at: 0, focus: '04-history.date', zoom: 1.2, dur: 0.8 },
      { at: 0.2, move: '04-history.date', dur: 0.6 },
      { at: 0.4, ring: '04-history.date', dur: 2.4 },
      { at: 2.9, move: '04-history.saveSettings', dur: 0.5 },
      { at: 3.5, click: true },
    ],
  },
  {
    id: 't1',
    kind: 'app',
    events: [
      { at: -0.2, focus: null, dur: 0.6 },
      { at: 0.1, move: '05-to-ship.toShipTab', dur: 0.6 },
      { at: 0.8, click: true },
      { at: 0.9, show: '05-to-ship' },
      { at: 1.0, focus: '05-to-ship.table', zoom: 1.3, dur: 0.9 },
      { at: 1.3, ring: '05-to-ship.table', dur: 2.6 },
    ],
  },
  {
    id: 't2',
    kind: 'app',
    events: [
      { at: 0, move: '05-to-ship.download', dur: 0.6 },
      { at: 0.4, ring: '05-to-ship.download', dur: 1.8 },
      { at: 1.0, click: true },
    ],
  },
  {
    id: 'u1',
    kind: 'app',
    events: [
      { at: 0, focus: null, dur: 0.6 },
      { at: 0.1, move: '06-upload.uploadTab', dur: 0.6 },
      { at: 0.8, click: true },
      { at: 0.9, show: '06-upload' },
      { at: 2.7, move: '06-upload.choose', dur: 0.6 },
      { at: 3.2, ring: '06-upload.choose', dur: 1.4 },
      { at: 4.4, click: true },
      { at: 4.6, show: '07-plan' },
      { at: 4.7, focus: '07-plan.table', zoom: 1.3, dur: 0.8 },
    ],
  },
  {
    id: 'u2',
    kind: 'app',
    events: [
      { at: 0.2, ring: '07-plan.status', dur: 3.0 },
      { at: 3.4, ring: '07-plan.skipped', dur: 2.8 },
    ],
  },
  {
    id: 'u3',
    kind: 'app',
    events: [
      { at: 0, move: '07-plan.confirm', dur: 0.5 },
      { at: 0.6, click: true },
      { at: 0.7, show: '08-done' },
      { at: 0.8, focus: '08-done.results', zoom: 1.3, dur: 0.8 },
      { at: 1.1, ring: '08-done.results', dur: 2.3 },
    ],
  },
  { id: 'c1', kind: 'card', lead: 0.5 },
];

export const timeline = buildTimeline(beats, voice, shots);

const WIX_X = 180;
const STAMPS_X = 1260;
const PLACE_Y = 260;

/** Two tools many shops use, and the missing link between them. */
const Context: Card['C'] = ({ at }) => {
  const frame = useCurrentFrame();
  const fade = useFade();
  const head = useIn(at.x1);
  const boxes = useIn(at.x1 + 8);
  const gone = interpolate(frame, [at.x2 + s(0.4), at.x2 + s(0.9)], [0, 1], clamp);
  const cross = useIn(at.x2 + s(0.7));
  const stores = ['Shopify', 'Amazon', 'eBay', 'BigCommerce', 'Wix'];
  const chips = stores.map((_, i) => useIn(at.x2 + s(4.0) + i * 5));
  const label = useIn(at.x2 + s(3.8));
  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: C.ink, opacity: fade }}>
      <Heading t={head}>Two tools many shops already use</Heading>
      <Place x={WIX_X} y={PLACE_Y} title="Wix store" sub="where you sell" color={C.accent} bg={C.wixBg} t={boxes} />
      <Place x={STAMPS_X} y={PLACE_Y} title="Stamps.com" sub="where you print labels" color={C.stamps} bg={C.stampsBg} t={boxes} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: gone }}>
        <line x1={700} y1={PLACE_Y + 150} x2={1220} y2={PLACE_Y + 150} stroke={C.line} strokeWidth={5} strokeDasharray="18 16" />
      </svg>
      <div style={{ position: 'absolute', left: 960 - 48, top: PLACE_Y + 150 - 48, width: 96, height: 96, borderRadius: '50%', background: C.badBg, border: `4px solid ${C.bad}`, color: C.bad, fontSize: 48, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${cross})` }}>✕</div>
      <div style={{ position: 'absolute', left: 0, width: '100%', top: PLACE_Y + 230, textAlign: 'center', fontSize: 32, fontWeight: 700, color: C.bad, opacity: gone }}>No built-in connection</div>
      <div style={{ position: 'absolute', left: 0, width: '100%', top: 660, textAlign: 'center', fontSize: 26, fontWeight: 600, color: C.ink3, opacity: label }}>Stores Stamps.com imports orders from</div>
      {stores.map((n, i) => {
        const wix = n === 'Wix';
        return (
          <div key={n} style={{ position: 'absolute', left: 330 + i * 260, top: 710 + (1 - chips[i]) * 24, width: 230, height: 100, borderRadius: 16, background: wix ? C.badBg : C.surface, border: `3px solid ${wix ? C.bad : C.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: chips[i] }}>
            <div style={{ fontSize: 30, fontWeight: 600 }}>{n}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: wix ? C.bad : C.ok, marginTop: 4 }}>{wix ? '✕ not listed' : '✓ imports'}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Orders have to get across, and tracking has to come back. */
const Gap: Card['C'] = ({ at }) => {
  const frame = useCurrentFrame();
  const fade = useFade();
  const there = interpolate(frame, [at.g1 + s(0.4), at.g1 + s(1.6)], [0, 1], { ...clamp });
  const back = interpolate(frame, [at.g1 + s(3.2), at.g1 + s(4.4)], [0, 1], { ...clamp });
  const q = useIn(at.g1 + s(4.8));
  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: C.ink, opacity: fade }}>
      <Heading>Something has to carry the orders across</Heading>
      <Place x={WIX_X} y={PLACE_Y} title="Wix store" sub="where you sell" color={C.accent} bg={C.wixBg} />
      <Place x={STAMPS_X} y={PLACE_Y} title="Stamps.com" sub="where you print labels" color={C.stamps} bg={C.stampsBg} />
      <Arrow x1={700} x2={1220} y={PLACE_Y + 95} p={there} />
      <Arrow x1={1220} x2={700} y={PLACE_Y + 205} p={back} />
      <FileTag x={860} y={PLACE_Y + 37} label="orders" t={there} />
      <FileTag x={860} y={PLACE_Y + 147} label="tracking" t={back} />
      <div style={{ position: 'absolute', width: '100%', top: 640, textAlign: 'center', fontSize: 110, fontWeight: 700, color: C.file, opacity: q, transform: `scale(${0.8 + 0.2 * q})` }}>?</div>
    </AbsoluteFill>
  );
};

/** Today's options: money, or time. */
const Options: Card['C'] = ({ at }) => {
  const fade = useFade();
  const intro = useIn(at.a1 + 4);
  const cards = [
    { t: useIn(at.a2 + 6), title: 'A shipping platform', eg: 'e.g. ShipStation', cost: 'Monthly subscription', note: 'Labels printed in a new tool', tag: 'Costs money', color: C.bad },
    { t: useIn(at.a3 + 6), title: 'A go-between store', eg: 'e.g. another store platform', cost: 'Its own plan + a paid app', note: 'Orders copied between stores', tag: 'Costs money', color: C.bad },
    { t: useIn(at.a4 + 6), title: 'By hand', eg: 'copy and paste', cost: 'Free', note: 'Every address, every tracking number', tag: 'Costs time', color: C.file },
  ];
  const frame = useCurrentFrame();
  const introOut = interpolate(frame, [at.a2, at.a2 + 8], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: C.ink, opacity: fade }}>
      <Heading>Today's options</Heading>
      <div style={{ position: 'absolute', width: '100%', top: 430, textAlign: 'center', fontSize: 72, fontWeight: 700, color: C.ink3, opacity: intro * introOut }}>Money, or time</div>
      {cards.map((c, i) => (
        <div key={c.title} style={{ position: 'absolute', left: 150 + i * 560, top: 230 + (1 - c.t) * 40, width: 500, height: 470, borderRadius: 22, background: C.surface, border: `1px solid ${C.line}`, boxShadow: '0 12px 32px rgba(17,24,39,0.10)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 48, opacity: c.t }}>
          <div style={{ fontSize: 40, fontWeight: 700 }}>{c.title}</div>
          <div style={{ fontSize: 26, color: C.ink3, marginTop: 12 }}>{c.eg}</div>
          <div style={{ width: 400, height: 2, background: C.line, margin: '34px 0' }} />
          <div style={{ fontSize: 32, fontWeight: 600 }}>{c.cost}</div>
          <div style={{ fontSize: 26, color: C.ink3, marginTop: 18 }}>{c.note}</div>
          <div style={{ marginTop: 44, background: c.color, color: '#fff', fontWeight: 700, fontSize: 26, padding: '10px 24px', borderRadius: 999 }}>{c.tag}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** The file is the connector. */
const Idea: Card['C'] = ({ at }) => {
  const frame = useCurrentFrame();
  const fade = useFade();
  const out = interpolate(frame, [at.i1 + s(2.6), at.i1 + s(3.8)], [0, 1], clamp);
  const back = interpolate(frame, [at.i1 + s(5.6), at.i1 + s(6.8)], [0, 1], clamp);
  const app = useIn(at.i2 + 4);
  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: C.ink, opacity: fade }}>
      <Heading>The file is the connector</Heading>
      <Place x={WIX_X} y={PLACE_Y} title="Wix store" sub="your orders" color={C.accent} bg={C.wixBg} />
      <Place x={STAMPS_X} y={PLACE_Y} title="Stamps.com" sub="your own account" color={C.stamps} bg={C.stampsBg} />
      <Arrow x1={700} x2={1220} y={PLACE_Y + 95} p={out} />
      <Arrow x1={1220} x2={700} y={PLACE_Y + 205} p={back} />
      <FileTag x={860} y={PLACE_Y + 37} label="orders" t={out} />
      <FileTag x={860} y={PLACE_Y + 147} label="tracking" t={back} />
      <Pill top={680} t={app}>Ship by File writes the first file and reads the second</Pill>
    </AbsoluteFill>
  );
};

const cards: Card[] = [
  { from: 'h1', to: 'h1', C: titleCard('Ship by File', 'Wix orders to Stamps.com, with your own account') },
  { from: 'x1', to: 'x2', C: Context },
  { from: 'g1', to: 'g1', C: Gap },
  { from: 'a1', to: 'a4', C: Options },
  { from: 'i1', to: 'i2', C: Idea },
  {
    from: 'c1',
    to: 'c1',
    C: stepsCard('Ship by File', ['Set up once', 'Download orders', 'Print in Stamps.com', 'Upload history'], [
      'Screens show example data. Stamps.com is a trademark of its owner.',
      'Ship by File is an independent app, not affiliated with Stamps.com or Wix.',
    ]),
  },
];

export const DemoVideo: React.FC = () => <Tutorial tl={timeline} dir="demo" cards={cards} />;

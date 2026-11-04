import React from 'react';
import { Composition } from 'remotion';
import { Fonts } from './brand';
import { FPS, H, W, type Timeline } from './engine';
import { DemoVideo, timeline as demo } from './demo/Demo';

// One composition per video. Render one with: npm run render -- <id>
const VIDEOS: Array<[string, React.FC, Timeline]> = [['demo', DemoVideo, demo]];

const withFonts = (Body: React.FC): React.FC => () => (
  <>
    <Fonts />
    <Body />
  </>
);

export const Root: React.FC = () => (
  <>
    {VIDEOS.map(([id, Body, tl]) => (
      <Composition key={id} id={id} component={withFonts(Body)} durationInFrames={tl.total} fps={FPS} width={W} height={H} />
    ))}
  </>
);

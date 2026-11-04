// Ship by File's look: plain, light, blue for Wix, teal for Stamps.com, amber for files and
// highlights. No purple. Inter is SIL OFL 1.1 (public/fonts/INTER-LICENSE.txt).
import React from 'react';
import { staticFile } from 'remotion';

export const C = {
  page: '#F5F7FA',
  wash: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
  surface: '#FFFFFF',
  ink: '#111827',
  ink2: '#374151',
  ink3: '#6B7280',
  line: '#D1D5DB',
  accent: '#116DFF',
  wixBg: '#E7F0FF',
  stamps: '#0F766E',
  stampsBg: '#D5F5EF',
  file: '#B45309',
  fileBg: '#FEF3C7',
  ring: '#F59E0B',
  ringGlow: 'rgba(245, 158, 11, 0.20)',
  ok: '#15803D',
  bad: '#B91C1C',
  badBg: '#FEF2F2',
};

export const SANS = 'Inter, -apple-system, Helvetica, Arial, sans-serif';

const face = (file: string, weight: number) =>
  `@font-face { font-family: 'Inter'; src: url('${staticFile(`fonts/${file}`)}') format('woff2'); font-weight: ${weight}; }`;

export const Fonts: React.FC = () => (
  <style>
    {[face('inter-latin-400-normal.woff2', 400), face('inter-latin-600-normal.woff2', 600), face('inter-latin-700-normal.woff2', 700)].join('\n')}
  </style>
);

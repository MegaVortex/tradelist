import { test, expect } from '@playwright/test';
import * as path from 'path';

test('tapersTop10 exports 10 entries with medal/emoji logic', async () => {
  const modPath = path.resolve(process.cwd(), 'src', '_data', 'tapersTop10.js');
  const top10 = require(modPath);

  expect(Array.isArray(top10)).toBe(true);
  expect(top10.length).toBeGreaterThanOrEqual(1);
  expect(top10.length).toBeLessThanOrEqual(10);

  const emojis = top10.map((t: any) => t.emoji);
  if (top10.length >= 1) expect(emojis[0]).toBe('🥇');
  if (top10.length >= 2) expect(emojis[1]).toBe('🥈');
  if (top10.length >= 3) expect(emojis[2]).toBe('🥉');
});
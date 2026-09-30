import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speakerPageStarts } from './speaker-pages.js';

test('Speaker pagination counts visible groups, including a partially filled last group', () => {
  assert.deepEqual(speakerPageStarts(15, 3), [0, 3, 6, 9, 12]);
  assert.deepEqual(speakerPageStarts(15, 2), [0, 2, 4, 6, 8, 10, 12, 13]);
  assert.deepEqual(
    speakerPageStarts(15, 1),
    Array.from({ length: 15 }, (_, i) => i),
  );
  assert.deepEqual(speakerPageStarts(2, 3), [0]);
  assert.deepEqual(speakerPageStarts(0, 3), []);
});

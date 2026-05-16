import { describe, expect, test } from 'vitest';
import { mapWithConcurrency } from '../src/core/asyncPool.js';

describe('mapWithConcurrency', () => {
  test('limits in-flight async work while preserving result order', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return item * 10;
    });

    expect(results).toEqual([10, 20, 30, 40, 50]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  test('rejects invalid concurrency', async () => {
    await expect(mapWithConcurrency([1], 0, async (item) => item)).rejects.toThrow('concurrency must be >= 1');
  });
});

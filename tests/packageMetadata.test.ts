import { describe, expect, test } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };

describe('package metadata', () => {
  test('exposes both short and package-name CLI binaries', () => {
    expect(packageJson.bin).toEqual({
      drctx: 'dist/cli/main.js',
      'dr-context': 'dist/cli/main.js'
    });
  });
});

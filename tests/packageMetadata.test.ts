import { describe, expect, test } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };

describe('package metadata', () => {
  test('exposes both short and package-name CLI binaries', () => {
    expect(Object.keys(packageJson.bin)).toEqual(['dr-context', 'drctx']);
    expect(packageJson.bin).toEqual({
      'dr-context': 'dist/cli/main.js',
      drctx: 'dist/cli/main.js'
    });
  });
});

import { describe, expect, test } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };
import { toolVersion } from '../src/version.js';

describe('package metadata', () => {
  test('exposes both short and package-name CLI binaries', () => {
    expect(Object.keys(packageJson.bin)).toEqual(['dr-context', 'drctx']);
    expect(packageJson.bin).toEqual({
      'dr-context': 'dist/cli/main.js',
      drctx: 'dist/cli/main.js'
    });
  });

  test('keeps runtime tool version in sync with package version', () => {
    expect(toolVersion).toBe(packageJson.version);
  });

  test('generates runtime version from package metadata', () => {
    expect(packageJson.scripts).toMatchObject({
      prebuild: 'node scripts/generate-version.mjs'
    });
  });
});

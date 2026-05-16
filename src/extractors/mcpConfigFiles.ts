import type { ManifestConfigFile, RawFile } from '../core/types.js';

export function extractMcpConfigFiles(files: RawFile[]): ManifestConfigFile[] {
  return files.flatMap((file) => {
    if (!/^\.mcp\.json$/i.test(file.path)) {
      return [];
    }

    return [
      {
        path: file.path,
        type: 'mcp',
        scope: 'repo',
        source: {
          file: file.path,
          line: 1
        }
      }
    ];
  });
}

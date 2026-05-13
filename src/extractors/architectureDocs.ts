import type { ArchitectureDocFact, RawFile } from '../core/types.js';

export function extractArchitectureDocs(files: RawFile[]): ArchitectureDocFact[] {
  return files.flatMap((file) => {
    const kind = architectureDocKind(file.path);
    if (!kind) {
      return [];
    }

    return [
      {
        path: file.path,
        kind,
        source: {
          file: file.path,
          line: 1,
          text: firstLine(file.content)
        }
      }
    ];
  });
}

function architectureDocKind(path: string): ArchitectureDocFact['kind'] | undefined {
  const normalized = path.toLowerCase();

  if (normalized === 'architecture.md' || normalized === 'docs/architecture.md') {
    return 'architecture';
  }

  if (normalized.startsWith('docs/adr/') || normalized.startsWith('docs/adrs/') || normalized.startsWith('adr/')) {
    return 'adr';
  }

  if (normalized.startsWith('docs/design') && (normalized.endsWith('.md') || normalized.endsWith('.mdx'))) {
    return 'design';
  }

  return undefined;
}

function firstLine(content: string): string {
  return content.split('\n')[0]?.trim() ?? '';
}

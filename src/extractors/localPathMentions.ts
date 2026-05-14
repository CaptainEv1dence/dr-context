import type { LocalPathMention, RawFile } from '../core/types.js';

const localPathPattern = /(?:^|[\s(])((?:(?:\.\.|[\w.-]+)\/)*[\w.-]+\.(?:md|mdx|mdc|txt|yml|yaml|json|ts|tsx|js|jsx|py|go|rs|toml))/g;

export function extractLocalPathMentions(files: RawFile[]): LocalPathMention[] {
  return files.flatMap((file) => {
    if (!isMarkdownLike(file.path)) {
      return [];
    }

    const mentions: LocalPathMention[] = [];
    for (const [index, line] of file.content.split('\n').entries()) {
      for (const match of line.matchAll(localPathPattern)) {
        mentions.push({
          path: match[1],
          exists: false,
          source: {
            file: file.path,
            line: index + 1,
            text: line.trim()
          }
        });
      }
    }
    return mentions;
  });
}

function isMarkdownLike(path: string): boolean {
  return path.endsWith('.md') || path.endsWith('.mdx') || path.endsWith('.mdc') || path === '.cursorrules';
}

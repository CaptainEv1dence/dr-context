export function lineNumberForIndex(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

export function lineTextForIndex(content: string, index: number): string {
  return content.split('\n')[lineNumberForIndex(content, index) - 1]?.trim() ?? '';
}

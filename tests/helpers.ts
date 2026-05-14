import { join } from 'node:path';

export function fixtureRoot(name: string): string {
  return join(import.meta.dirname, 'fixtures', name);
}

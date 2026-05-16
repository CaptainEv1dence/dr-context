import type { RawFile } from '../core/types.js';
import { getInstructionSurfaceForPath } from '../extractors/instructionSurfaces.js';

export type InitFileAction = 'create' | 'skip';

export type InitFilePlan = {
  path: string;
  action: InitFileAction;
  reason: string;
  content?: string;
};

export type InitPlan = {
  files: InitFilePlan[];
};

export function planInit(files: RawFile[]): InitPlan {
  const paths = new Set(files.map((file) => file.path.toLowerCase()));
  const hasInstructionSurface = files.some((file) => getInstructionSurfaceForPath(file.path) !== undefined);

  return {
    files: [
      paths.has('.drctx.json')
        ? { path: '.drctx.json', action: 'skip', reason: 'already exists' }
        : { path: '.drctx.json', action: 'create', reason: 'missing Dr. Context config', content: configTemplate() },
      hasInstructionSurface
        ? { path: 'AGENTS.md', action: 'skip', reason: 'recognized instruction surface exists' }
        : { path: 'AGENTS.md', action: 'create', reason: 'no recognized instruction surface found', content: agentsTemplate() }
    ]
  };
}

export function configTemplate(): string {
  return `${JSON.stringify(
    {
      maxFiles: 500,
      maxFileBytes: 262144,
      maxTotalBytes: 1048576,
      exclude: ['node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**']
    },
    null,
    2
  )}\n`;
}

export function agentsTemplate(): string {
  return `# AGENTS.md

## Project context

- Keep this file short and specific to facts agents cannot infer from code.
- Link to architecture or domain docs instead of pasting long documents here.

## Verification

Run these before claiming work is complete:

\`\`\`bash
corepack pnpm test
corepack pnpm run typecheck
corepack pnpm run lint
\`\`\`

## Safety

- Do not commit secrets, credentials, tokens, local env files, runtime databases, logs, or caches.
- Prefer targeted tests for the code you changed, then run the wider gate above.
`;
}

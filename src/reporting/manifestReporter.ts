import type { Manifest } from '../core/types.js';

export function renderManifestJson(manifest: Manifest): string {
  return `${JSON.stringify({ ...manifest, root: '<requested-root>' }, null, 2)}\n`;
}

export function renderManifestText(manifest: Manifest): string {
  const lines = [
    'Dr. Context Manifest',
    '',
    `Package manager: ${manifest.packageManager?.name ?? 'unknown'}`,
    `Agent instruction files: ${manifest.summary.agentInstructionFiles}`,
    `Verification commands: ${manifest.summary.verificationCommands}`,
    `CI commands: ${manifest.summary.ciCommands}`,
    `First reads: ${manifest.summary.firstReads}`,
    ''
  ];

  for (const instructionFile of manifest.agentInstructionFiles) {
    lines.push(`- ${instructionFile.path} (${instructionFile.type}, ${instructionFile.scope})`);
  }

  for (const command of manifest.verificationCommands) {
    lines.push(`- ${command.command} (ciBacked=${command.ciBacked}, agentVisible=${command.agentVisible})`);
  }

  return `${lines.join('\n')}\n`;
}

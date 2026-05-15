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

  lines.push('All instruction inventory:');
  for (const instructionFile of manifest.agentInstructionFiles) {
    lines.push(`- ${instructionFile.path} (${instructionFile.type}, ${instructionFile.scope})`);
  }

  if (manifest.targetPath && manifest.effectiveInstructionFiles) {
    lines.push('', `Effective instruction files for ${manifest.targetPath}:`);
    for (const file of manifest.effectiveInstructionFiles) {
      lines.push(`- ${file.path} (${file.type}, ${file.scope}) - ${file.appliesBecause}`);
    }
  }
  lines.push('', 'Verification commands:');
  for (const command of manifest.verificationCommands) {
    lines.push(`- ${command.command} (ciBacked=${command.ciBacked}, agentVisible=${command.agentVisible})`);
  }

  if (manifest.workflowPrompts.length > 0) {
    lines.push('', 'Workflow prompts');
    for (const prompt of manifest.workflowPrompts) {
      lines.push(`- ${prompt.kind} ${formatSource(prompt.source.file, prompt.source.line)} ${prompt.action}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function formatSource(file: string, line: number | undefined): string {
  return line === undefined ? file : `${file}:${line}`;
}

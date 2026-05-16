import type { Check, CiCommandMention, Finding, RawFile } from '../core/types.js';

export const readmeCompletenessCheck: Check = {
  id: 'missing-readme-verification',
  run(context): Finding[] {
    const readme = context.facts.files.find((file) => file.path.toLowerCase() === 'readme.md');
    if (!readme) {
      return [];
    }

    const verificationCommands = context.facts.ciCommands.filter((command) => command.classification === 'verification');
    const missingCommands = verificationCommands.filter((command) => !readmeMentionsCommand(readme, command));
    if (verificationCommands.length === 0 || missingCommands.length === 0) {
      return [];
    }

    const command = missingCommands[0];
    return [
      {
        id: this.id,
        title: 'README omits local verification guidance used by CI',
        category: 'verification',
        severity: 'info',
        confidence: 'medium',
        primarySource: sourceForReadme(readme),
        evidence: [
          {
            kind: 'readme',
            message: 'README.md does not include recognizable local verification guidance.',
            source: sourceForReadme(readme)
          },
          {
            kind: 'ci-command',
            message: `${command.source.file}:${command.source.line} runs \`${command.command}\`.`,
            source: command.source
          }
        ],
        suggestion: `Add a README verification section with the local CI-backed command, such as \`${command.command}\`.`
      }
    ];
  }
};

function readmeMentionsCommand(readme: RawFile, command: CiCommandMention): boolean {
  const content = readme.content.toLowerCase();
  return content.includes(command.command.toLowerCase()) || commandAliases(command).some((alias) => content.includes(alias));
}

function commandAliases(command: CiCommandMention): string[] {
  const normalized = command.command.toLowerCase();
  const aliases = new Set<string>();
  aliases.add(normalized);
  if (normalized.startsWith('corepack pnpm ')) {
    aliases.add(normalized.replace(/^corepack pnpm /, 'pnpm '));
  }
  return [...aliases];
}

function sourceForReadme(readme: RawFile) {
  return {
    file: readme.path,
    line: 1,
    text: readme.content.split('\n')[0]?.trim() ?? ''
  };
}

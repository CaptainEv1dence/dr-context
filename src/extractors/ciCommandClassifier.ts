import type { CiCommandClassification } from '../core/types.js';

export function classifyCiCommand(command: string): CiCommandClassification {
  const trimmed = command.trim();

  if (/^(?:if\b|then\b|else\b|elif\b|fi\b|for\b|while\b|do\b|done\b|case\b|esac\b|exit\b|return\b|set\s+)/.test(trimmed)) {
    return 'shell-control';
  }

  if (/^(?:echo\b|printf\b|cat\s+<<|tee\b)/.test(trimmed)) {
    return 'output-plumbing';
  }

  if (/\b(?:npm|pnpm|yarn|bun)\s+(?:install|ci)\b/.test(trimmed)) {
    return 'install';
  }

  if (/\b(?:npm\s+publish|pnpm\s+publish|yarn\s+npm\s+publish)\b/.test(trimmed)) {
    return 'publish';
  }

  if (/\b(?:setup-node|setup-python|pnpm\/action-setup|actions\/setup-node)@/.test(trimmed)) {
    return 'setup';
  }

  if (/\b(?:(?:corepack\s+)?(?:npm|pnpm|yarn|bun))\s+(?:test|run\s+(?:test|lint|typecheck|build|check|pack:dry-run))\b/.test(trimmed)) {
    return 'verification';
  }

  if (/\b(?:tsc|vitest|jest|pytest|cargo\s+test|go\s+test|ruff|mypy)\b/.test(trimmed)) {
    return 'verification';
  }

  return 'unknown';
}

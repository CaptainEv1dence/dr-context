# Security Policy

## Supported versions

Dr. Context is pre-1.0. Please use the latest published npm version before reporting a security issue.

## Reporting a vulnerability

Report suspected vulnerabilities privately when possible. Do not include secrets, private repository names, raw scan output, or sensitive local paths in public issues.

If GitHub private vulnerability reporting is available for this repository, use it. Otherwise, open a GitHub issue with a minimal sanitized description and ask for a private follow-up channel.

Include:

- Dr. Context version (`dr-context --version` once available, or `npm view dr-context version`).
- Operating system and Node.js version.
- The command that triggered the issue.
- A sanitized minimal fixture that preserves the shape of the problem.

Do not include:

- npm tokens, GitHub tokens, SSH keys, cookies, or `.env` values.
- Raw scans from private repositories.
- Private repository paths or names.
- Private CI logs or local debug logs.

## Token hygiene

Dr. Context releases use npm Trusted Publishing through GitHub OIDC. Normal releases should not require long-lived npm automation tokens.

If an npm token was pasted into chat, used manually, stored locally, or added to a secret while testing publishing, revoke it after use:

```bash
npm token revoke <token-id>
```

You can also revoke tokens in the npm UI:

```text
https://www.npmjs.com/settings/captainev1dence/tokens
```

## Scanner security model

Dr. Context is local and read-only by default. Version 0.1 does not call LLM or network APIs during scanner behavior and does not write files by default.

Public examples, tests, issues, and release notes should use synthetic fixtures or sanitized aggregate findings only.
